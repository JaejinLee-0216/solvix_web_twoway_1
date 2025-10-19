import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type UsageRow = {
  used_today: number;
  free_daily: number;
  bonus_balance: number;
  unlimited: boolean;
  limit_reached?: boolean;
  increment_applied?: number;
  total_questions_used?: number;
  total_used_today?: number;
};

function mapUsage(row: UsageRow, totalUsedOverride?: number) {
  const planUsed = row.used_today ?? 0;
  const free = row.free_daily ?? 0;
  const bonus = row.bonus_balance ?? 0;
  const unlimited = Boolean(row.unlimited);
  const remainingFree = Math.max(free - planUsed, 0);
  const rawTotal = totalUsedOverride ?? row.total_used_today ?? row.total_questions_used;
  const totalUsed = typeof rawTotal === "number" && Number.isFinite(rawTotal)
    ? Math.max(rawTotal, planUsed, 0)
    : Math.max(planUsed, 0);
  const remainingTotal = unlimited ? Number.POSITIVE_INFINITY : remainingFree + bonus;

  return {
    usedToday: totalUsed,
    planUsedToday: planUsed,
    freeDaily: free,
    bonusBalance: bonus,
    unlimited,
    remainingFree,
    remainingTotal: unlimited ? null : remainingTotal,
    limitReached: Boolean(row.limit_reached),
    incrementApplied: row.increment_applied ?? 0,
  };
}

async function resolveUserId(userInfo: any) {
  const kakaoId = userInfo?.kakao_id || userInfo?.id;
  if (!kakaoId) return null;

  const { data: userRecord, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("kakao_id", kakaoId)
    .single();

  if (error || !userRecord) {
    console.error("Supabase user lookup failed", error);
    return null;
  }

  return userRecord.id as string;
}

async function fetchTotalQuestionsUsedToday(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { data, error } = await supabaseAdmin
      .from("user_usage")
      .select("total_questions_used")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    if (error) {
      console.error("Supabase total_questions_used lookup error", error);
      return null;
    }

    const total = data?.total_questions_used;
    return typeof total === "number" && Number.isFinite(total) ? total : null;
  } catch (error) {
    console.error("Supabase total_questions_used lookup exception", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userInfo = JSON.parse(userInfoCookie.value ?? "{}");
    const userId = await resolveUserId(userInfo);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.rpc("get_user_usage_today", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Supabase get_user_usage_today error", error);
      return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
    }

    const row = data?.[0] ?? {
      used_today: 0,
      free_daily: 0,
      bonus_balance: 0,
      unlimited: false,
    };

    let totalUsedOverride: number | null = null;
    const inlineTotal = (row as any)?.total_used_today ?? (row as any)?.total_questions_used;
    if (typeof inlineTotal === "number" && Number.isFinite(inlineTotal)) {
      totalUsedOverride = inlineTotal;
    } else {
      totalUsedOverride = await fetchTotalQuestionsUsedToday(userId);
    }

    const usage = mapUsage(row as UsageRow, totalUsedOverride ?? undefined);

    return NextResponse.json({ success: true, usage });
  } catch (error) {
    console.error("Usage GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userInfoCookie = request.cookies.get("userInfo");
    if (!userInfoCookie) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const { increment = 1 } = await request.json().catch(() => ({ increment: 1 }));
    const parsedIncrement = Number.isFinite(increment) ? Number(increment) : 1;
    const appliedIncrement = Math.max(parsedIncrement, 1);

    const userInfo = JSON.parse(userInfoCookie.value ?? "{}");
    const userId = await resolveUserId(userInfo);
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.rpc("increment_user_usage", {
      p_user_id: userId,
      p_increment: appliedIncrement,
    });

    if (error) {
      console.error("Supabase increment_user_usage error", error);
      return NextResponse.json({ error: "Failed to update usage" }, { status: 500 });
    }

    const row = data?.[0];
    if (!row) {
      return NextResponse.json({ error: "No usage data returned" }, { status: 500 });
    }

    let totalUsedOverride: number | null = null;
    const inlineTotal = (row as any)?.total_used_today ?? (row as any)?.total_questions_used;
    if (typeof inlineTotal === "number" && Number.isFinite(inlineTotal)) {
      totalUsedOverride = inlineTotal;
    } else {
      totalUsedOverride = await fetchTotalQuestionsUsedToday(userId);
    }

    const usage = mapUsage(row as UsageRow, totalUsedOverride ?? undefined);

    if (usage.limitReached && usage.incrementApplied === 0) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          usage,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true, usage });
  } catch (error) {
    console.error("Usage POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


