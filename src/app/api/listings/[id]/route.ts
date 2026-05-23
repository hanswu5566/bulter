import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { MODELS, genAI, getFlatUserTags } from "@/lib/ai";
import { calculateMatchScore } from "@/lib/matching";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { deleteFiles, getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const { id } = await params;
    const session = await auth();
    
    // 1. Strict Authentication Check
    if (!session?.user?.id) {
      return errorResponse("Unauthorized. Please login first.", 401);
    }

    // 2. Collection Ownership (Access Control) Check
    const userStatus = await db.userListingStatus.findUnique({
      where: {
        userId_listingId: {
          userId: session.user.id,
          listingId: id
        }
      }
    });

    if (!userStatus || userStatus.isRemoved) {
      return errorResponse("Forbidden. You must analyze this listing on the home page first to add it to your collections.", 403);
    }

    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, image: true } },
        reports: {
          where: {
            tenantId: session.user.id
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }
      }
    });

    if (!listing) {
      return errorResponse("Listing not found", 404);
    }

    // Dynamic local personalization matching based on standard tagEvaluation cached on the listing
    let matchResult = null;
    let commuteTime = null;
    if (session?.user?.id) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { aiTags: true, baseProfile: true }
      });

      if (user?.aiTags) {
        matchResult = calculateMatchScore(user.aiTags, listing);
      }

      // Real Dynamic Google Transit & Driving & Scooter Commute calculation (Distance Matrix API)
      if (listing.lat && listing.lng) {
        const origin = `${listing.lat},${listing.lng}`;
        const baseProf = user?.baseProfile as any;
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

        if (GOOGLE_MAPS_API_KEY) {
          if (baseProf?.commuteAddress) {
            // Calculate precise commute to user's custom work/school address across 3 modes (Transit, Driving, Scooter)
            try {
              const dest = encodeURIComponent(baseProf.commuteAddress);
              const transitUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=transit&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
              const drivingUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
              const scooterUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&avoid=highways|tolls&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;

              const [resTransit, resDriving, resScooter] = await Promise.all([
                fetch(transitUrl).then(r => r.json()),
                fetch(drivingUrl).then(r => r.json()),
                fetch(scooterUrl).then(r => r.json())
              ]);

              const elTransit = resTransit.rows?.[0]?.elements?.[0];
              const elDriving = resDriving.rows?.[0]?.elements?.[0];
              const elScooter = resScooter.rows?.[0]?.elements?.[0];

              commuteTime = {
                isCustom: true,
                address: baseProf.commuteAddress,
                transit: elTransit?.status === "OK" ? { duration: elTransit.duration.text, distance: elTransit.distance.text } : null,
                driving: elDriving?.status === "OK" ? { duration: elDriving.duration.text, distance: elDriving.distance.text } : null,
                scooter: elScooter?.status === "OK" ? { duration: elScooter.duration.text, distance: elScooter.distance.text } : null
              };
            } catch (err) {
              console.error("Failed to calculate custom commute:", err);
            }
          } else {
            // Fallback to calculating public transit commute to default hubs (Taipei Main Station & City Hall)
            try {
              const destA = encodeURIComponent("台北車站");
              const destB = encodeURIComponent("市政府捷運站");
              const transitUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destA}|${destB}&mode=transit&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
              const drivingUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destA}|${destB}&mode=driving&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
              const scooterUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destA}|${destB}&mode=driving&avoid=highways|tolls&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;

              const [resTransit, resDriving, resScooter] = await Promise.all([
                fetch(transitUrl).then(r => r.json()),
                fetch(drivingUrl).then(r => r.json()),
                fetch(scooterUrl).then(r => r.json())
              ]);

              if (resTransit.status === "OK") {
                commuteTime = {
                  isCustom: false,
                  transit: {
                    taipeiMain: resTransit.rows[0]?.elements[0]?.status === "OK" ? resTransit.rows[0].elements[0].duration.text : null,
                    xinyi: resTransit.rows[0]?.elements[1]?.status === "OK" ? resTransit.rows[0].elements[1].duration.text : null
                  },
                  driving: {
                    taipeiMain: resDriving.rows[0]?.elements[0]?.status === "OK" ? resDriving.rows[0].elements[0].duration.text : null,
                    xinyi: resDriving.rows[0]?.elements[1]?.status === "OK" ? resDriving.rows[0].elements[1].duration.text : null
                  },
                  scooter: {
                    taipeiMain: resScooter.rows[0]?.elements[0]?.status === "OK" ? resScooter.rows[0].elements[0].duration.text : null,
                    xinyi: resScooter.rows[0]?.elements[1]?.status === "OK" ? resScooter.rows[0].elements[1].duration.text : null
                  }
                };
              }
            } catch (err) {
              console.error("Failed to calculate default hubs commute:", err);
            }
          }
        }
      }
    }

    // 幫房源詳情頁面生成 Signed URLs
    if (listing.images && listing.images.length > 0) {
      listing.images = await Promise.all(listing.images.map(img => getSignedDownloadUrl(img)));
    }

    let quota = null;
    if (session?.user?.id) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const used = await db.rateLimit.count({
        where: {
          identifier: session.user.id,
          action: "LISTING_ANALYZE",
          timestamp: { gte: startOfMonth }
        }
      });

      quota = {
        used,
        max: 15
      };
    }

    return successResponse({
      ...listing,
      matchResult,
      quota,
      commuteTime
    });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const { id: listingId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const userId = session.user.id;

    // Soft-delete for this user by updating UserListingStatus
    await db.userListingStatus.upsert({
      where: {
        userId_listingId: {
          userId,
          listingId
        }
      },
      update: {
        isSaved: false,
        isRemoved: true
      },
      create: {
        userId,
        listingId,
        isSaved: false,
        isRemoved: true
      }
    });

    return successResponse({ message: "Listing removed from collection successfully" });
  });
}


