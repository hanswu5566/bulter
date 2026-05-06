import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { name } = await req.json();
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name },
    });
    return successResponse(updatedUser);
  });
}

export async function PATCH(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session) return errorResponse("Unauthorized", 401);

    const { role } = await req.json();
    if (!["TENANT", "LANDLORD"].includes(role)) {
      return errorResponse("Invalid role", 400);
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { role },
    });
    return successResponse(updatedUser);
  });
}
