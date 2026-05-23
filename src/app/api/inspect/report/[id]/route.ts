import { db } from "@/lib/db";
import { auth } from "@/auth";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    const report = await db.inspectionReport.findUnique({
      where: { id },
      include: {
        listing: { select: { title: true, address: true, price: true, images: true, butlerInsight: true, features: true } },
        tenant: { select: { id: true, name: true } },
      }
    });

    if (!report) {
      return errorResponse("Report not found", 404);
    }

    // BOLA/IDOR Protection: Ensure only the owner of the report can view it
    if (report.tenantId !== session.user.id) {
      return errorResponse("Forbidden. You do not own this report.", 403);
    }

    // Convert GCS image paths to authenticated Signed Download URLs
    if (report.listing?.images && report.listing.images.length > 0) {
      try {
        report.listing.images = await Promise.all(
          report.listing.images.map(img => getSignedDownloadUrl(img))
        );
      } catch (err) {
        console.error("Failed to sign listing images in report details:", err);
      }
    }

    // Convert GCS inspection photos to authenticated Signed Download URLs
    if (report.photos && report.photos.length > 0) {
      try {
        report.photos = await Promise.all(
          report.photos.map(img => getSignedDownloadUrl(img))
        );
      } catch (err) {
        console.error("Failed to sign inspection photos in report details:", err);
      }
    }

    return successResponse(report);
  });
}
