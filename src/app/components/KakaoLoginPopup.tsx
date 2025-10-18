"use client";
interface KakaoLoginPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userInfo: any) => void;
}

export default function KakaoLoginPopup({ isOpen, onClose, onLoginSuccess }: KakaoLoginPopupProps) {
  if (!isOpen) return null;

  const handleKakaoLogin = () => {
    // 카카오 로그인 페이지로 리다이렉트
    const redirectUri = window.location.hostname === 'localhost'
      ? 'http://localhost:3000/api/auth/kakao/callback'
      : 'https://www.solvix.kr/api/auth/kakao/callback';

    const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
    
    if (!clientId) {
      alert('카카오 로그인 설정이 올바르지 않습니다. 관리자에게 문의하세요.');
      return;
    }

    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    
    console.log('Redirecting to Kakao login...');
    console.log('Client ID:', clientId.substring(0, 10) + '...');
    console.log('Redirect URI:', redirectUri);
    
    window.location.href = kakaoAuthUrl;
  };

  const handleLogout = () => {
    onLoginSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">로그인</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center text-gray-400 hover:text-gray-600 w-8 h-8"
            aria-label="닫기"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* Kakao Login Button */}
        <div className="mb-6">
            <button
              onClick={handleKakaoLogin}
              className="w-full h-14 bg-[#FEE500] hover:bg-[#FDD835] rounded-lg flex items-center justify-center transition-colors relative overflow-hidden"
            >
              <div className="flex items-center">
                {/* Kakao K Logo */}
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <span className="text-black font-medium text-lg">카카오톡 시작하기</span>
              </div>
            </button>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            카카오 계정으로 간편하게 로그인하세요
          </p>
          <p className="text-xs text-gray-400">
            로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
        </div>

        {/* Demo Logout Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 text-sm"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
