import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY ? '✓ Exists' : '✗ Missing',
    NEXT_PUBLIC_KAKAO_REST_API_KEY: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ? '✓ Exists' : '✗ Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Exists' : '✗ Missing',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Exists' : '✗ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Exists' : '✗ Missing',
    NODE_ENV: process.env.NODE_ENV,
  });
}

