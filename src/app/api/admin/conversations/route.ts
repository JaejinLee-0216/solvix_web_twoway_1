import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userInfo = JSON.parse(userInfoCookie.value);
    if (!userInfo.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // 특정 사용자의 모든 대화 조회
    const { data: conversations, error } = await supabaseAdmin
      .from("user_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Conversations fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }

    // 질문-답변 쌍으로 그룹화
    const grouped: any[] = [];
    const sessions = new Map<string, any[]>();

    conversations?.forEach((conv) => {
      if (!sessions.has(conv.session_id)) {
        sessions.set(conv.session_id, []);
      }
      sessions.get(conv.session_id)!.push(conv);
    });

    sessions.forEach((sessionConvs) => {
      for (let i = 0; i < sessionConvs.length; i += 2) {
        const userMsg = sessionConvs.find((c, idx) => idx >= i && c.message_type === 'user');
        const assistantMsg = sessionConvs.find((c, idx) => idx >= i && c.message_type === 'assistant');
        
        if (userMsg && assistantMsg) {
          grouped.push({
            id: userMsg.id,
            user_id: userId,
            question: userMsg.message_content,
            answer: assistantMsg.message_content,
            created_at: userMsg.created_at,
            model_used: userMsg.model_used || 'SOLVIX 1.0',
            style_used: userMsg.style_used || '해설지',
          });
        }
      }
    });

    return NextResponse.json({ conversations: grouped });
  } catch (error) {
    console.error("Admin conversations API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

