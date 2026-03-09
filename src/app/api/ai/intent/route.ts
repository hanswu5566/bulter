import { NextResponse } from "next/server";
import { extractIntentFromChat } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const tags = await extractIntentFromChat(messages);
    return NextResponse.json({ tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
