"use client";
import { useState, useEffect } from "react";
import MathRenderer from "./MathRenderer";

interface MyPageProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: any;
  onResumeSession?: (sessionId: string) => void;
}

interface SolutionHistory {
  id: string;
  session_id?: string;
  question: string;
  answer: string;
  image_urls?: string[];
  created_at: string;
  model_used: string;
  style_used: string;
}

export default function MyPage({ isOpen, onClose, userInfo, onResumeSession }: MyPageProps) {
  const [solutionHistory, setSolutionHistory] = useState<SolutionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<SolutionHistory | null>(null);

  useEffect(() => {
    if (isOpen && userInfo) {
      fetchSolutionHistory();
    }
  }, [isOpen, userInfo]);

  const fetchSolutionHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mypage/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      setSolutionHistory(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch solution history:", error);
      // 에러 시 빈 배열
      setSolutionHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-[rgba(5,10,20,0.85)] backdrop-blur-md flex items-center justify-center z-50 text-white">
      <div className="bg-[rgba(10,16,28,0.95)] rounded-2xl border border-white/10 p-6 sm:p-8 max-w-4xl w-full mx-4 shadow-[0_30px_80px_rgba(8,16,32,0.65)] max-h-[90vh] overflow-hidden text-white text-sm sm:text-base">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">마이페이지</h2>
            <p className="text-white/70 text-sm sm:text-base">안녕하세요, {userInfo?.nickname || '사용자'}님!</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl sm:text-2xl"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[70vh]">
          {/* Left Side - Solution History List */}
          <div className="lg:w-1/2 border-r border-transparent lg:border-white/10 lg:pr-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">풀이 내역</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : solutionHistory.length === 0 ? (
              <div className="text-center text-white/50 py-8">
                아직 풀이 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[30vh] lg:max-h-[60vh] pr-1">
                {solutionHistory.map((solution) => (
                  <div
                    key={solution.id}
                    onClick={() => {
                      setSelectedSolution(solution);
                      if (solution.session_id) {
                        onResumeSession?.(solution.session_id);
                      }
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSolution?.id === solution.id
                        ? 'border-[#4CB4FF] bg-white/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="text-xs sm:text-sm text-white/60 mb-2">
                      {formatDate(solution.created_at)}
                    </div>
                    <div className="text-white font-medium mb-2 line-clamp-2 text-sm sm:text-base">
                      {solution.question}
                    </div>
                    <div className="flex gap-2 text-xs text-white/60">
                      <span className="bg-white/10 px-2 py-1 rounded">
                        {solution.model_used}
                      </span>
                      <span className="bg-white/10 px-2 py-1 rounded">
                        {solution.style_used}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Solution Detail */}
          <div className="lg:w-1/2 flex-1">
            {selectedSolution ? (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">풀이 상세</h3>
                <div className="space-y-4 overflow-y-auto max-h-[30vh] lg:max-h-[60vh] pr-1">
                  {/* Question */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2 text-sm sm:text-base">질문</h4>
                    <p className="text-white/80 text-sm sm:text-base">{selectedSolution.question}</p>
                    {selectedSolution.image_urls && selectedSolution.image_urls.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {selectedSolution.image_urls.map((src, index) => (
                          <img
                            key={`${selectedSolution.id}-img-${index}`}
                            src={src}
                            alt={`question-attachment-${index + 1}`}
                            className="w-full rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Answer */}
                  <div className="bg-[#0E1A2A] border border-white/10 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2 text-sm sm:text-base">AI 답변</h4>
                    <div className="prose prose-sm max-w-none">
                      <MathRenderer text={selectedSolution.answer} colorScheme="dark" />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2 text-sm sm:text-base">풀이 정보</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/80">
                      <div>
                        <span className="text-white/60">사용 모델:</span>
                        <span className="ml-2 font-medium text-white">{selectedSolution.model_used}</span>
                      </div>
                      <div>
                        <span className="text-white/60">해설 스타일:</span>
                        <span className="ml-2 font-medium text-white">{selectedSolution.style_used}</span>
                      </div>
                      <div>
                        <span className="text-white/60">풀이 시간:</span>
                        <span className="ml-2 font-medium text-white">{formatDate(selectedSolution.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onResumeSession?.(selectedSolution.session_id ?? "")}
                    disabled={!selectedSolution.session_id}
                    className={`mt-4 w-full rounded-full py-2.5 text-sm font-semibold transition-colors ${selectedSolution.session_id ? "bg-[#3BA7FF] text-[#02040A] hover:bg-[#2b91e5]" : "bg-white/10 text-white/40 cursor-not-allowed"}`}
                  >
                    이어서 대화하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-white/50">
                풀이를 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
