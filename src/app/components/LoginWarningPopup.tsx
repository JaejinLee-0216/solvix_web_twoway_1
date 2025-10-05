"use client";

interface LoginWarningPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export default function LoginWarningPopup({ isOpen, onClose, onLogin }: LoginWarningPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header with warning icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-red-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 text-lg">
            SOLVIX의 AI 문제풀이 서비스를 이용하려면<br />
            로그인을 해주세요.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onLogin}
            className="flex-1 py-3 px-6 bg-[#0075DC] text-white rounded-lg font-medium hover:bg-[#0056B3] transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    </div>
  );
}
