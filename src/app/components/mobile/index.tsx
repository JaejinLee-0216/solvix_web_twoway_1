"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Chatbox, { ChatboxHandle } from "../Chatbox";
import KakaoLoginPopup from "../KakaoLoginPopup";
import PaymentPopup from "../PaymentPopup";
import MyPage from "../MyPage";
import AdminPanel from "../AdminPanel";

export default function MobileLanding() {
  const CHATBOX_INITIAL_OFFSET = 160;
  const CHATBOX_MIN_OFFSET = 48;
  const KEYBOARD_SAFE_SPACE = 120;
  const DROPZONE_VERTICAL_OFFSET = 50;
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
  const [chatboxOffsetY, setChatboxOffsetY] = useState(CHATBOX_INITIAL_OFFSET);
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
        setChatboxOffsetY(CHATBOX_INITIAL_OFFSET);
        return;
      }

      const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop;
      const keyboardOpen = keyboardHeight > 0;
      const adjustedKeyboardHeight = keyboardOpen
        ? Math.max(keyboardHeight - KEYBOARD_SAFE_SPACE, 0)
        : 0;
      const nextOffset = keyboardOpen
        ? Math.max(CHATBOX_INITIAL_OFFSET - adjustedKeyboardHeight, CHATBOX_MIN_OFFSET)
        : CHATBOX_INITIAL_OFFSET;

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
  }, [CHATBOX_INITIAL_OFFSET]);

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

  return (
    <div className="min-h-screen w-full bg-[#03050A] text-white font-[var(--font-sans)]">
      <header className="px-4 pt-6 pb-5 flex items-center justify-between">
        <Image src="/assets/desktop/nav_logo.png" alt="SOLVIX" width={108} height={28} priority />
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

      <main className="px-4 pb-16 space-y-0">
        <section className="text-center space-y-2">
          <h1 className="text-[26px] font-semibold leading-tight"> 막혔어? 올려봐!</h1>
          <p className="text-[11px] text-white/70"> 풀이 한 장만 올려봐요. 나머진 SOLVIX가 도와줄게요.</p>
        </section>

        {!hasConversationStarted && !isKeyboardVisible ? (
          <section style={dropzoneOffsetY !== 0 ? { transform: `translateY(${dropzoneOffsetY}px)` } : undefined}>
            <div
              ref={dropRef}
              className={`rounded-[18px] border-2 border-dashed border-[#3BA7FF]/70 bg-white/[0.06] flex flex-col items-center px-5 py-20 transition-all ${imageAttached ? "bg-[#0A1625]/40" : "hover:bg-white/10"}`}
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

        <section className="pb-6">
          <Chatbox
            ref={chatboxRef}
            variant="mobile"
            isLoggedIn={isLoggedIn}
            onLoginRequest={() => setShowLoginPopup(true)}
            onImageAttached={setImageAttached}
            onStartConversation={() => setHasConversationStarted(true)}
            onReset={() => {
              setImageAttached(false);
              setHasConversationStarted(false);
              setDropzoneOffsetY(DROPZONE_VERTICAL_OFFSET);
            }}
            offsetY={chatboxOffsetY}
            controlsOffsetY={20}
            imageButtonOffsetY={10}
            modelButtonOffsetY={13}
            usageBlockOffsetY={-20}
            sendButtonOffsetY={-10}
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
          <div className="absolute inset-y-6 left-1/2 w-[90%] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl bg-[#10131A] border border-white/10 shadow-[0_20px_60px_rgba(5,10,20,0.45)]">
            <div className="sticky top-0 z-10 bg-[#10131A] px-5 pt-6 pb-4 border-b border-white/8 text-center">
              <h2 className="text-[17px] font-semibold text-white">SOLVIX, 더 활용하고 싶으신가요?</h2>
              <p className="mt-1 text-[12px] text-white/60">나에게 맞는 요금제를 선택하세요.</p>
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

            <div className="relative h-[70vh] overflow-y-auto px-5 pb-6">
              <div className="space-y-5">
            {infoPopup === "performance" ? (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-white">SOLVIX 성능</h3>
                <img src="/assets/desktop/score_graph.svg" alt="성능 비교 그래프" className="w-full rounded-xl" />
                <p className="text-[12px] text-white/70 leading-[1.5]">
                  최고난도 모의고사에서도 만점을 기록했고, 평균 풀이 시간은 3분 15초입니다. 다른 AI보다 빠르고 정확해요.
                </p>
                  </div>
            ) : null}

            {infoPopup === "testimonials" ? (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-white">생생한 후기를 확인해 보세요</h3>
                    <div className="flex flex-col items-center gap-2">
                      <img src="/assets/desktop/card1.svg" alt="후기 1" className="w-36 max-w-full rounded-lg" />
                      <img src="/assets/desktop/card2.svg" alt="후기 2" className="w-36 max-w-full rounded-lg" />
                      <img src="/assets/desktop/card3.svg" alt="후기 3" className="w-36 max-w-full rounded-lg" />
                    </div>
                    <p className="text-[12px] text-white/65 text-center">
                      더 많은 후기가 필요하시면 톡으로 말씀해 주세요. 바로 보내 드릴게요.
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

                {infoPopup !== "pricing" ? (
                  <button
                    onClick={() => {
                      setInfoPopup(null);
                    }}
                    className="mt-6 w-full rounded-full border border-white/20 py-3 text-sm text-white/80"
                  >
              닫기
            </button>
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

      <MyPage isOpen={showMyPage} onClose={() => setShowMyPage(false)} userInfo={userInfo} />
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </div>
  );
}
