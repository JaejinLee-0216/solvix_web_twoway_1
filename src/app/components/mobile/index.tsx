"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Chatbox, { ChatboxHandle } from "../Chatbox";
import KakaoLoginPopup from "../KakaoLoginPopup";
import PaymentPopup from "../PaymentPopup";
import MyPage from "../MyPage";
import AdminPanel from "../AdminPanel";

export default function MobileLanding() {
  const CHATBOX_INITIAL_OFFSET = 80;
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
  const [paymentPopup, setPaymentPopup] = useState<{ isOpen: boolean; planType: "basic" | "pro" | "ultra" }>(
    { isOpen: false, planType: "basic" }
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoPopup, setInfoPopup] = useState<"performance" | "testimonials" | "pricing" | null>(null);

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
        setChatboxOffsetY(CHATBOX_INITIAL_OFFSET);
        return;
      }
      const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop;
      const dynamicOffset = keyboardHeight > 0 ? -keyboardHeight : 0;
      setChatboxOffsetY(CHATBOX_INITIAL_OFFSET + dynamicOffset);
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

  const closeAllPopups = () => {
    setMenuOpen(false);
    setInfoPopup(null);
  };

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
            onClick={() => setMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center"
            aria-label="메뉴 열기"
          >
            <span className="sr-only">메뉴 열기</span>
            <div className="space-y-1">
              <span className="block h-[2px] w-4 rounded bg-white" />
              <span className="block h-[2px] w-4 rounded bg-white" />
              <span className="block h-[2px] w-4 rounded bg-white" />
            </div>
          </button>
        </div>
      </header>

      <main className="px-4 pb-16 space-y-6">
        <section className="text-center space-y-2">
          <h1 className="text-[26px] font-semibold leading-tight"> 막혔어? 올려봐!</h1>
          <p className="text-[11px] text-white/70"> 풀이 한 장만 올려봐요. 나머진 SOLVIX가 도와줄게요.</p>
        </section>

        {!hasConversationStarted ? (
          <section>
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

        <section className="pb-10">
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
            }}
            offsetY={chatboxOffsetY}
          />
        </section>
      </main>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm px-6 py-8 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/80">빠른 안내</h2>
            <button onClick={closeAllPopups} className="h-8 w-8 flex items-center justify-center rounded-full bg-white/12 text-lg">
              ×
            </button>
          </div>
          <div className="mt-6 space-y-2.5 text-[13px] text-white/85">
            {isLoggedIn ? (
              <button onClick={() => { setMenuOpen(false); setShowMyPage(true); }} className="w-full rounded-xl bg-white/6 border border-white/12 px-4 py-3 text-left">
                마이페이지 열기
              </button>
            ) : null}
            {isLoggedIn && userInfo?.isAdmin ? (
              <button onClick={() => { setMenuOpen(false); setShowAdminPanel(true); }} className="w-full rounded-xl bg-white/6 border border-white/12 px-4 py-3 text-left text-red-300">
                관리자 패널 열기
              </button>
            ) : null}
            <button onClick={() => { setInfoPopup("performance"); setMenuOpen(false); }} className="w-full rounded-xl bg-white/6 border border-white/12 px-4 py-3 text-left">
              성능 비교
            </button>
            <button onClick={() => { setInfoPopup("testimonials"); setMenuOpen(false); }} className="w-full rounded-xl bg-white/6 border border-white/12 px-4 py-3 text-left">
              사용 후기
            </button>
            <button onClick={() => { setInfoPopup("pricing"); setMenuOpen(false); }} className="w-full rounded-xl bg-white/6 border border-white/12 px-4 py-3 text-left">
              요금제 안내
            </button>
          </div>
        </div>
      ) : null}

      {infoPopup ? (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm px-6 py-10 flex items-center justify-center">
          <div className="w-full max-w-xs rounded-2xl bg-[#0A1625] border border-white/10 px-5 py-6 space-y-5">
            {infoPopup === "performance" ? (
              <>
                <h3 className="text-base font-semibold">SOLVIX 성능</h3>
                <img src="/assets/desktop/score_graph.svg" alt="성능 비교 그래프" className="w-full rounded-xl" />
                <p className="text-[12px] text-white/70 leading-[1.5]">
                  최고 난도 모의고사에서도 만점을 기록했고, 평균 풀이 시간은 3분 15초입니다. 다른 AI보다 빠르고 정확해요.
                </p>
              </>
            ) : null}
            {infoPopup === "testimonials" ? (
              <>
                <h3 className="text-base font-semibold">생생한 후기를 확인해 보세요</h3>
                <div className="space-y-2">
                  <img src="/assets/desktop/card1.svg" alt="후기 1" className="w-36 max-w-full mx-auto rounded-lg" />
                  <img src="/assets/desktop/card2.svg" alt="후기 2" className="w-36 max-w-full mx-auto rounded-lg" />
                  <img src="/assets/desktop/card3.svg" alt="후기 3" className="w-36 max-w-full mx-auto rounded-lg" />
                </div>
                <p className="text-[12px] text-white/65">더 많은 후기가 필요하시면 톡으로 말씀해 주세요. 바로 보내 드릴게요.</p>
              </>
            ) : null}
            {infoPopup === "pricing" ? (
              <>
                <h3 className="text-base font-semibold">요금제 살펴보기</h3>
                <div className="space-y-2">
                  <img src="/assets/desktop/plan_basic.svg" alt="Basic 플랜" className="w-full" />
                  <img src="/assets/desktop/plan_pro.svg" alt="Pro 플랜" className="w-full" />
                  <img src="/assets/desktop/plan_ultra.svg" alt="Ultra 플랜" className="w-full" />
                </div>
                <button
                  onClick={() => setPaymentPopup({ isOpen: true, planType: "basic" })}
                  className="w-full rounded-full bg-[#3BA7FF] py-3 text-[13px] font-semibold text-white hover:bg-[#2F8ED6]"
                >
                  결제 옵션 보기
                </button>
              </>
            ) : null}
            <button onClick={closeAllPopups} className="w-full rounded-full border border-white/20 py-3 text-sm text-white/80">
              닫기
            </button>
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
      <AdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
    </div>
  );
}
