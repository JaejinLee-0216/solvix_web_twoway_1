"use client";
import { useState, useEffect } from "react";
import SvgButton from "./ui/SvgButton";
import Chatbox from "./Chatbox";
import ScoreGraph from "./ScoreGraph";
import KakaoLoginPopup from "./KakaoLoginPopup";
import MyPage from "./MyPage";
import AdminPanel from "./AdminPanel";

export default function Hero() {
  const [selection, setSelection] = useState<"solve" | "review" | "error">("solve");
  const [hideHero, setHideHero] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPlan, setUserPlan] = useState<'basic' | 'pro' | 'ultra'>('basic');
  const [showMyPage, setShowMyPage] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  const handleLoginSuccess = (userInfo: any) => {
    if (userInfo) {
      setIsLoggedIn(true);
      setUserPlan(userInfo.plan || 'basic');
      setUserInfo({...userInfo, plan: userInfo.plan || 'basic'});
      // Store user info in localStorage for persistence
      localStorage.setItem('userInfo', JSON.stringify({...userInfo, plan: userInfo.plan || 'basic'}));
    } else {
      setIsLoggedIn(false);
      setUserPlan('basic');
      setUserInfo(null);
      localStorage.removeItem('userInfo');
    }
  };

  const handleLoginClick = async () => {
    if (isLoggedIn) {
      // Logout
      try {
        await fetch('/api/auth/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
        });
        handleLoginSuccess(null);
      } catch (error) {
        console.error('Logout failed:', error);
        handleLoginSuccess(null);
      }
    } else {
      // Show login popup
      setShowLoginPopup(true);
    }
  };

  // Check for existing login on component mount
  useEffect(() => {
    checkLoginStatus();
    
    // Check for login success from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
      // Remove URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      checkLoginStatus();
    }
  }, []);

  const checkLoginStatus = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsLoggedIn(true);
          setUserPlan(data.user.plan || 'basic');
          setUserInfo(data.user);
          // Also save to localStorage for persistence
          localStorage.setItem('userInfo', JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error('Login check failed:', error);
      // Fallback to localStorage
      const savedUserInfo = localStorage.getItem('userInfo');
      if (savedUserInfo) {
        const userInfo = JSON.parse(savedUserInfo);
        setIsLoggedIn(true);
        setUserPlan(userInfo.plan || 'basic');
        setUserInfo(userInfo);
      }
    }
  };

  return (
    <section className="container-1200 relative" style={{ height: 1405 }}>
      {/* Background */}
      {/* Logo */}
      <div className="absolute left-[136px] top-[13px] w-[153px] h-[42px] bg-[url('/assets/desktop/nav_logo.png')] bg-contain bg-no-repeat" />
      
      {/* User Info and Login Button */}
      <div className="absolute right-[136px] top-[13px] flex items-center gap-4">
        {isLoggedIn && (
          <>
            <span className="text-white text-sm">
              현재 플랜: <span className="font-bold text-yellow-400">{userPlan.toUpperCase()}</span>
            </span>
            <button
              onClick={() => setShowMyPage(true)}
              className="text-[#0075DC] font-bold underline hover:text-[#0056B3] transition-colors text-sm"
            >
              마이페이지
            </button>
            {userInfo?.isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="text-red-500 font-bold underline hover:text-red-600 transition-colors text-sm"
              >
                관리자
              </button>
            )}
          </>
        )}
        <button
          onClick={handleLoginClick}
          className="text-[#0075DC] font-bold underline hover:text-[#0056B3] transition-colors"
        >
          {isLoggedIn ? '로그아웃' : '로그인'}
        </button>
      </div>

      {!hideHero && (
        <>
          {/* Heading and subheading visible until send */}
          <h1 className="absolute left-[354px] top-[106px] w-[492px] h-[140px] text-[60px] leading-[1.1666] font-semibold tracking-[-0.04%] text-center font-display">
            {`킬러 문항,\n더 이상 두렵지 않게.`}
          </h1>
          <p className="absolute left-[328px] top-[255px] w-[544px] h-[31px] text-[20px] leading-[1.55] text-center">
            풀이 과정은 물론, 평가원의 출제 의도까지 파악해 드립니다.
          </p>
          <div className="absolute left-[296px] top-[323px] flex gap-[21px]">
            <SvgButton src="/assets/desktop/cta-solve.svg" alt="문제 풀이" width={168} height={57} selected={selection === "solve"} onClick={() => setSelection("solve")} />
            <div className="opacity-40 cursor-not-allowed">
              <SvgButton src="/assets/desktop/cta-review.svg" alt="풀이 첨삭" width={189} height={57} selected={false} onClick={(e?: any) => {}} />
            </div>
            <div className="opacity-40 cursor-not-allowed">
              <SvgButton src="/assets/desktop/cta-error.svg" alt="문제 오류" width={196} height={57} selected={false} onClick={(e?: any) => {}} />
            </div>
          </div>
        </>
      )}

      {/* CTA buttons - hidden in conversation mode */}
      {!hideHero && (
        <div className="absolute left-[296px] top-[323px] flex gap-[21px]">
          <SvgButton src="/assets/desktop/cta-solve.svg" alt="문제 풀이" width={168} height={57} selected={selection === "solve"} onClick={() => setSelection("solve")} />
          <div className="opacity-40 cursor-not-allowed">
            <SvgButton src="/assets/desktop/cta-review.svg" alt="풀이 첨삭" width={189} height={57} selected={false} onClick={(e?: any) => {}} />
          </div>
          <div className="opacity-40 cursor-not-allowed">
            <SvgButton src="/assets/desktop/cta-error.svg" alt="문제 오류" width={196} height={57} selected={false} onClick={(e?: any) => {}} />
          </div>
        </div>
      )}

      <Chatbox 
        onStartConversation={() => setHideHero(true)} 
        onReset={() => setHideHero(false)}
        isLoggedIn={isLoggedIn}
        onLoginRequest={() => setShowLoginPopup(true)}
      />
      
      {/* Score Graph - Always visible */}
      <ScoreGraph />

      {/* Bottom black shade */}
      <div className="absolute left-[98px] top-[1262px] w-[1003px] h-[127px]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 4%, rgba(5,2,8,1) 86%)" }} />
      
      {/* Kakao Login Popup */}
      <KakaoLoginPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      
      {/* MyPage */}
      <MyPage
        isOpen={showMyPage}
        onClose={() => setShowMyPage(false)}
        userInfo={userInfo}
      />
      
      {/* Admin Panel */}
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </section>
  );
}

