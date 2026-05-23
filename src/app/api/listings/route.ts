import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { calculateMatchScore } from "@/lib/matching";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { uploadFromUrl, getSignedDownloadUrl } from "@/lib/storage";

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
      return errorResponse("Unauthorized. Please login first.", 401);
    }

    // 1. 查找該用戶已收藏且未隱藏的房源 ID 列表
    const userStatuses = await db.userListingStatus.findMany({
      where: {
        userId: userId,
        isSaved: true,
        isRemoved: false
      },
      select: {
        listingId: true
      }
    });
    
    const savedListingIds = userStatuses.map(s => s.listingId);
    
    // 2. 只查詢該用戶所關聯的房源 (Include dynamic inspection report association!)
    const listings = await db.listing.findMany({
      where: {
        id: {
          in: savedListingIds
        }
      },
      orderBy: { createdAt: "desc" },
      include: { 
        landlord: { 
          select: { 
            id: true,
            name: true, 
            image: true 
          } 
        },
        reports: {
          where: {
            tenantId: userId
          },
          select: {
            id: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      }
    });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { aiTags: true }
    });
    const userProfile = user?.aiTags;

    const processedListings = await Promise.all(
      listings.map(async (l) => {
        const matchResult = userProfile 
          ? calculateMatchScore(userProfile, l) 
          : { score: 75, basicScore: 75, advancedScore: 75, pros: [], cons: [] };
          
        const matchScore = matchResult.score;
          
        // 幫公開列表也生成 Signed URLs
        const signedImages = l.images ? await Promise.all(l.images.map(img => getSignedDownloadUrl(img))) : [];

        return { 
          ...l, 
          images: signedImages,
          matchScore,
          isOwner: userId === l.landlordId,
          latestReport: l.reports && l.reports.length > 0 ? l.reports[0] : null
        };
      })
    );

    return successResponse(processedListings);
  });
}

