import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

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

    // 질문-답변 쌍으로 그룹화
    const grouped: any[] = [];
    const sessions = new Map<string, any[]>();

    conversations?.forEach((conv) => {
      if (!sessions.has(conv.session_id)) {
        sessions.set(conv.session_id, []);
      }
      sessions.get(conv.session_id)!.push(conv);
    });

    // 각 세션을 질문-답변 형태로 변환
    sessions.forEach((sessionConvs) => {
      for (let i = 0; i < sessionConvs.length; i += 2) {
        const userMsg = sessionConvs.find((c, idx) => idx >= i && c.message_type === 'user');
        const assistantMsg = sessionConvs.find((c, idx) => idx >= i && c.message_type === 'assistant');
        
        if (userMsg && assistantMsg) {
          grouped.push({
            id: userMsg.id,
            question: userMsg.message_content,
            answer: assistantMsg.message_content,
            image_url: userMsg.image_url,
            created_at: userMsg.created_at,
            model_used: userMsg.model_used || 'SOLVIX 1.0',
            style_used: userMsg.style_used || '해설지',
          });
        }
      }
    });

    return NextResponse.json({ conversations: grouped });
  } catch (error) {
    console.error("MyPage API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

