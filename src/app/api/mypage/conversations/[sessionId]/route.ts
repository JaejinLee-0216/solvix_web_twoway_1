import { conversationBySessionResponse } from "../lib";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  if (!sessionId || sessionId.trim().length === 0) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  return conversationBySessionResponse(request, sessionId);
}
