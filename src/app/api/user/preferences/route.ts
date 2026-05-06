import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withErrorHandler, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || !session.user?.id) return errorResponse("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { aiTags: true }
    });

    const response = successResponse(user?.aiTags || null);
    response.headers.set("Access-Control-Allow-Origin", "https://rent.591.com.tw");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
  });
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const session = await auth();
    if (!session || !session.user?.id) return errorResponse("Unauthorized", 401);

    const { tags } = await req.json();
    const updatedUser = await db.user.upsert({
      where: { id: session.user.id },
      update: { aiTags: tags },
      create: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        aiTags: tags
      }
    });
    
    const response = successResponse(updatedUser);
    response.headers.set("Access-Control-Allow-Origin", "https://rent.591.com.tw");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    return response;
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

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "https://rent.591.com.tw");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
