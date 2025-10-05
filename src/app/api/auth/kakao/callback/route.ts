import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  console.log("=== Kakao Callback Start ===");
  console.log("Code:", code ? "Exists" : "Missing");
  console.log("Error:", error);

  // 카카오 로그인 취소 또는 오류
  if (error) {
    console.error("Kakao auth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}?error=${error}`
    );
  }

  if (!code) {
    console.error("No authorization code received");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}?error=no_code`
    );
  }

  try {
    // 환경변수 확인
    const restApiKey = process.env.KAKAO_REST_API_KEY;
    console.log("=== Environment Check ===");
    console.log("KAKAO_REST_API_KEY exists:", !!restApiKey);
    console.log("Full key:", restApiKey);
    
    if (!restApiKey) {
      throw new Error("KAKAO_REST_API_KEY is not set");
    }

    // Redirect URI 설정
    const redirectUri =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/api/auth/kakao/callback"
        : "https://www.solvix.kr/api/auth/kakao/callback";

    console.log("Redirect URI:", redirectUri);

    // 1. 액세스 토큰 요청
    const clientSecret = process.env.KAKAO_CLIENT_SECRET;
    
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: restApiKey,
      redirect_uri: redirectUri,
      code: code,
    });

    // Client Secret 추가 (필수)
    if (clientSecret) {
      tokenParams.append("client_secret", clientSecret);
      console.log("Client Secret added to request");
    } else {
      console.warn("KAKAO_CLIENT_SECRET not found - this may cause authentication failure");
    }

    console.log("Requesting access token...");

    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: tokenParams.toString(),
    });

    console.log("Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Kakao token error:", errorText);
      throw new Error(`Token request failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token in response");
    }

    console.log("Access token received");

    // 2. 사용자 정보 요청
    const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Kakao user info error:", errorText);
      throw new Error(`User info request failed: ${errorText}`);
    }

    const userData = await userResponse.json();
    console.log("User data received:", userData.id);

    // 3. 사용자 정보 정리
    const userInfo: any = {
      id: userData.id.toString(),
      kakao_id: userData.id.toString(),
      nickname: userData.kakao_account?.profile?.nickname || "사용자",
      email: userData.kakao_account?.email || "",
      profile_image: userData.kakao_account?.profile?.profile_image_url || null,
      provider: "kakao",
      plan: "basic",
      isAdmin: false,
    };

    // 4. Supabase에 사용자 업서트
    try {
      console.log("Upserting user to Supabase...");

      const { data: userId, error: upsertError } = await supabaseAdmin.rpc(
        "create_user_from_kakao",
        {
          p_kakao_id: userInfo.kakao_id,
          p_nickname: userInfo.nickname,
          p_email: userInfo.email,
          p_profile_image_url: userInfo.profile_image,
          p_is_admin: false,
        }
      );

      if (upsertError) {
        console.error("Supabase upsert error:", upsertError);
        // Supabase 에러는 무시하고 계속 진행 (기본값으로)
      } else {
        console.log("User upserted with ID:", userId);

        // 현재 플랜 조회
        const { data: currentPlan, error: planError } = await supabaseAdmin.rpc(
          "get_user_current_plan",
          { p_user_id: userId }
        );

        if (!planError && currentPlan) {
          userInfo.plan = currentPlan;
        }

        // 관리자 여부 조회
        const { data: userRecord } = await supabaseAdmin
          .from("users")
          .select("is_admin")
          .eq("id", userId)
          .single();

        if (userRecord?.is_admin) {
          userInfo.isAdmin = true;
        }
      }
    } catch (supabaseError) {
      console.error("Supabase error (continuing anyway):", supabaseError);
    }

    // 5. 쿠키에 사용자 정보 저장
    // 개발 환경에서는 무조건 localhost로 리다이렉트
    const baseUrl = process.env.NODE_ENV === "development" 
      ? "http://localhost:3000"
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.solvix.kr");
    const response = NextResponse.redirect(`${baseUrl}?login=success`);

    response.cookies.set("userInfo", JSON.stringify(userInfo), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    });

    console.log("Login successful, redirecting...");
    return response;
  } catch (error: any) {
    console.error("=== Kakao Login Error ===");
    console.error(error);
    const baseUrl = process.env.NODE_ENV === "development" 
      ? "http://localhost:3000"
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.solvix.kr");
    return NextResponse.redirect(
      `${baseUrl}?error=login_failed&message=${encodeURIComponent(error.message)}`
    );
  }
}

