import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit } from "./rate-limit";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({
    success: true,
    data,
  }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({
    success: false,
    error: message,
  }, { status });
}

export async function withErrorHandler(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error: any) {
    console.error("API Error:", error);
    return errorResponse(error.message || "Internal Server Error", 500);
  }
}

export async function withRateLimit(
  req: Request,
  action: string,
  limit: number,
  windowSeconds: number,
  handler: (session: any) => Promise<NextResponse>
) {
  const session = await auth();
  
  // Use user ID if authenticated, fallback to IP for anonymity
  const identifier = session?.user?.id || req.headers.get("x-forwarded-for") || "anonymous";
  
  const result = await checkRateLimit(identifier, action, limit, windowSeconds);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again after ${result.reset.toLocaleTimeString()}.`,
        retryAfter: result.reset,
      },
      { 
        status: 429,
        headers: {
          "Retry-After": result.reset.toUTCString(),
        }
      }
    );
  }

  return handler(session);
}
