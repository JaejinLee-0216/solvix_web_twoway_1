import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 사용자 정보 확인
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userInfo = JSON.parse(userInfoCookie.value);
    
    // 관리자 권한 확인
    if (!userInfo.isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    // 모든 사용자 조회
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        kakao_id,
        nickname,
        email,
        is_admin,
        created_at,
        last_login_at,
        user_subscriptions!inner (
          plan_type,
          status
        )
      `)
      .eq('user_subscriptions.status', 'active')
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Users fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // 각 사용자의 총 질문 횟수 조회
    const usersWithStats = await Promise.all(
      (users || []).map(async (user: any) => {
        const { data: usageData } = await supabaseAdmin
          .from("user_usage")
          .select("total_questions_used")
          .eq("user_id", user.id);

        const totalQuestions = usageData?.reduce((sum, u) => sum + (u.total_questions_used || 0), 0) || 0;

        return {
          id: user.id,
          kakao_id: user.kakao_id,
          nickname: user.nickname,
          email: user.email,
          plan_type: user.user_subscriptions?.[0]?.plan_type || 'basic',
          total_questions: totalQuestions,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
        };
      })
    );

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error("Admin users API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

