"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Chatbox, { ChatboxHandle } from "../Chatbox";
import KakaoLoginPopup from "../KakaoLoginPopup";
import PaymentPopup from "../PaymentPopup";
import MyPage from "../MyPage";
import AdminPanel from "../AdminPanel";

const testimonialCards = [
  {
    id: "kim",
    rating: "★★★★★",
    headline: "준비한 문제만 만나면 시간이 부족했는데, 이번 모의고사는 여유로웠어요!",
    body: [
      "2주 전부터 실전 문제 풀이 감각이 떨어질까 봐 걱정했는데, SOLVIX는 '답'만 알려주지 않았어요.",
      "같은 조건에서 왜 이 공식을 써야 하는지, 실수를 줄이는 체크포인트까지 짚어주니까 마지막 20분은 검토할 시간이 생겼어요.",
    ],
    footer: "김OO (자사고 3학년)",
  },
  {
    id: "lee",
    rating: "★★★★★",
    headline: "100점을 위한 마지막 1%는 시간 관리 정복입니다.",
    body: [
      "의대 준비생이라 혼자 공부 시간이 부족했는데, SOLVIX는 풀이 흐름을 빠르게 잡아줘서 계산 실수가 줄었어요.",
      "딱 5분만 투자해도 사고 과정이 정리되니, 시간을 아껴 다른 과목에도 집중할 수 있었어요!",
    ],
    footer: "이OO (일반고 3학년)",
  },
  {
    id: "park",
    rating: "★★★★★",
    headline: "단순한 답이 아니라, 진짜 '해석'을 원한다면 정답은 SOLVIX입니다.",
    body: [
      "사설 문제를 풀 때마다 해설만 던져주는 서비스에 지쳤는데, SOLVIX는 '왜 이런 생각을 해야 하는지'를 알려줘요.",
      "혼자 풀이를 적고 다시 검토하니, 서술형에서 놓치는 포인트가 줄었고 자신감이 붙었어요 :)",
    ],
    footer: "박OO (일반고 2학년)",
  },
];

export default function MobileLanding() {
  const CHATBOX_INITIAL_OFFSET = 160;
  const CHATBOX_ACTIVE_OFFSET = 90;
  const CHATBOX_MIN_OFFSET = 48;
  const KEYBOARD_SAFE_SPACE = 120;
  const DROPZONE_VERTICAL_OFFSET = 50;
  const CONVERSATION_INITIAL_OFFSET = -150;
  const CONVERSATION_ACTIVE_OFFSET = -100;
  const router = useRouter();
  const chatboxRef = useRef<ChatboxHandle | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [planLabel, setPlanLabel] = useState<string>("BASIC");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [imageAttached, setImageAttached] = useState(false);
  const [hasConversationStarted, setHasConversationStarted] = useState(false);
  const [chatboxBaseOffset, setChatboxBaseOffset] = useState(CHATBOX_INITIAL_OFFSET);
  const [chatboxOffsetY, setChatboxOffsetY] = useState(CHATBOX_INITIAL_OFFSET);
  const [conversationOffsetY, setConversationOffsetY] = useState(CONVERSATION_INITIAL_OFFSET);
  const [dropzoneOffsetY, setDropzoneOffsetY] = useState(DROPZONE_VERTICAL_OFFSET);
  const [paymentPopup, setPaymentPopup] = useState<{ isOpen: boolean; planType: "basic" | "pro" | "ultra" }>(
    { isOpen: false, planType: "basic" }
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuHideTimeoutRef = useRef<number | null>(null);
  const [infoPopup, setInfoPopup] = useState<"performance" | "testimonials" | "pricing" | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const syncLoginState = useCallback((info: any | null) => {
    if (info) {
      setIsLoggedIn(true);
      setUserInfo(info);
      setPlanLabel((info.plan || "basic").toString().toUpperCase());
      localStorage.setItem("userInfo", JSON.stringify(info));
    } else {
      setIsLoggedIn(false);
      setUserInfo(null);
      setPlanLabel("BASIC");
      localStorage.removeItem("userInfo");
    }
  }, []);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            syncLoginState(data.user);
            return;
          }
        }
      } catch (error) {
        console.error("Mobile login check failed", error);
      }
      const saved = localStorage.getItem("userInfo");
      if (saved) {
        syncLoginState(JSON.parse(saved));
      }
    };
    checkLogin();
  }, [syncLoginState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateOffset = () => {
      const viewport = window.visualViewport;

      if (!viewport) {
        setIsKeyboardVisible(false);
        setChatboxOffsetY(chatboxBaseOffset);
        return;
      }

      const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop;
      const keyboardOpen = keyboardHeight > 0;
      const adjustedKeyboardHeight = keyboardOpen
        ? Math.max(keyboardHeight - KEYBOARD_SAFE_SPACE, 0)
        : 0;
      const nextOffset = keyboardOpen
        ? Math.max(chatboxBaseOffset - adjustedKeyboardHeight, CHATBOX_MIN_OFFSET)
        : chatboxBaseOffset;

      setIsKeyboardVisible(keyboardOpen);
      setChatboxOffsetY(nextOffset);
    };

    updateOffset();

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", updateOffset);
      viewport.addEventListener("scroll", updateOffset);
    } else {
      window.addEventListener("resize", updateOffset);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", updateOffset);
        viewport.removeEventListener("scroll", updateOffset);
      } else {
        window.removeEventListener("resize", updateOffset);
      }
    };
  }, [CHATBOX_MIN_OFFSET, KEYBOARD_SAFE_SPACE, chatboxBaseOffset]);

  const handleLoginClick = () => {
    if (isLoggedIn) {
      fetch("/api/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      }).finally(() => syncLoginState(null));
    } else {
      setShowLoginPopup(true);
    }
  };

  const handleLoginSuccess = (info: any) => {
    syncLoginState(info);
    setShowLoginPopup(false);
  };

  const handleFilePick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        chatboxRef.current?.attachImages(files);
      }
    };
    input.click();
  };

  useEffect(() => {
    const node = dropRef.current;
    if (!node) return;

    const prevent = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const highlight = (event: DragEvent) => {
      prevent(event);
      node.classList.add("ring-4", "ring-[#3BA7FF]/60", "bg-white/10");
    };

    const unhighlight = (event: DragEvent) => {
      prevent(event);
      node.classList.remove("ring-4", "ring-[#3BA7FF]/60", "bg-white/10");
    };

    const handleDrop = (event: DragEvent) => {
      prevent(event);
      unhighlight(event);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        chatboxRef.current?.attachImages(files);
      }
    };

    node.addEventListener("dragenter", highlight, false);
    node.addEventListener("dragover", prevent, false);
    node.addEventListener("dragleave", unhighlight, false);
    node.addEventListener("drop", handleDrop, false);

    return () => {
      node.removeEventListener("dragenter", highlight, false);
      node.removeEventListener("dragover", prevent, false);
      node.removeEventListener("dragleave", unhighlight, false);
      node.removeEventListener("drop", handleDrop, false);
    };
  }, []);

  const clearMenuHideTimer = () => {
    if (menuHideTimeoutRef.current !== null) {
      window.clearTimeout(menuHideTimeoutRef.current);
      menuHideTimeoutRef.current = null;
    }
  };

  const closeMenu = (afterClose?: () => void) => {
    setInfoPopup(null);
    setMenuClosing(true);
    clearMenuHideTimer();
    menuHideTimeoutRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      menuHideTimeoutRef.current = null;
      afterClose?.();
    }, 260);
  };

  const openMenu = () => {
    clearMenuHideTimer();
    setMenuClosing(false);
    setMenuOpen(true);
  };

  useEffect(() => {
    return () => {
      clearMenuHideTimer();
    };
  }, []);

  const handleLogoClick = () => {
    clearMenuHideTimer();
    setMenuOpen(false);
    setMenuClosing(false);
    setInfoPopup(null);
    setShowLoginPopup(false);
    setShowMyPage(false);
    setShowAdminPanel(false);
    setPaymentPopup({ isOpen: false, planType: "basic" });
    chatboxRef.current?.resetConversation?.();
    setChatboxOffsetY(CHATBOX_INITIAL_OFFSET);
    router.push("/");
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#03050A] text-white font-[var(--font-sans)]">
      <header className="px-4 pt-6 pb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center cursor-pointer"
          aria-label="홈으로 이동"
        >
          <Image src="/assets/desktop/nav_logo.png" alt="SOLVIX" width={108} height={28} priority />
        </button>
        <div className="flex items-center gap-2 text-[10px] text-white/70">
          {isLoggedIn ? (
            <span className="bg-white/10 px-2 py-1 rounded-full">
              {planLabel}
            </span>
          ) : null}
          <button
            onClick={handleLoginClick}
            className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold"
          >
            {isLoggedIn ? "로그아웃" : "로그인"}
          </button>
          <button
            onClick={openMenu}
            className="flex h-8 w-8 items-center justify-center text-white hover:text-white/80"
            aria-label="메뉴 열기"
          >
            <span className="material-symbols-rounded text-[24px]">menu</span>
          </button>
        </div>
      </header>

      <main className="flex h-[calc(100vh-76px)] flex-col px-4 pb-6 space-y-0">
        {!hasConversationStarted ? (
          <section className="text-center space-y-2">
            <h1 className="text-[26px] font-semibold leading-tight"> 막혔어? 올려봐!</h1>
            <p className="text-[11px] text-white/70"> 풀이 한 장만 올려봐요. 나머진 SOLVIX가 도와줄게요.</p>
          </section>
        ) : null}

        {!hasConversationStarted && !isKeyboardVisible ? (
          <section style={dropzoneOffsetY !== 0 ? { transform: `translateY(${dropzoneOffsetY}px)` } : undefined}>
            <div
              ref={dropRef}
              className={`rounded-[18px] border-2 border-dashed border-[#3BA7FF]/70 bg-white/[0.06] flex flex-col items-center px-5 py-16 transition-all ${imageAttached ? "bg-[#0A1625]/40" : "hover:bg-white/10"}`}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleFilePick();
                }
              }}
              style={{ cursor: "pointer" }}
              onClick={handleFilePick}
            >
              <span className="text-[14px] font-semibold text-[#3BA7FF]/70">
                {imageAttached ? "문제가 첨부되었습니다!" : "문제 올리기"}
              </span>
            </div>
          </section>
        ) : null}

        <section className="pb-2">
          <Chatbox
            ref={chatboxRef}
            variant="mobile"
            isLoggedIn={isLoggedIn}
            onLoginRequest={() => setShowLoginPopup(true)}
            onImageAttached={setImageAttached}
            onStartConversation={() => {
              setHasConversationStarted(true);
              setChatboxBaseOffset(CHATBOX_ACTIVE_OFFSET);
              setChatboxOffsetY(CHATBOX_ACTIVE_OFFSET);
              setConversationOffsetY(CONVERSATION_ACTIVE_OFFSET);
            }}
            onReset={() => {
              setImageAttached(false);
              setHasConversationStarted(false);
              setDropzoneOffsetY(DROPZONE_VERTICAL_OFFSET);
              setChatboxBaseOffset(CHATBOX_INITIAL_OFFSET);
              setChatboxOffsetY(CHATBOX_INITIAL_OFFSET);
              setConversationOffsetY(CONVERSATION_INITIAL_OFFSET);
            }}
            offsetY={chatboxOffsetY}
            controlsOffsetY={20}
            imageButtonOffsetY={10}
            modelButtonOffsetY={13}
            usageBlockOffsetY={-20}
            sendButtonOffsetY={-10}
            conversationOffsetY={conversationOffsetY}
          />
        </section>
      </main>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 flex flex-row">
          <button
            aria-label="메뉴 닫기"
            onClick={() => closeMenu()}
            className={`flex-1 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out ${menuClosing ? "opacity-0" : "opacity-100"}`}
          />
          <nav
            className={`w-[82%] max-w-[320px] bg-[rgba(5,8,16,0.96)] border-l border-white/8 px-6 py-8 flex flex-col gap-7 shadow-[0_20px_60px_rgba(9,16,35,0.45)] transition-transform duration-300 ease-out ${menuClosing ? "translate-x-full" : "translate-x-0"}`}
          >
            <div className="flex items-center justify-between pb-5">
              <div className="relative flex items-center gap-2 rounded-[14px] border border-white/12 bg-white/[0.03] px-3 py-2 shadow-[0_10px_30px_rgba(12,22,40,0.35)]">
                <Image src="/assets/desktop/nav_logo.png" alt="SOLVIX" width={92} height={24} className="drop-shadow-[0_0_10px_rgba(76,180,255,0.45)]" />
                <span className="text-[10px] font-semibold text-[#4CB4FF] uppercase tracking-[0.5em]">beta</span>
                <span className="absolute -bottom-2 left-1/2 h-[2px] w-[120%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#4CB4FF]/50 to-transparent" />
              </div>
              <button onClick={() => closeMenu()} className="h-8 w-8 flex items-center justify-center text-white hover:text-white/80" aria-label="메뉴 닫기">
                <span className="material-symbols-rounded text-[20px]">close</span>
            </button>
          </div>

            <div className="space-y-3 text-sm font-medium">
              <button
                onClick={() => closeMenu(() => setInfoPopup("performance"))}
                className="w-full flex items-center justify-between rounded-2xl bg-[rgba(5,10,21,0.9)] border border-white/10 px-4 py-3 text-left text-white/90 transition-colors duration-200 hover:bg-[#071126]"
              >
                <span className="text-[14px]">성능 비교</span>
                <span className="material-symbols-rounded text-[16px] text-[#4CB4FF]">chevron_right</span>
              </button>
              <button
                onClick={() => closeMenu(() => setInfoPopup("testimonials"))}
                className="w-full flex items-center justify-between rounded-2xl bg-[rgba(5,10,21,0.9)] border border-white/10 px-4 py-3 text-left text-white/90 transition-colors duration-200 hover:bg-[#071126]"
              >
                <span className="text-[14px]">사용 후기</span>
                <span className="material-symbols-rounded text-[16px] text-[#4CB4FF]">chevron_right</span>
              </button>
              <button
                onClick={() => closeMenu(() => setInfoPopup("pricing"))}
                className="w-full flex items-center justify-between rounded-2xl bg-[rgba(5,10,21,0.9)] border border-white/10 px-4 py-3 text-left text-white/90 transition-colors duration-200 hover:bg-[#071126]"
              >
                <span className="text-[14px]">요금제 안내</span>
                <span className="material-symbols-rounded text-[16px] text-[#4CB4FF]">chevron_right</span>
              </button>
            </div>

            <div className="mt-auto space-y-3">
            {isLoggedIn ? (
                <button
                  onClick={() => closeMenu(() => setShowMyPage(true))}
                  className="w-full rounded-2xl bg-[#3BA7FF] text-[#02040A] text-[14px] font-semibold py-3 shadow-[0_12px_30px_rgba(59,167,255,0.45)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                마이페이지 열기
              </button>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-[13px] font-semibold">
                  <button
                    onClick={() => closeMenu(() => setShowLoginPopup(true))}
                    className="rounded-2xl border border-white/12 py-2.5 text-white/85 transition-colors duration-200 hover:bg-white/10"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => closeMenu(() => setPaymentPopup({ isOpen: true, planType: "basic" }))}
                    className="rounded-2xl bg-[#3BA7FF] text-[#02040A] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    회원가입
                  </button>
                </div>
              )}

            {isLoggedIn && userInfo?.isAdmin ? (
                <button
                  onClick={() => closeMenu(() => setShowAdminPanel(true))}
                  className="w-full rounded-2xl border border-red-400/40 text-red-200/90 text-[13px] font-semibold py-2.5 transition-colors duration-200 hover:bg-red-500/10"
                >
                관리자 패널 열기
              </button>
            ) : null}

              <p className="text-[10px] text-white/40 text-center tracking-[0.2em] uppercase">
                solvix / learning engine
              </p>
          </div>
          </nav>
        </div>
      ) : null}

      {infoPopup ? (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm">
          <div className="absolute left-1/2 top-1/2 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[#10131A] border border-white/10 shadow-[0_20px_60px_rgba(5,10,20,0.45)]">
            <div className="sticky top-0 z-10 bg-[#10131A] px-5 pt-6 pb-4 border-b border-white/8 text-center">
              {(() => {
                switch (infoPopup) {
                  case "performance":
                    return (
                      <>
                        <h2 className="text-[17px] font-semibold text-white">왜 SOLVIX가 정답일까요?</h2>
                        <p className="mt-1 text-[12px] text-white/60">&lsquo;생각의 과정&rsquo;을 함께 따라가며 풀이의 길로 안내합니다.</p>
                      </>
                    );
                  case "testimonials":
                    return (
                      <>
                        <h2 className="text-[17px] font-semibold text-white">&ldquo;해설만 툭, 던져주지 않습니다.&rdquo;</h2>
                        <p className="mt-1 text-[12px] text-white/60">SOLVIX로 &lsquo;스스로 푸는 힘&rsquo;을 기른 학생들의 후기입니다.</p>
                      </>
                    );
                  default:
                    return (
                      <>
                        <h2 className="text-[17px] font-semibold text-white">SOLVIX, 더 활용하고 싶으신가요?</h2>
                        <p className="mt-1 text-[12px] text-white/60">나에게 맞는 요금제를 선택하세요.</p>
                      </>
                    );
                }
              })()}
              <button
                onClick={() => {
                  setInfoPopup(null);
                }}
                className="absolute right-4 top-4 h-8 w-8 flex items-center justify-center text-white hover:text-white/80"
                aria-label="요금제 닫기"
              >
                <span className="material-symbols-rounded text-[20px]">close</span>
              </button>
            </div>

            <div className="relative max-h-[460px] overflow-y-auto px-5 pb-5">
              <div className="space-y-4">
            {infoPopup === "performance" ? (
                  <div className="space-y-3">
                <img src="/assets/desktop/score_graph.svg" alt="성능 비교 그래프" className="w-full rounded-xl" />
                <p className="text-[12px] text-white/70 leading-[1.5] text-center">
                  결과가 증명하듯, SOLVIX는 수능 수학에 가장 최적화된 LEARNING ENGINE입니다.
                </p>
                  </div>
            ) : null}

            {infoPopup === "testimonials" ? (
                  <div className="space-y-4">
                    <div className="h-[300px] overflow-y-auto pr-1 snap-y snap-mandatory">
                      {testimonialCards.map((card) => (
                        <div
                          key={card.id}
                          className="mb-4 flex h-full min-h-[300px] flex-col justify-between rounded-2xl border border-white/12 bg-[#151822] px-5 py-5 text-left text-white shadow-[0_12px_32px_rgba(5,10,20,0.45)] snap-start last:mb-0"
                        >
                          <div className="space-y-3">
                            <div className="text-sm font-semibold text-[#FFC857]">{card.rating}</div>
                            <h3 className="text-[14px] font-semibold leading-[1.4] text-white">{card.headline}</h3>
                            {card.body.map((paragraph, index) => (
                              <p key={index} className="text-[12px] leading-[1.6] text-white/70">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                          <p className="mt-4 text-[11px] font-semibold text-white/60">{card.footer}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[12px] text-white/65 text-center">
                      SOLVIX와 함께라면, 여러분도 &lsquo;스스로 푸는 힘&rsquo;을 기를 수 있습니다.
                    </p>
                </div>
            ) : null}

            {infoPopup === "pricing" ? (
                  <div className="space-y-3 text-left text-white/85">
                    <div className="rounded-2xl border border-white/12 bg-[#151822] px-5 py-5 shadow-[0_12px_32px_rgba(5,10,20,0.45)]">
                      <div className="text-xs uppercase tracking-[0.3em] text-white/55">Basic</div>
                      <div className="mt-2 text-[20px] font-semibold text-white">무료</div>
                      <p className="mt-2 text-[12px] leading-[1.6] text-white/65">
                        SOLVIX의 핵심 기능을 직접 경험해 보세요.
                      </p>
                      <div className="mt-4 space-y-1.5 text-[12px] leading-[1.5] text-white/80">
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>AI 문제풀이 (최초 5회 제공)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>매일 풀이 1회 제공</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>풀이 내역 무제한 열람</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/12 bg-[#151822] px-5 py-5 shadow-[0_12px_32px_rgba(5,10,20,0.55)]">
                      <div className="text-xs uppercase tracking-[0.3em] text-white/55">Pro</div>
                      <div className="mt-1 text-[12px] font-semibold text-[#FF7A8B]">커피 두 잔만 절약하세요!</div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-[26px] font-semibold text-white">₩9,900</span>
                        <span className="text-[12px] text-white/60">/월</span>
                        <span className="text-[12px] text-white/30 line-through">₩19,900</span>
                      </div>
                      <div className="mt-3 space-y-2 text-[12px] leading-[1.6] text-white/80">
                        <div className="font-semibold text-white/85">Basic 플랜의 모든 기능 포함</div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>AI 문제 풀이 (매일 10회 제공)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>AI 풀이 첨삭 (매일 3회 제공)</span>
                        </div>
                </div>
                <button
                        onClick={() => setPaymentPopup({ isOpen: true, planType: "pro" })}
                        className="mt-4 w-full rounded-full bg-white text-[#09142A] py-2.5 text-[13px] font-semibold shadow-[0_10px_24px_rgba(255,255,255,0.35)] hover:bg-white/90"
                      >
                        Pro 플랜 시작하기
                      </button>
                    </div>

                    <div className="rounded-2xl border border-white/12 bg-[#151822] px-5 py-5 shadow-[0_12px_36px_rgba(5,10,22,0.6)]">
                      <div className="text-xs uppercase tracking-[0.3em] text-white/55">Ultra</div>
                      <div className="mt-1 text-[26px] font-semibold text-white">
                        ₩39,900<span className="ml-2 text-[12px] text-white/70">/월</span>
                      </div>
                      <div className="text-[12px] text-white/50 line-through">₩79,900</div>
                      <div className="mt-3 space-y-2 text-[12px] leading-[1.6] text-white/82">
                        <div className="font-semibold text-white/85">Pro 플랜의 모든 기능 포함</div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>AI 문제풀이 (무제한 제공)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>AI 풀이 첨삭 (무제한 제공)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>AI 문제 검증 (무제한 제공)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-[2px] text-white/80 material-symbols-rounded text-[16px]">check</span>
                          <span>TEAM MEDICAL T.A와의 1:1 질의응답권 (매일 5회 제공)</span>
                        </div>
                      </div>
                      <p className="mt-4 text-[10px] text-white/55">* T.A는 Teaching Assistant(질답 조교)의 약자입니다.</p>
                    <button
                      onClick={() => setPaymentPopup({ isOpen: true, planType: "ultra" })}
                      className="mt-4 w-full rounded-full border border-white/70 bg-white/10 py-2.5 text-[13px] font-semibold text-white hover:bg-white/18"
                    >
                      Ultra 플랜 상담 신청
                </button>
                    </div>
                </div>
            ) : null}

              </div>
            </div>
          </div>
        </div>
      ) : null}

      <KakaoLoginPopup isOpen={showLoginPopup} onClose={() => setShowLoginPopup(false)} onLoginSuccess={handleLoginSuccess} />

      <PaymentPopup
        isOpen={paymentPopup.isOpen}
        onClose={() => setPaymentPopup({ isOpen: false, planType: "basic" })}
        planType={paymentPopup.planType}
      />

      <MyPage
        isOpen={showMyPage}
        onClose={() => setShowMyPage(false)}
        userInfo={userInfo}
        onResumeSession={(sessionId) => {
          setShowMyPage(false);
          setHasConversationStarted(true);
          chatboxRef.current?.resetConversation();
          chatboxRef.current?.loadConversation?.(sessionId);
        }}
      />
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </div>
  );
}
