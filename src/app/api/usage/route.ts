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

function getPlanDailyLimit(plan: unknown) {
  if (plan === "pro") return { freeDaily: 10, unlimited: false };
  if (plan === "ultra") return { freeDaily: 0, unlimited: true };
  return { freeDaily: 1, unlimited: false };
}

const FALLBACK_USAGE_COOKIE = "solvixUsageFallback";

type FallbackUsageStore = Record<string, { date: string; used: number }>;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getKakaoId(userInfo: any) {
  const kakaoId = userInfo?.kakao_id || userInfo?.id;
  return kakaoId ? String(kakaoId) : "anonymous";
}

function parseUserInfoCookie(request: NextRequest) {
  const userInfoCookie = request.cookies.get("userInfo");
  if (!userInfoCookie) return null;

  try {
    return JSON.parse(userInfoCookie.value ?? "{}");
  } catch (error) {
    console.error("Failed to parse userInfo cookie for fallback usage", error);
    return null;
  }
}

function parseFallbackUsageCookie(request: NextRequest): FallbackUsageStore {
  const raw = request.cookies.get(FALLBACK_USAGE_COOKIE)?.value;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse fallback usage cookie", error);
    return {};
  }
}

async function withSupabaseTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 2500): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function buildFallbackUsageResponse(request: NextRequest, userInfo: any, increment = 0) {
  const store = parseFallbackUsageCookie(request);
  const key = getKakaoId(userInfo);
  const today = getTodayKey();
  const current = store[key]?.date === today ? Math.max(store[key].used, 0) : 0;
  const nextUsed = current + Math.max(increment, 0);
  const limit = getPlanDailyLimit(userInfo?.plan);
  const row: UsageRow = {
    used_today: limit.unlimited ? nextUsed : Math.min(nextUsed, limit.freeDaily),
    free_daily: limit.freeDaily,
    bonus_balance: 0,
    unlimited: limit.unlimited,
    limit_reached: !limit.unlimited && nextUsed > limit.freeDaily,
    increment_applied: increment,
    total_used_today: nextUsed,
  };

  store[key] = { date: today, used: nextUsed };
  const usage = mapUsage(row, nextUsed);
  const status = usage.limitReached && increment > 0 ? 429 : 200;
  const response = NextResponse.json(
    status === 429 ? { error: "Daily limit reached", usage } : { success: true, usage, fallback: "cookie" },
    { status }
  );

  response.cookies.set(FALLBACK_USAGE_COOKIE, JSON.stringify(store), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 31,
    path: "/",
  });

  return response;
}

async function ensureBasicEntitlements(userId: string) {
  const { data: activeSubscription, error: subscriptionLookupError } = await supabaseAdmin
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (subscriptionLookupError) {
    console.error("Supabase subscription lookup failed", subscriptionLookupError);
  }

  if (!activeSubscription?.id) {
    const { error: subscriptionInsertError } = await supabaseAdmin
      .from("user_subscriptions")
      .insert({ user_id: userId, plan_type: "basic", status: "active" });

    if (subscriptionInsertError) {
      console.error("Supabase basic subscription ensure failed", subscriptionInsertError);
    }
  }

  const { error: balanceError } = await supabaseAdmin
    .from("user_question_balance")
    .upsert(
      { user_id: userId, bonus_balance: 0, unlimited: false },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

  if (balanceError) {
    console.error("Supabase question balance ensure failed", balanceError);
  }
}

async function resolveUserId(userInfo: any) {
  const kakaoId = userInfo?.kakao_id || userInfo?.id;
  if (!kakaoId) return null;

  const normalizedKakaoId = String(kakaoId);
  const { data: userRecord, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("kakao_id", normalizedKakaoId)
    .maybeSingle();

  if (error) {
    console.error("Supabase user lookup failed", error);
  }

  if (userRecord?.id) {
    await ensureBasicEntitlements(userRecord.id as string);
    return userRecord.id as string;
  }

  const { data: upsertedUser, error: upsertError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        kakao_id: normalizedKakaoId,
        nickname: userInfo?.nickname || "사용자",
        email: userInfo?.email || null,
        profile_image_url: userInfo?.profile_image || userInfo?.profile_image_url || null,
        provider: "kakao",
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "kakao_id" }
    )
    .select("id")
    .single();

  if (upsertError || !upsertedUser?.id) {
    console.error("Supabase user self-healing upsert failed", upsertError);
    return null;
  }

  await ensureBasicEntitlements(upsertedUser.id as string);
  return upsertedUser.id as string;
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
    const userInfo = parseUserInfoCookie(request);
    if (!userInfo) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    const userId = await withSupabaseTimeout(resolveUserId(userInfo), "resolve usage user");
    if (!userId) {
      return buildFallbackUsageResponse(request, userInfo);
    }

    const { data, error } = await withSupabaseTimeout(
      Promise.resolve(supabaseAdmin.rpc("get_user_usage_today", { p_user_id: userId })),
      "get usage today"
    );

    if (error) {
      console.error("Supabase get_user_usage_today error", error);
      return buildFallbackUsageResponse(request, userInfo);
    }

    const fallbackLimit = getPlanDailyLimit(userInfo.plan);
    const row = data?.[0] ?? {
      used_today: 0,
      free_daily: fallbackLimit.freeDaily,
      bonus_balance: 0,
      unlimited: fallbackLimit.unlimited,
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
    const userInfo = parseUserInfoCookie(request);
    if (userInfo) {
      return buildFallbackUsageResponse(request, userInfo);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userInfo = parseUserInfoCookie(request);
    if (!userInfo) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const { increment = 1 } = await request.json().catch(() => ({ increment: 1 }));
    const parsedIncrement = Number.isFinite(increment) ? Number(increment) : 1;
    const appliedIncrement = Math.max(parsedIncrement, 1);
    const userId = await withSupabaseTimeout(resolveUserId(userInfo), "resolve usage user");
    if (!userId) {
      return buildFallbackUsageResponse(request, userInfo, appliedIncrement);
    }

    const { data, error } = await withSupabaseTimeout(
      Promise.resolve(supabaseAdmin.rpc("increment_user_usage", {
        p_user_id: userId,
        p_increment: appliedIncrement,
      })),
      "increment usage"
    );

    if (error) {
      console.error("Supabase increment_user_usage error", error);
      return buildFallbackUsageResponse(request, userInfo, appliedIncrement);
    }

    const row = data?.[0];
    if (!row) {
      return buildFallbackUsageResponse(request, userInfo, appliedIncrement);
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
    const userInfo = parseUserInfoCookie(request);
    if (userInfo) {
      const { increment = 1 } = await request.json().catch(() => ({ increment: 1 }));
      const parsedIncrement = Number.isFinite(increment) ? Number(increment) : 1;
      return buildFallbackUsageResponse(request, userInfo, Math.max(parsedIncrement, 1));
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


