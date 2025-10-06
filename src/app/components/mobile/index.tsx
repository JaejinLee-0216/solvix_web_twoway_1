import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Chatbox from "../Chatbox";
import KakaoLoginPopup from "../KakaoLoginPopup";

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

  return (
    <div className="min-h-screen w-full bg-[#03050A] text-white">
      {/* Navigation */}
      <header className="px-5 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <Image src="/assets/desktop/nav_logo.png" alt="SOLVIX" width={128} height={34} priority />
          <button onClick={handleLoginClick} className="text-sm font-semibold text-[#0075DC] underline">
            {isLoggedIn ? '로그아웃' : '로그인'}
          </button>
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

      {/* Mode selection */}
      <section className="px-5">
        <div className="flex gap-2">
          {featureModes.map((mode) => (
            <button
              key={mode.label}
              className={`flex-1 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                mode.active ? "border border-[#3BA7FF] bg-[#0A1625] text-[#CFEAFF]" : "border border-white/10 text-white/40"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </section>

      {/* Chat preview */}
      <section className="px-5 mt-6 relative">
        <Chatbox
          variant="mobile"
          isLoggedIn={isLoggedIn}
          onStartConversation={handleChatStart}
          onReset={handleChatReset}
          onLoginRequest={handleLoginRequest}
        />
      </section>

      {/* Score card */}
      <section className="px-5 mt-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111A2A] to-[#05070F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">SOLVIX 1.0 성능 비교</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">실전 모의고사 기준</span>
          </div>
          <Image src="/assets/desktop/score_graph.svg" alt="성능 비교" width={340} height={160} className="mt-4 w-full" />
          <p className="mt-4 text-[11px] leading-[1.5] text-white/50">
            * 2026학년도 6모 대비 M사 K모의고사 기준 (미적분). SOLVIX는 동일 조건에서 공정하게 평가했습니다.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-5 mt-12 space-y-4">
        <h2 className="text-lg font-semibold">실제 학생들의 후기</h2>
        {testimonials.map((item) => (
          <div key={item.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[#FFC24C] text-[12px]">★★★★★</div>
            <p className="mt-2 text-[13px] leading-[1.6] text-white/80">{item.quote}</p>
            <p className="mt-3 text-[11px] text-white/50">{item.name}</p>
          </div>
        ))}
      </section>

      {/* Pricing plans */}
      <section className="px-5 mt-12 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">요금제</h2>
          <span className="text-xs text-white/40">나에게 맞는 플랜을 선택하세요.</span>
        </div>
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex gap-3">
              <Image src={plan.svg} alt={`${plan.name} plan`} width={92} height={120} className="w-[92px]" />
              <div className="flex-1 space-y-1">
                {plan.badge ? <span className="text-xs text-[#FFCE4E]">{plan.badge}</span> : null}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-xs text-white/60 leading-[1.6]">{plan.highlight}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">{plan.price}</span>
                  {plan.original ? <span className="text-[12px] text-white/35 line-through">{plan.original}</span> : null}
                </div>
                <button className="mt-3 w-full rounded-xl bg-[#0075DC] py-2 text-sm font-semibold">{plan.button}</button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Expert logos */}
      <section className="px-5 mt-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold">최고의 전문가들이 함께합니다</h2>
          <p className="mt-2 text-sm text-white/70">
            서울대학교 컴퓨터공학부 AI 팀과 수능 분석 전문가가 설계하고 검증했습니다.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {expertLogos.map((logo) => (
              <div key={logo.alt} className="flex items-center justify-center rounded-xl bg-black/30 py-3">
                <Image src={logo.src} alt={logo.alt} width={70} height={28} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 mt-12 pb-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-[1.6] text-white/70">
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
    </div>
  );
}
