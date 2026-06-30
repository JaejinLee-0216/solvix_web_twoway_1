import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type RawRewardRow = {
  reward_source: string;
  reward_tier: string;
  reward_amount: number;
  claimed_at: string;
  bonus_balance_after: number;
};

type DailyEngagementRow = {
  attendance_claimed_at: string | null;
  attendance_reward_tier: string | null;
  attendance_reward_amount: number | null;
  ad_claimed_at: string | null;
  ad_reward_tier: string | null;
  ad_reward_amount: number | null;
};

function parseUserInfoCookie(request: NextRequest) {
  const cookie = request.cookies.get("userInfo");
  if (!cookie?.value) {
    return null;
  }

  try {
    return JSON.parse(cookie.value);
  } catch (error) {
    console.error("Failed to parse userInfo cookie", error);
    return null;
  }
}

async function resolveUserId(userInfo: any) {
  const kakaoId = userInfo?.kakao_id || userInfo?.id;
  if (!kakaoId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (error || !data?.id) {
    console.error("Failed to resolve user id", error);
    return null;
  }

  return data.id as string;
}

async function fetchAttendanceStatus(userId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: engagementRow, error: engagementError }, { data: balanceRow, error: balanceError }, { data: historyData, error: historyError }] = await Promise.all([
    supabaseAdmin
      .from("user_daily_engagements")
      .select("attendance_claimed_at, attendance_reward_tier, attendance_reward_amount, ad_claimed_at, ad_reward_tier, ad_reward_amount")
      .eq("user_id", userId)
      .eq("activity_date", today)
      .maybeSingle(),
    supabaseAdmin
      .from("user_question_balance")
      .select("bonus_balance")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_lottery_history")
      .select("id, source, reward_tier, reward_amount, bonus_balance_after, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (engagementError) {
    console.error("Supabase engagement lookup error", engagementError);
  }
  if (balanceError) {
    console.error("Supabase bonus balance lookup error", balanceError);
  }
  if (historyError) {
    console.error("Supabase lottery history lookup error", historyError);
  }

  const engagement = (engagementRow ?? null) as DailyEngagementRow | null;
  const attendanceClaimed = Boolean(engagement?.attendance_claimed_at);
  const adClaimed = Boolean(engagement?.ad_claimed_at);
  const adEligible = attendanceClaimed;
  const shouldPrompt = !attendanceClaimed || (adEligible && !adClaimed);

  const attendanceReward = attendanceClaimed
    ? {
        tier: engagement?.attendance_reward_tier ?? "",
        amount: engagement?.attendance_reward_amount ?? 0,
        claimedAt: engagement?.attendance_claimed_at,
      }
    : null;

  const adReward = adClaimed
    ? {
        tier: engagement?.ad_reward_tier ?? "",
        amount: engagement?.ad_reward_amount ?? 0,
        claimedAt: engagement?.ad_claimed_at,
      }
    : null;

  const bonusBalance = typeof balanceRow?.bonus_balance === "number" ? Math.max(balanceRow.bonus_balance, 0) : 0;

  const history = Array.isArray(historyData)
    ? historyData.map((entry) => ({
        id: entry.id,
        source: entry.source,
        tier: entry.reward_tier,
        amount: entry.reward_amount,
        bonusBalanceAfter: entry.bonus_balance_after,
        createdAt: entry.created_at,
      }))
    : [];

  return {
    today,
    attendanceClaimed,
    attendanceReward,
    adEligible,
    adClaimed,
    adReward,
    bonusBalance,
    shouldPrompt,
    history,
  };
}

function normalizeSource(input: unknown): "attendance" | "ad" {
  const raw = typeof input === "string" ? input.toLowerCase().trim() : "attendance";
  return raw === "ad" ? "ad" : "attendance";
}

export async function GET(request: NextRequest) {
  try {
    const userInfo = parseUserInfoCookie(request);
    if (!userInfo) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userId = await resolveUserId(userInfo);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const status = await fetchAttendanceStatus(userId);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Attendance GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userInfo = parseUserInfoCookie(request);
    if (!userInfo) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userId = await resolveUserId(userInfo);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const payload = await request.json().catch(() => ({}));
    const source = normalizeSource(payload?.source);

    const { data, error } = await supabaseAdmin.rpc("claim_daily_reward", {
      p_user_id: userId,
      p_source: source,
    });

    if (error) {
      const statusCode = error.code === "P0001" ? 409 : 400;
      return NextResponse.json(
        {
          error: error.message ?? "Failed to claim reward",
          code: error.code ?? null,
        },
        { status: statusCode }
      );
    }

    const row = Array.isArray(data) ? (data[0] as RawRewardRow | undefined) : undefined;
    if (!row) {
      return NextResponse.json({ error: "No reward returned" }, { status: 500 });
    }

    const reward = {
      source: row.reward_source,
      tier: row.reward_tier,
      amount: row.reward_amount,
      claimedAt: row.claimed_at,
      bonusBalanceAfter: row.bonus_balance_after,
    };

    const status = await fetchAttendanceStatus(userId);

    return NextResponse.json({ success: true, reward, status });
  } catch (error) {
    console.error("Attendance POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
