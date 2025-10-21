import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const FALLBACK_MODEL = "SOLVIX 1.0";
const FALLBACK_STYLE = "해설지";

const parseImageUrls = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
  } catch (error) {
    // treat as single URL string
  }

  return [trimmed];
};

const resolveUserId = async (request: NextRequest): Promise<string | null> => {
  const userInfoCookie = request.cookies.get("userInfo");
  if (!userInfoCookie) {
    return null;
  }

  const userInfo = JSON.parse(userInfoCookie.value);
  const kakaoId = userInfo.kakao_id || userInfo.id;

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("kakao_id", kakaoId)
    .single();

  if (userError || !user) {
    return null;
  }

  return user.id as string;
};

export const GET = async (request: NextRequest) => {
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim();

  if (sessionId) {
    return conversationBySessionResponse(request, sessionId);
  }
  return listConversationsResponse(request);
};

export const listConversationsResponse = async (request: NextRequest) => {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const { data: conversations, error: convError } = await supabaseAdmin
      .from("user_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (convError) {
      console.error("Conversation fetch error:", convError);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    const grouped: any[] = [];
    const sessions = new Map<string, any[]>();

    conversations?.forEach((conv) => {
      const list = sessions.get(conv.session_id) ?? [];
      list.push(conv);
      sessions.set(conv.session_id, list);
    });

    sessions.forEach((sessionConvs, sessionIdValue) => {
      const ordered = [...sessionConvs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      let lastUserEntry: any | null = null;

      ordered.forEach((entry) => {
        if (entry.message_type === "user") {
          const record = {
            id: entry.id,
            session_id: sessionIdValue,
            question: entry.message_content,
            answer: "",
            image_urls: parseImageUrls(entry.image_url),
            created_at: entry.created_at,
            model_used: entry.model_used || FALLBACK_MODEL,
            style_used: entry.style_used || FALLBACK_STYLE,
          };
          grouped.push(record);
          lastUserEntry = record;
        } else if (entry.message_type === "assistant") {
          if (lastUserEntry) {
            lastUserEntry.answer = entry.message_content;
          } else {
            grouped.push({
              id: entry.id,
              session_id: sessionIdValue,
              question: "",
              answer: entry.message_content,
              image_urls: [],
              created_at: entry.created_at,
              model_used: entry.model_used || FALLBACK_MODEL,
              style_used: entry.style_used || FALLBACK_STYLE,
            });
          }
        }
      });
    });

    return NextResponse.json({ conversations: grouped });
  } catch (error) {
    console.error("MyPage API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const conversationBySessionResponse = async (request: NextRequest, sessionId: string) => {
  try {
    if (!sessionId || sessionId.trim().length === 0) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const { data: history, error: historyError } = await supabaseAdmin
      .from("user_conversations")
      .select("id, message_type, message_content, image_url, model_used, style_used, created_at")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("Conversation history fetch error:", historyError);
      return NextResponse.json({ error: "Failed to fetch conversation history" }, { status: 500 });
    }

    const messages = (history ?? []).map((entry) => ({
      id: entry.id,
      role: entry.message_type === "assistant" ? "assistant" : "user",
      text: entry.message_content ?? "",
      images: parseImageUrls(entry.image_url),
      model: entry.model_used ?? FALLBACK_MODEL,
      style: entry.style_used ?? FALLBACK_STYLE,
      created_at: entry.created_at,
    }));

    return NextResponse.json({ sessionId, messages });
  } catch (error) {
    console.error("MyPage conversation history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
