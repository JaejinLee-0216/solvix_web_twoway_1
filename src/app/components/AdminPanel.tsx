"use client";
import { useState, useEffect } from "react";
import MathRenderer from "./MathRenderer";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUsageUpdated?: () => void;
}

interface User {
  id: string;
  kakao_id: string;
  nickname: string;
  email: string;
  plan_type: 'basic' | 'pro' | 'ultra';
  total_questions: number;
  last_login_at: string;
  created_at: string;
}

interface UserConversation {
  id: string;
  user_id: string;
  session_id?: string;
  question: string;
  answer: string;
  image_urls?: string[];
  created_at: string;
  model_used: string;
  style_used: string;
}

export default function AdminPanel({ isOpen, onClose, onUsageUpdated }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userConversations, setUserConversations] = useState<UserConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bonusQuestions, setBonusQuestions] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserConversations(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserConversations = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/conversations?user_id=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      setUserConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch user conversations:", error);
      setUserConversations([]);
    }
  };

  const handleGiveBonusQuestions = async () => {
    if (!selectedUser || bonusQuestions <= 0) {
      alert("질문권 개수를 입력해주세요.");
      return;
    }
    
    try {
      const response = await fetch('/api/admin/bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_user_id: selectedUser.id,
          bonus_count: bonusQuestions,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to give bonus questions');
      }

      alert(data.message || `${selectedUser.nickname}님에게 ${bonusQuestions}개의 질문권을 증정했습니다.`);
      setBonusQuestions(0);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('usage-updated'));
      }
      onUsageUpdated?.();
    } catch (error: any) {
      console.error("Failed to give bonus questions:", error);
      alert(`질문권 증정 실패: ${error.message}`);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic':
        return 'bg-white/10 text-white border border-white/20';
      case 'pro':
        return 'bg-[#1F3B63]/70 text-[#8CC9FF] border border-[#4CB4FF]/40';
      case 'ultra':
        return 'bg-[#2E1F63]/70 text-[#C5A8FF] border border-[#A178FF]/40';
      default:
        return 'bg-white/10 text-white border border-white/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(5,10,20,0.85)] backdrop-blur-md flex items-center justify-center z-50 text-white">
      <div className="bg-[rgba(10,16,28,0.95)] rounded-2xl border border-white/10 p-6 sm:p-8 max-w-5xl w-full mx-4 shadow-[0_30px_80px_rgba(8,16,32,0.65)] max-h-[90vh] overflow-hidden text-white text-sm sm:text-base">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">관리자 패널</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl sm:text-2xl"
            aria-label="닫기"
          >
            <span className="material-symbols-rounded text-[24px]">close</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[70vh]">
          {/* Left Side - Users List */}
          <div className="lg:w-1/3 border-r border-transparent lg:border-white/10 lg:pr-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">회원 목록</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-2 border-[#4CB4FF] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[30vh] lg:max-h-[60vh] pr-1">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-[#4CB4FF] bg-white/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-white">{user.nickname}</div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(user.plan_type)}`}>
                        {user.plan_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-white/70 mb-1">{user.email}</div>
                    <div className="text-sm text-white/60">
                      총 질문: <span className="font-medium text-white">{user.total_questions}회</span>
                    </div>
                    <div className="text-xs text-white/50">
                      마지막 로그인: {formatDate(user.last_login_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - User Details and Conversations */}
          <div className="lg:w-2/3 flex-1">
            {selectedUser ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white">
                    {selectedUser.nickname}님의 상세 정보
                  </h3>
                  
                  {/* Bonus Questions Form */}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bonusQuestions}
                      onChange={(e) => setBonusQuestions(Number(e.target.value))}
                      placeholder="질문권 개수"
                      className="w-24 px-3 py-1 border border-white/20 bg-white/5 rounded text-sm text-white placeholder:text-white/40"
                      min="1"
                    />
                    <button
                      onClick={handleGiveBonusQuestions}
                      className="px-4 py-1 bg-[#3BA7FF] text-white rounded text-sm hover:bg-[#2b91e5]"
                    >
                      증정
                    </button>
                  </div>
                </div>

                {/* User Info */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/80">
                    <div>
                      <span className="text-white/60">이메일:</span>
                      <span className="ml-2 font-medium text-white">{selectedUser.email}</span>
                    </div>
                    <div>
                      <span className="text-white/60">현재 플랜:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getPlanColor(selectedUser.plan_type)}`}>
                        {selectedUser.plan_type.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">총 질문 횟수:</span>
                      <span className="ml-2 font-medium text-white">{selectedUser.total_questions}회</span>
                    </div>
                    <div>
                      <span className="text-white/60">가입일:</span>
                      <span className="ml-2 font-medium text-white">{formatDate(selectedUser.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Conversations */}
                <h4 className="text-base sm:text-md font-semibold text-white mb-3">질문-답변 내역</h4>
                <div className="space-y-3 overflow-y-auto max-h-[30vh] sm:max-h-[40vh] pr-1">
                  {userConversations.map((conversation) => (
                    <div key={conversation.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs sm:text-sm text-white/60">
                          {formatDate(conversation.created_at)}
                        </div>
                        <div className="flex gap-2 text-xs text-white/70">
                          <span className="bg-white/10 px-2 py-1 rounded">
                            {conversation.model_used}
                          </span>
                          <span className="bg-white/10 px-2 py-1 rounded">
                            {conversation.style_used}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm font-medium text-white mb-1">질문:</div>
                        <div className="text-sm text-white/70 bg-white/5 border border-white/10 p-2 rounded">
                          {conversation.question}
                        </div>
                        {conversation.image_urls && conversation.image_urls.length > 0 ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {conversation.image_urls.map((src, index) => (
                              <img
                                key={`${conversation.id}-img-${index}`}
                                src={src}
                                alt={`conversation-${conversation.id}-image-${index + 1}`}
                                className="w-full rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-white mb-1">답변:</div>
                        <div className="text-sm text-white/80 bg-[#0E1A2A] border border-white/10 p-2 rounded">
                          <MathRenderer text={conversation.answer} colorScheme="dark" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-white/50">
                회원을 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
