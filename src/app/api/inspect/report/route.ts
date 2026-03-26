import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { listingId, checklistData, photos, aiSummary, digitalHash } = await req.json();
    
    const report = await db.inspectionReport.create({
      data: {
        listingId,
        tenantId: session.user.id!,
        checklistData,
        photos,
        aiSummary,
        digitalHash,
        status: "COMPLETED",
      },
    });

    // Update listing features with "Verified Facts" (Trust Loop)
    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (listing) {
      const currentFeatures = (listing.features as any) || {};
      const updatedFeatures = {
        ...currentFeatures,
        verifiedFacts: {
          ...(currentFeatures.verifiedFacts || {}),
          ...checklistData,
        }
      };
      
      await db.listing.update({
        where: { id: listingId },
        data: { features: updatedFeatures },
      });
    }

    return successResponse(report, 201);
  });
}

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const role = (session.user as any).role || "TENANT";

    let reports;
    if (role === "LANDLORD") {
      // Landlord sees reports for all their listings
      reports = await db.inspectionReport.findMany({
        where: {
          listing: {
            landlordId: session.user.id
          }
        },
        include: {
          listing: { select: { title: true, address: true, price: true } },
          tenant: { select: { name: true, image: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    } else {
      // Tenant sees reports they personally created
      reports = await db.inspectionReport.findMany({
        where: { tenantId: session.user.id },
        include: {
          listing: { select: { title: true, address: true, price: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    return successResponse(reports);
  });
}
