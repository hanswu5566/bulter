import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeInspectionPhoto } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { image, taskName } = await req.json();
    const analysis = await analyzeInspectionPhoto(image, taskName);
    return NextResponse.json({ analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
