"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Chatbox from "../Chatbox";
import KakaoLoginPopup from "../KakaoLoginPopup";
import PaymentPopup from "../PaymentPopup";
import MyPage from "../MyPage";
import AdminPanel from "../AdminPanel";

const heroBadges = [
  "수능 수학 AI 튜터",
  "서울대 AI팀 검증"
];

const featureModes = [
  { label: "문제 풀이", active: true },
  { label: "풀이 첨삭", active: false },
  { label: "문제 오류", active: false }
];


const testimonials = [
  {
    name: "김○○ (일반고 3학년)",
    quote:
      "준킬러 문제만 만나면 시간이 부족했는데, 이제 자신 있어요. SOLVIX는 단순히 답을 알려주는 게 아니라 어떤 조건에서 어떤 생각을 해야 하는지 '답 이후 과정' 전체를 정리해줘요."
  },
  {
    name: "이○○ (의대 준비생)",
    quote:
      "100점을 위한 마지막 1%는 시간 관리와 정확도입니다. SOLVIX는 풀이 속도와 정확도를 동시에 잡아줘서 실제 시험에서도 효율적인 전략을 세울 수 있었어요."
  },
  {
    name: "박○○ (자사고 2학년)",
    quote:
      "사진만 찍으면 풀이해주는 앱들 많이 써봤지만, 해설이 허술하거나 설명이 부족했어요. SOLVIX는 서울대 팀이 만든 해설이라 믿고 쓰게 됐고 꾸준히 사용하면서 부족한 개념까지 보완하고 있어요."
  }
];

const plans = [
  {
    name: "Basic",
    highlight: "SOLVIX 핵심 기능을 직접 경험해보세요.",
    price: "무료",
    button: "무료로 시작하기",
    svg: "/assets/desktop/plan_basic.svg"
  },
  {
    name: "Pro",
    highlight: "매일 꾸준한 풀이가 합격의 차이를 만듭니다.",
    price: "₩ 9,900",
    original: "₩ 19,900",
    badge: "커피 두 잔만 절약하세요!",
    button: "Pro로 관리 받기",
    svg: "/assets/desktop/plan_pro.svg"
  },
  {
    name: "Ultra",
    highlight: "모든 의문을 해결하세요. 전문가 팀이 함께합니다.",
    price: "₩ 39,900",
    original: "₩ 79,900",
    badge: "New!",
    button: "Ultra로 100점 예약하기",
    svg: "/assets/desktop/plan_ultra.svg"
  }
];

const expertLogos = [
  { src: "/assets/desktop/snu_logo.svg", alt: "서울대학교" },
  { src: "/assets/desktop/korea_univ_logo.svg", alt: "고려대학교" },
  { src: "/assets/desktop/team_medical_logo.svg", alt: "TEAM MEDICAL" }
];

export default function MobileLandingPlaceholder() {
  const year = new Date().getFullYear();
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [paymentPopup, setPaymentPopup] = useState<{ isOpen: boolean; planType: "basic" | "pro" | "ultra" }>({
    isOpen: false,
    planType: "basic"
  });
  const [showMyPage, setShowMyPage] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(featureModes[0].label);

  const handleChatStart = () => {};
  const handleChatReset = () => {};
  const handleLoginRequest = () => setShowLoginPopup(true);

  const syncLoginState = useCallback((info: any) => {
    if (info) {
      setIsLoggedIn(true);
      setUserInfo(info);
      localStorage.setItem("userInfo", JSON.stringify(info));
    } else {
      setIsLoggedIn(false);
      setUserInfo(null);
      localStorage.removeItem("userInfo");
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            syncLoginState(data.user);
            return;
          }
        }
      } catch (error) {
        console.error('Login check failed:', error);
      }
      const saved = localStorage.getItem('userInfo');
      if (saved) {
        syncLoginState(JSON.parse(saved));
      }
    };
    check();
  }, [syncLoginState]);

  const handleLoginClick = () => {
    if (isLoggedIn) {
      fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      }).finally(() => {
        syncLoginState(null);
      });
    } else {
      setShowLoginPopup(true);
    }
  };

  const handleLoginSuccess = (info: any) => {
    syncLoginState(info);
    setShowLoginPopup(false);
  };

  const planDisplay = (userInfo?.plan || "basic").toUpperCase();

  const closePaymentPopup = () => {
    setPaymentPopup({ isOpen: false, planType: "basic" });
  };

  return (
    <div className="min-h-screen w-full bg-[#03050A] text-white">
      {/* Navigation */}
      <header className="px-5 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <Image src="/assets/desktop/nav_logo.png" alt="SOLVIX" width={128} height={34} priority />
          <div className="flex items-center gap-3 text-[11px] text-white/70">
            {isLoggedIn ? (
              <span className="bg-white/10 px-2 py-1 rounded-full">
                현재 플랜: <span className="font-semibold text-[#FFD54F]">{planDisplay}</span>
              </span>
            ) : null}
            <button onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20">
              <span className="sr-only">열기</span>
              <div className="space-y-1.5">
                <span className="block h-1 w-6 rounded bg-white"></span>
                <span className="block h-1 w-6 rounded bg-white"></span>
                <span className="block h-1 w-6 rounded bg-white"></span>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {heroBadges.map((badge) => (
              <span key={badge} className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
                {badge}
              </span>
            ))}
          </div>
          <h1 className="text-[28px] font-semibold leading-[1.3]">
            킬러 문항,
            <br /> 더 이상 두렵지 않게.
          </h1>
          <p className="text-[14px] leading-[1.6] text-white/70">
            평가원의 출제 의도까지 짚어주는 SOLVIX.
            <br /> 수능 전문가와 AI가 함께 만든 맞춤형 풀이를 경험하세요.
          </p>
        </div>
      </header>

      {/* Guided steps */}
      <section className="px-5">
        {currentStep === -1 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
            <p className="text-sm text-white/80">오늘 집중하고 싶은 목표를 선택하면 SOLVIX가 자동으로 도와드려요.</p>
            <div className="space-y-3">
              {featureModes.map((mode) => (
                <button
                  key={mode.label}
                  onClick={() => setSelectedMode(mode.label)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium flex items-center justify-between border transition-colors ${
                    selectedMode === mode.label ? "border-[#3BA7FF] bg-[#0A1625] text-[#CFEAFF]" : "border-white/10 text-white/60"
                  }`}
                >
                  {mode.label}
                  {mode.label === selectedMode ? <span className="text-xs text-[#3BA7FF]">선택됨</span> : null}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(1)}
                className="rounded-xl bg-[#3BA7FF] px-5 py-2 text-sm font-semibold text-white"
              >
                다음 단계
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
            <p className="text-sm text-white/80">문제 이미지를 준비해 주세요. 선명한 사진일수록 더 정확한 해설을 받을 수 있어요.</p>
            <ul className="space-y-2 text-xs text-white/60 list-disc list-inside">
              <li>문제 전체가 잘 보이도록 촬영</li>
              <li>필요하면 사진 위에 간단한 메모를 추가</li>
              <li>추가 질문이 있다면 미리 떠올려보세요</li>
            </ul>
            <div className="flex justify-between">
              <button onClick={() => setCurrentStep(0)} className="text-sm text-white/60">이전</button>
              <button
                onClick={() => setCurrentStep(2)}
                className="rounded-xl bg-[#3BA7FF] px-5 py-2 text-sm font-semibold text-white"
              >
                준비 완료
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-white/80">이제 질문을 입력하고 답변을 받아보세요.</p>
              <p className="text-xs text-white/60">모델: {selectedMode} · 플랜: {planDisplay}</p>
            </div>
            <Chatbox
              variant="mobile"
              isLoggedIn={isLoggedIn}
              onStartConversation={handleChatStart}
              onReset={handleChatReset}
              onLoginRequest={handleLoginRequest}
            />
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-white/60"
            >
              이미지 다시 준비하기
            </button>
          </div>
        ) : null}
      </section>

      {/* Footer */}
      <footer className="px-5 mt-12 pb-10">
        <div className="rounded-2xl border border-white/10 p-4 text-sm leading-[1.6] text-white/70">
          SOLVIX는 분석형 수학 학습을 돕는 AI 서비스입니다. 하루 10분의 훈련으로도 극적인 성적 향상을 경험하세요.
        </div>
        <div className="mt-5 flex justify-between text-[11px] text-white/40">
          <span>© {year} SOLVIX</span>
          <span>이용 약관 · 개인정보 처리방침</span>
        </div>
      </footer>

      <KakaoLoginPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <PaymentPopup
        isOpen={paymentPopup.isOpen}
        onClose={closePaymentPopup}
        planType={paymentPopup.planType}
      />

      <MyPage
        isOpen={showMyPage}
        onClose={() => setShowMyPage(false)}
        userInfo={userInfo}
      />

      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />

      {/* Hamburger Menu */}
      {menuOpen ? (
        <div className="fixed inset-0 bg-black/80 z-50 px-6 py-8 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">SOLVIX 메뉴</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="mt-8 space-y-4 text-base font-semibold text-white">
            <button onClick={() => { setMenuOpen(false); setCurrentStep(-1); }} className="w-full text-left">목표 선택하기</button>
            <button onClick={() => { setMenuOpen(false); setCurrentStep(1); }} className="w-full text-left">이미지 준비 안내</button>
            <button onClick={() => { setMenuOpen(false); setCurrentStep(0); }} className="w-full text-left">채팅 열기</button>
            <button onClick={() => { setMenuOpen(false); setShowMyPage(true); }} className="w-full text-left">마이페이지</button>
            {userInfo?.isAdmin ? (
              <button onClick={() => { setMenuOpen(false); setShowAdminPanel(true); }} className="w-full text-left text-red-400">관리자</button>
            ) : null}
            <button
              onClick={() => {
                setMenuOpen(false);
                handleLoginClick();
              }}
              className="w-full text-left text-[#3BA7FF]"
            >
              {isLoggedIn ? "로그아웃" : "로그인"}
            </button>
          </div>
          <div className="mt-auto space-y-3 text-white/50 text-xs">
            <p>요금제, 후기, 성능 비교 등은 데스크톱에서 확인해 주세요.</p>
            <p>© {year} SOLVIX</p>
          </div>
        </div>
      ) : null}

    </div>
  );
}
