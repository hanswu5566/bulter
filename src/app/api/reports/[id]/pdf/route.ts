import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const report = await db.inspectionReport.findUnique({
      where: { id },
      include: {
        listing: true,
        tenant: { select: { name: true, image: true } }
      }
    });

    if (!report) return errorResponse("Report not found", 404);

    // Simulation of generating a PDF. 
    // In a real scenario, we might use a library like jspdf or a microservice.
    // For now, we return a structured summary that the client can format for print.
    const pdfSimulation = {
      header: "Butler. Digital Inspection Report",
      reportId: report.id,
      digitalHash: report.digitalHash,
      timestamp: report.createdAt,
      listing: {
        title: report.listing.title,
        address: report.listing.address,
        price: report.listing.price,
      },
      tenant: report.tenant.name,
      facts: report.checklistData,
      summary: report.aiSummary,
      status: "VERIFIED_ON_CHAIN_SIMULATION"
    };

    return successResponse(pdfSimulation);
  });
}
