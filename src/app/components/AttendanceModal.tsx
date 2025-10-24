"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RewardSource = "attendance" | "ad";

type AttendanceStatus = {
  today: string;
  attendanceClaimed: boolean;
  attendanceReward: {
    tier: string;
    amount: number;
    claimedAt: string;
  } | null;
  adEligible: boolean;
  adClaimed: boolean;
  adReward: {
    tier: string;
    amount: number;
    claimedAt: string;
  } | null;
  bonusBalance: number;
  shouldPrompt: boolean;
  history: Array<{
    id: string;
    source: RewardSource | string;
    tier: string;
    amount: number;
    bonusBalanceAfter: number;
    createdAt: string;
  }>;
};

type RewardResult = {
  source: RewardSource | string;
  tier: string;
  amount: number;
  claimedAt: string;
  bonusBalanceAfter: number;
};

type Props = {
  isLoggedIn: boolean;
  userName?: string;
};

const LOCAL_STORAGE_KEY = "solvix:attendanceDismissedDate";
const AD_SIMULATION_MS = 3500;

async function requestRewardedAd(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const anyWindow = window as unknown as {
    solvixRewardedAd?: {
      show: (callbacks: { onComplete: () => void; onError: (error?: Error) => void }) => void;
    };
  };

  if (anyWindow.solvixRewardedAd && typeof anyWindow.solvixRewardedAd.show === "function") {
    await new Promise<void>((resolve, reject) => {
      try {
        anyWindow.solvixRewardedAd?.show({
          onComplete: resolve,
          onError: (error) => reject(error ?? new Error("구글 광고 재생에 실패했습니다.")),
        });
      } catch (error) {
        reject(error as Error);
      }
    });
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, AD_SIMULATION_MS);
  });
}

export default function AttendanceModal({ isLoggedIn, userName }: Props) {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSource, setCurrentSource] = useState<RewardSource>("attendance");
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [adReady, setAdReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasPendingAttendance = Boolean(status && !status.attendanceClaimed);
  const hasPendingAd = Boolean(status && status.adEligible && !status.adClaimed);

  const lastReward = useMemo(() => {
    if (reward) {
      return reward;
    }

    if (!status) {
      return null;
    }

    if (status.adReward) {
      return {
        source: "ad",
        tier: status.adReward.tier,
        amount: status.adReward.amount,
        claimedAt: status.adReward.claimedAt,
        bonusBalanceAfter: status.bonusBalance,
      };
    }

    if (status.attendanceReward) {
      return {
        source: "attendance",
        tier: status.attendanceReward.tier,
        amount: status.attendanceReward.amount,
        claimedAt: status.attendanceReward.claimedAt,
        bonusBalanceAfter: status.bonusBalance,
      };
    }

    return null;
  }, [reward, status]);

  const shouldShowHistory = useMemo(() => Boolean(status?.history?.length), [status]);

  const determineAutoOpen = useCallback((nextStatus: AttendanceStatus) => {
    if (!nextStatus.shouldPrompt) {
      return false;
    }
    if (typeof window === "undefined") {
      return false;
    }
    const dismissedDate = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return dismissedDate !== nextStatus.today;
  }, []);

  const fetchStatus = useCallback(
    async (autoOpen = false) => {
      if (!isLoggedIn) {
        return;
      }
      try {
        setIsFetching(true);
        setErrorMessage(null);
        const response = await fetch("/api/attendance", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("출석 정보를 가져오지 못했습니다.");
        }

        const payload = await response.json();
        const nextStatus = payload?.status as AttendanceStatus;
        if (!nextStatus) {
          throw new Error("출석 정보를 해석할 수 없습니다.");
        }

        setStatus(nextStatus);
        setCurrentSource(!nextStatus.attendanceClaimed ? "attendance" : "ad");

        if (autoOpen && determineAutoOpen(nextStatus)) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Attendance status fetch failed", error);
        setErrorMessage((error as Error)?.message ?? "출석 정보를 불러오지 못했습니다.");
      } finally {
        setIsFetching(false);
      }
    },
    [determineAutoOpen, isLoggedIn]
  );

  useEffect(() => {
    if (!isLoggedIn) {
      setIsOpen(false);
      setStatus(null);
      setReward(null);
      setErrorMessage(null);
      setAdReady(false);
      return;
    }

    fetchStatus(true).catch((error) => {
      console.error("Attendance status init failed", error);
    });
  }, [fetchStatus, isLoggedIn]);

  const closeModal = useCallback(() => {
    if (status && typeof window !== "undefined") {
      const stillPending = status.shouldPrompt;
      if (!stillPending) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, status.today);
      }
    }

    setIsOpen(false);
    setReward(null);
    setAdReady(false);
    setErrorMessage(null);
  }, [status]);

  const handleScratch = useCallback(async () => {
    if (!status || isProcessing) {
      return;
    }

    if (currentSource === "ad" && !adReady) {
      setErrorMessage("먼저 광고를 보고 복권을 받아주세요.");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source: currentSource }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.error ?? "복권을 긁는 중 오류가 발생했습니다.";
        setErrorMessage(message);
        return;
      }

      const rewardPayload = payload?.reward as RewardResult | undefined;
      const statusPayload = payload?.status as AttendanceStatus | undefined;

      if (!rewardPayload || !statusPayload) {
        setErrorMessage("복권 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      setReward(rewardPayload);
      setStatus(statusPayload);
      setAdReady(false);

      if (!statusPayload.attendanceClaimed) {
        setCurrentSource("attendance");
      } else if (statusPayload.adEligible && !statusPayload.adClaimed) {
        setCurrentSource("ad");
      } else {
        setCurrentSource("attendance");
      }
    } catch (error) {
      console.error("Attendance scratch failed", error);
      setErrorMessage("복권을 긁는 중 문제가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsProcessing(false);
    }
  }, [adReady, currentSource, isProcessing, status]);

  const handleWatchAd = useCallback(async () => {
    if (!status || adLoading) {
      return;
    }

    try {
      setAdLoading(true);
      setErrorMessage(null);
      await requestRewardedAd();
      setAdReady(true);
      setReward(null);
      setCurrentSource("ad");
    } catch (error) {
      console.error("Rewarded ad failed", error);
      setErrorMessage((error as Error)?.message ?? "광고를 재생하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setAdLoading(false);
    }
  }, [adLoading, status]);

  const getCardLabel = (): string => {
    if (currentSource === "ad") {
      return adReady ? "복권을 긁어보세요" : "광고를 보면 추가 복권을 받을 수 있어요";
    }
    return "복권을 긁어보세요";
  };

  const renderRewardCard = () => {
    if (!lastReward) {
      return null;
    }

    return (
      <div className="mt-6 rounded-3xl bg-gradient-to-br from-[#1b2848] via-[#14203b] to-[#10172B] px-8 py-10 text-center shadow-[0_25px_60px_rgba(10,18,40,0.55)]">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-[#7fdcff]">
          <span className="material-symbols-outlined text-base">celebration</span>
          {lastReward.source === "ad" ? "광고 보상" : "출석 보상"}
        </div>
        <p className="mt-6 text-lg text-white/80">오늘의 당첨 결과는...</p>
        <p className="mt-2 text-5xl font-extrabold text-white">
          이용권 {lastReward.amount}회
        </p>
        <p className="mt-3 text-sm text-white/60">현재 보너스 잔여: {status?.bonusBalance ?? lastReward.bonusBalanceAfter}회</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1f2c4e] px-4 py-2 text-sm text-white/80">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {lastReward.tier === "legendary"
            ? "전설 등급 당첨!"
            : lastReward.tier === "epic"
            ? "에픽 등급 당첨!"
            : lastReward.tier === "rare"
            ? "레어 등급 당첨!"
            : "일반 등급 당첨!"}
        </div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1120]/95 p-8 text-white shadow-[0_30px_80px_rgba(5,12,30,0.6)]">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
              aria-label="출석 팝업 닫기"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#13213A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7FD4FF]">
                <span className="material-symbols-outlined text-base">confirmation_number</span>
                SOLVIX DAILY
              </div>
              <h2 className="mt-4 text-2xl font-bold">오늘의 행운 복권</h2>
              <p className="mt-2 text-sm text-white/70">
                {userName ? `${userName}님,` : ""} 매일 방문하면 추가 이용권을 얻을 수 있어요!
              </p>
            </div>

            <div className="mt-6 space-y-4 text-center">
              {errorMessage ? (
                <div className="rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                  {errorMessage}
                </div>
              ) : null}

              {isFetching ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl bg-[#121b31] px-6 py-10">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#7fdcff]" />
                  <p className="text-sm text-white/70">출석 정보를 불러오는 중입니다...</p>
                </div>
              ) : null}

              {!isFetching && hasPendingAttendance ? (
                <button
                  type="button"
                  onClick={handleScratch}
                  disabled={isProcessing}
                  className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#4866ff] via-[#6c8dff] to-[#9ab9ff] px-6 py-12 text-center text-[#0a1030] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7fd4ff]/50 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-20" style={{ backgroundImage: "radial-gradient(circle at top, rgba(255,255,255,0.6), transparent 60%)" }} />
                  <div className="relative flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl">swipe_up</span>
                    <span className="text-xl font-bold">{getCardLabel()}</span>
                    <span className="text-xs text-[#0a1030]/70">터치하면 즉시 결과가 공개됩니다.</span>
                  </div>
                </button>
              ) : null}

              {!isFetching && !hasPendingAttendance && hasPendingAd ? (
                <div className="space-y-4">
                  {!adReady ? (
                    <div className="rounded-3xl bg-[#121b31] px-6 py-6 text-sm text-white/80">
                      <p>30초 광고를 보면 복권을 한 장 더 받을 수 있어요.</p>
                      <p className="mt-1 text-white/60">광고 시청이 끝나면 버튼이 활성화됩니다.</p>
                    </div>
                  ) : null}

                  {!adReady ? (
                    <button
                      type="button"
                      onClick={handleWatchAd}
                      disabled={adLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3BA7FF] px-6 py-3 text-sm font-semibold text-[#02040A] shadow-[0_15px_35px_rgba(59,167,255,0.45)] transition hover:bg-[#2E8FDD] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3BA7FF]/50 disabled:cursor-not-allowed disabled:opacity-80"
                    >
                      <span className="material-symbols-outlined text-lg">ondemand_video</span>
                      {adLoading ? "광고 재생 중..." : "30초 광고 보고 복권 받기"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleScratch}
                      disabled={isProcessing}
                      className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#5ef7d2] via-[#61c3ff] to-[#8ca8ff] px-6 py-12 text-center text-[#03121f] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-[#6de2ff]/60 disabled:cursor-not-allowed disabled:opacity-80"
                    >
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-20" style={{ backgroundImage: "radial-gradient(circle at top, rgba(255,255,255,0.7), transparent 60%)" }} />
                      <div className="relative flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl">stylus_note</span>
                        <span className="text-xl font-bold">광고 보상 복권 긁기</span>
                        <span className="text-xs text-[#03121f]/70">지금 바로 결과를 확인하세요.</span>
                      </div>
                    </button>
                  )}
                </div>
              ) : null}

              {!isFetching && !hasPendingAttendance && !hasPendingAd ? (
                <div className="rounded-3xl bg-[#121b31] px-6 py-8 text-sm text-white/80">
                  <div className="flex items-center justify-center gap-2 text-base font-semibold text-[#88f6ff]">
                    <span className="material-symbols-outlined text-lg">task_alt</span>
                    오늘 출석체크 완료!
                  </div>
                  <p className="mt-3 text-white/60">
                    내일 다시 방문하시면 또 다른 복권이 기다리고 있어요.
                  </p>
                  {status?.attendanceReward ? (
                    <p className="mt-3 text-white/70">
                      출석 보상: 이용권 {status.attendanceReward.amount}회 ({status.attendanceReward.tier})
                    </p>
                  ) : null}
                  {status?.adReward ? (
                    <p className="mt-1 text-white/70">
                      광고 보상: 이용권 {status.adReward.amount}회 ({status.adReward.tier})
                    </p>
                  ) : null}
                </div>
              ) : null}

              {renderRewardCard()}

              {shouldShowHistory ? (
                <div className="mt-6 rounded-3xl bg-[#121b31] px-6 py-6">
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>최근 보상 내역</span>
                    <span className="material-symbols-outlined text-base text-white/40">history</span>
                  </div>
                  <ul className="mt-4 space-y-3 text-left text-sm text-white/80">
                    {status?.history?.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-white">
                            {entry.source === "ad" ? "광고 보상" : "출석 보상"}
                          </span>
                          <span className="text-xs text-white/50">{new Date(entry.createdAt).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="text-right text-sm font-semibold text-[#7fdcff]">
                          이용권 {entry.amount}회
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 text-center text-xs text-white/50">
              <button
                type="button"
                onClick={closeModal}
                className="w-full rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
              >
                닫기
              </button>
              <p>자정 이후 다시 접속하면 새로운 복권이 도착합니다.</p>
            </div>
          </div>
        </div>
      ) : null}

      {!isOpen && status?.shouldPrompt ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-full bg-[#3BA7FF] px-5 py-3 text-sm font-semibold text-[#02040A] shadow-lg shadow-[#3BA7FF]/30 transition hover:bg-[#2E8FDD]"
        >
          <span className="material-symbols-outlined text-lg">confirmation_number</span>
          오늘의 복권
        </button>
      ) : null}
    </>
  );
}

