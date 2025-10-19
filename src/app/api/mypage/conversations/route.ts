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

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 사용자 정보 가져오기
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userInfo = JSON.parse(userInfoCookie.value);
    const kakaoId = userInfo.kakao_id || userInfo.id;

    // Supabase에서 사용자 ID 조회
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("kakao_id", kakaoId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 사용자의 대화 내역 조회 (질문-답변 쌍으로 그룹화)
    const { data: conversations, error: convError } = await supabaseAdmin
      .from("user_conversations")
      .select("*")
      .eq("user_id", user.id)
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
        if (entry.message_type === 'user') {
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
        } else if (entry.message_type === 'assistant') {
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
}

