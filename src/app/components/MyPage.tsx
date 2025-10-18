"use client";
import { useState, useEffect } from "react";
import MathRenderer from "./MathRenderer";

interface MyPageProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: any;
}

interface SolutionHistory {
  id: string;
  question: string;
  answer: string;
  image_url?: string;
  created_at: string;
  model_used: string;
  style_used: string;
}

export default function MyPage({ isOpen, onClose, userInfo }: MyPageProps) {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 text-black">
      <div className="bg-white rounded-2xl p-8 max-w-6xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-hidden text-black">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">마이페이지</h2>
            <p className="text-gray-600">안녕하세요, {userInfo?.nickname || '사용자'}님!</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="닫기"
          >
            <span className="material-symbols-rounded text-[24px]">close</span>
          </button>
        </div>

        <div className="flex gap-6 h-[70vh]">
          {/* Left Side - Solution History List */}
          <div className="w-1/2 border-r pr-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">풀이 내역</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : solutionHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                아직 풀이 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[60vh]">
                {solutionHistory.map((solution) => (
                  <div
                    key={solution.id}
                    onClick={() => setSelectedSolution(solution)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSolution?.id === solution.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm text-gray-500 mb-2">
                      {formatDate(solution.created_at)}
                    </div>
                    <div className="text-gray-800 font-medium mb-2 line-clamp-2">
                      {solution.question}
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {solution.model_used}
                      </span>
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {solution.style_used}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Solution Detail */}
          <div className="w-1/2">
            {selectedSolution ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">풀이 상세</h3>
                <div className="space-y-4 overflow-y-auto max-h-[60vh]">
                  {/* Question */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">질문</h4>
                    <p className="text-gray-700">{selectedSolution.question}</p>
                  </div>

                  {/* Answer */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">AI 답변</h4>
                    <div className="prose prose-sm max-w-none">
                      <MathRenderer text={selectedSolution.answer} />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">풀이 정보</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">사용 모델:</span>
                        <span className="ml-2 font-medium">{selectedSolution.model_used}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">해설 스타일:</span>
                        <span className="ml-2 font-medium">{selectedSolution.style_used}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">풀이 시간:</span>
                        <span className="ml-2 font-medium">{formatDate(selectedSolution.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                풀이를 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
