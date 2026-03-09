import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSignedUploadUrl } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { fileName, contentType } = await req.json();
    const data = await getSignedUploadUrl(fileName, contentType);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
