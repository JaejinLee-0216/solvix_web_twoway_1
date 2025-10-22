import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userInfo = JSON.parse(userInfoCookie.value);
    if (!userInfo.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { target_user_id, bonus_count } = body;

    if (!target_user_id || !bonus_count || bonus_count <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 관리자 사용자 ID 조회
    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("kakao_id", userInfo.kakao_id || userInfo.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    // Supabase RPC 함수 호출
    const { error } = await supabaseAdmin.rpc("give_bonus_questions", {
      p_admin_user_id: adminUser.id,
      p_target_user_id: target_user_id,
      p_bonus_count: parseInt(bonus_count),
    });

    if (error) {
      console.error("Bonus questions error:", error);
      return NextResponse.json({ error: "Failed to give bonus questions" }, { status: 500 });
    }

    const targetUser = await supabaseAdmin
      .from("user_question_balance")
      .select("bonus_balance, unlimited")
      .eq("user_id", target_user_id)
      .single();

    return NextResponse.json({
      success: true,
      message: `${bonus_count}개의 질문권이 추가되었습니다.`,
      balance: targetUser.data ?? null,
    });
  } catch (error) {
    console.error("Admin bonus API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

