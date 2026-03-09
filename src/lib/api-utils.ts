import { NextResponse } from "next/server";

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
