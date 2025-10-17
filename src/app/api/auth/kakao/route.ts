export async function GET() {
  const baseUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.solvix.kr");
  const redirectUri = `${baseUrl}/api/auth/kakao/callback`;
  const clientId = process.env.KAKAO_REST_API_KEY;

  if (!clientId) {
    return new Response("Missing KAKAO_REST_API_KEY", { status: 500 });
  }

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");

  return Response.redirect(authUrl.toString(), 302);
}
