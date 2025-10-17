"use client";
import { useEffect, useRef, useState } from "react";
import Chatbox, { ChatboxHandle } from "./Chatbox";
import ScoreGraph from "./ScoreGraph";
import KakaoLoginPopup from "./KakaoLoginPopup";
import MyPage from "./MyPage";
import AdminPanel from "./AdminPanel";

export default function Hero() {
  const chatboxRef = useRef<ChatboxHandle | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPlan, setUserPlan] = useState<'basic' | 'pro' | 'ultra'>('basic');
  const [showMyPage, setShowMyPage] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [imageAttached, setImageAttached] = useState(false);

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
          localStorage.setItem('userInfo', JSON.stringify(data.user));
          if (data.user.isAdmin) {
            setShowAdminPanel(false);
          }
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
          if (userInfo.isAdmin) {
            setShowAdminPanel(false);
          }
      }
    }
  };

  useEffect(() => {
    const node = dropRef.current;
    if (!node) return;

    const highlight = () => {
      node.classList.add("ring-4", "ring-[#3BA7FF]/60", "bg-white/8");
    };

    const unhighlight = () => {
      node.classList.remove("ring-4", "ring-[#3BA7FF]/60", "bg-white/8");
    };

    const blockDefaults = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDragEnter = (event: DragEvent) => {
      blockDefaults(event);
      highlight();
    };

    const handleDragOver = (event: DragEvent) => {
      blockDefaults(event);
    };

    const handleDragLeave = (event: DragEvent) => {
      blockDefaults(event);
      unhighlight();
    };

    const handleDrop = (event: DragEvent) => {
      blockDefaults(event);
      unhighlight();
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        chatboxRef.current?.attachImages(files);
      }
    };

    node.addEventListener("dragenter", handleDragEnter, false);
    node.addEventListener("dragover", handleDragOver, false);
    node.addEventListener("dragleave", handleDragLeave, false);
    node.addEventListener("drop", handleDrop, false);

    return () => {
      node.removeEventListener("dragenter", handleDragEnter, false);
      node.removeEventListener("dragover", handleDragOver, false);
      node.removeEventListener("dragleave", handleDragLeave, false);
      node.removeEventListener("drop", handleDrop, false);
    };
  }, []);

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

  const handleScrollToChat = () => {
    chatboxRef.current?.focusInput();
    document.getElementById("chatbox-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="container-1200 relative font-[var(--font-sans)]" style={{ height: 1405 }}>
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

      <h1 className="absolute left-1/2 -translate-x-1/2 top-[120px] w-[640px] text-center text-[50px] leading-[1.1] font-semibold tracking-[-0.04em]">
      문제 올리면 풀이 도착.
      </h1>
      <p className="absolute left-1/2 -translate-x-1/2 top-[200px] w-[520px] text-center text-[18px] text-white/80">
        사진 한 장이면, 만점자 풀이가 내 손에!
      </p>

      <div
        ref={dropRef}
        className={`group absolute left-1/2 -translate-x-1/2 top-[250px] w-[720px] h-[340px] rounded-[32px] border-2 border-dashed border-[#3BA7FF]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 text-center transition-all duration-200 ${imageAttached ? 'bg-[#0A1625]/40' : 'bg-white/6 hover:bg-white/10 focus-within:bg-white/10'}`}
      >
        <button
          type="button"
          onClick={handleFilePick}
          className="min-w-[220px] rounded-full bg-[#3BA7FF] px-8 py-4 text-[18px] font-semibold text-white shadow-[0_18px_38px_rgba(59,167,255,0.35)] transition-all duration-200 hover:bg-[#2F8ED6] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3BA7FF]/35"
        >
          {imageAttached ? '사진 교체하기' : '파일 선택하기'}
        </button>
        <div className="space-y-3">
          <p className="text-[20px] font-semibold">{imageAttached ? '사진이 첨부되었습니다.' : '여기에 문제 사진을 끌어다 놓거나 클릭해서 첨부하세요'}</p>
          <p className="text-[15px] text-white/70">선명한 사진일수록 더욱 정확한 풀이를 받을 수 있어요.</p>
        </div>
      </div>

      <div id="chatbox-section">
        <Chatbox
          ref={chatboxRef}
          onStartConversation={() => {}}
          onReset={() => {
            setImageAttached(false);
          }}
          isLoggedIn={isLoggedIn}
          onLoginRequest={() => setShowLoginPopup(true)}
          onImageAttached={setImageAttached}
        />
      </div>

      {/* Secondary content area */}
      {imageAttached ? (
        <div className="absolute left-[136px] top-[980px] w-[928px] rounded-[24px] border border-white/10 bg-white/3 backdrop-blur-sm px-10 py-8 flex flex-col gap-4 text-white/85">
          <h3 className="text-[24px] font-semibold">곧 답변이 도착합니다</h3>
          <p className="text-[16px] leading-[1.6] text-white/70">
            풀이가 도착하면 아래에서 바로 확인할 수 있어요. 추가 질문이 있다면 입력창에 미리 적어 두셔도 좋아요!
          </p>
        </div>
      ) : (
        <ScoreGraph />
      )}
      
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

