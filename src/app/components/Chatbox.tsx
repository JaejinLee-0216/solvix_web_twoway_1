"use client";
import { useRef, useState, useEffect } from "react";
import MathRenderer from "./MathRenderer";
import LoginWarningPopup from "./LoginWarningPopup";
import D3Visualization, { VisualizationData as D3VisualizationData } from "./D3Visualization";

type Props = {
  onSubmit?: (payload: { text: string; image?: File | null; model: string; style: string }) => void;
  onStartConversation?: () => void;
  onReset?: () => void;
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
  variant?: "desktop" | "mobile";
};

type Message = {
  role: 'user' | 'assistant'; 
  text: string; 
  image?: string;
  visualization?: D3VisualizationData | null;
  showVisualization?: boolean;
  id: string;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function Chatbox({ onSubmit, onStartConversation, onReset, isLoggedIn = false, onLoginRequest, variant = "desktop" }: Props) {
  const [text, setText] = useState("");
  const [model, setModel] = useState("SOLVIX 1.0");
  const [style, setStyle] = useState("해설지");
  const [daily, setDaily] = useState({ used: 0, max: 5 });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationMode, setConversationMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [loadingInterval, setLoadingInterval] = useState<NodeJS.Timeout | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showLoginWarning, setShowLoginWarning] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizingTime, setVisualizingTime] = useState(0);
  const [visualizingInterval, setVisualizingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [visualizingMessageIndex, setVisualizingMessageIndex] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileWrapperRef = useRef<HTMLDivElement | null>(null);

  const handleCopy = async (value: string, messageId?: string) => {
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      if (messageId) {
        setCopiedMessageId(messageId);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
          setCopiedMessageId((current) => (current === messageId ? null : current));
        }, 1000);
      }
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (isMobile) {
      requestAnimationFrame(() => {
        mobileWrapperRef.current?.scrollTo({ top: mobileWrapperRef.current.scrollHeight, behavior: "smooth" });
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowModelDropdown(false);
        setShowStyleDropdown(false);
      }
    };

    if (showModelDropdown || showStyleDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showModelDropdown, showStyleDropdown]);

  const handleImagePick = () => fileInput.current?.click();
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImage(f);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleSubmit = async () => {
    if (!text && !image) return;
    
    // Check if user is logged in
    if (!isLoggedIn) {
      setShowLoginWarning(true);
      return;
    }
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    onSubmit?.({ text, image, model, style });
    const form = new FormData();
    form.append("text", text);
    form.append("model", model);
    form.append("style", style);
    // Send conversation history for context
    form.append("conversation", JSON.stringify(messages));
    if (image) form.append("image", image);
    const useGenAi = (process.env.NEXT_PUBLIC_USE_GENAI || "").toLowerCase() === "true";
    const endpoint = useGenAi ? "/api/vertex/send/route_second" : "/api/vertex/send";
    
    // Start loading state
    setIsLoading(true);
    setLoadingTime(0);
    setConversationMode(true);
    onStartConversation?.();
    
    // Add user message with image if present
    const userMessageBase = { role: 'user' as const, text };
    if (image) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setMessages((m) => [...m, { ...userMessageBase, image: imageData, id: generateId() }]);
      };
      reader.readAsDataURL(image);
    } else {
      setMessages((m) => (m.length === 0 ? [{ ...userMessageBase, id: generateId() }] : [...m, { ...userMessageBase, id: generateId() }]));
    }
    
    // Clear chatbox immediately
    setText("");
    setImage(null);
    setImagePreview(null);
    if (fileInput.current) fileInput.current.value = "";
    
    // Start loading timer
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    setLoadingInterval(interval);
    
    try {
      const res = await fetch(endpoint, { 
        method: "POST", 
        body: form,
        signal: controller.signal 
      });
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }
      
      const data = await res.json().catch(() => ({}));
      const answer = data?.text ?? "";
      const normalizedAnswer = typeof answer === "string" ? answer.replace(/\\\\/g, "\\") : "";
      if (normalizedAnswer) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: normalizedAnswer, showVisualization: false, visualization: null, id: generateId() },
        ]);
      }
      setDaily((d) => ({ ...d, used: Math.min(d.used + 1, d.max) }));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error("Error:", error);
    } finally {
      if (interval) {
        clearInterval(interval);
        setLoadingInterval(null);
      }
      setIsLoading(false);
      setLoadingTime(0);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    // Abort the ongoing request
    if (abortController) {
      abortController.abort();
    }
    
    // Clear loading interval
    if (loadingInterval) {
      clearInterval(loadingInterval);
      setLoadingInterval(null);
    }
    
    // Reset all states to initial
    setIsLoading(false);
    setLoadingTime(0);
    setConversationMode(false);
    setMessages([]);
    setAbortController(null);
    
    // Reset hero state to show buttons again
    onReset?.();
  };

  // 시각화 요청 함수
  const handleVisualize = async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant') return;

    // 시각화 로딩 시작
    setIsVisualizing(true);
    setVisualizingTime(0);
    setVisualizingMessageIndex(messageIndex);
    
    // 시각화 타이머 시작
    const interval = setInterval(() => {
      setVisualizingTime(prev => prev + 1);
    }, 1000);
    setVisualizingInterval(interval);

    try {
      const response = await fetch('/api/vertex/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message.text,
          model,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        const status = response.status;
        const details = typeof data === "object" && data ? data.details ?? data.error ?? "" : "";
        const raw = typeof data === "object" && data ? data.rawResponse ?? "" : "";
        const messageText = [
          `시각화 요청 실패 (status: ${status})`,
          details ? `details: ${details}` : null,
          raw ? `rawResponse: ${raw}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        throw new Error(messageText || `Visualization request failed: ${status}`);
      }

      const visualization = data?.visualization ?? null;
      const success = Boolean(data?.success) && visualization;

      setMessages(prevMessages =>
        prevMessages.map((msg, idx) =>
          idx === messageIndex
            ? {
                ...msg,
                visualization: success ? visualization : null,
                showVisualization: success,
              }
            : msg
        )
      );

      if (!success) {
        console.warn("Visualization generation returned no data", data);
        alert('시각화 데이터를 생성할 수 없습니다. 다른 문제로 다시 시도해 주세요.');
      }
    } catch (error: any) {
      console.error('Visualization error:', error);
      const message = typeof error?.message === "string" && error.message.length > 0
        ? error.message
        : '시각화 생성에 실패했습니다.';
      alert(message);
      setMessages(prevMessages =>
        prevMessages.map((msg, idx) =>
          idx === messageIndex
            ? { ...msg, visualization: null, showVisualization: false }
            : msg
        )
      );
    } finally {
      // 시각화 로딩 종료
      if (interval) {
        clearInterval(interval);
        setVisualizingInterval(null);
      }
      setIsVisualizing(false);
      setVisualizingTime(0);
      setVisualizingMessageIndex(null);
    }
  };

  const isMobile = variant === "mobile";

  const containerClasses = isMobile
    ? "rounded-[16px] border border-[#F0F2F5] bg-white shadow-[0_2px_4px_rgba(25,33,61,0.08)] p-4"
    : "absolute left-[171px] top-[490px] w-[858px] h-[124px] rounded-[16px] border border-[#F0F2F5] bg-white shadow-[0_2px_4px_rgba(25,33,61,0.08)]";

  const textareaClasses = isMobile
    ? "w-full resize-none rounded-[12px] bg-transparent p-3 text-sm text-[#111] placeholder:text-[#666F8D] outline-none"
    : "absolute left-[31px] top-[23px] right-[29px] bottom-[56px] resize-none outline-none text-[15px] leading-[1.5] text-black placeholder:text-[#666F8D]";

  const bottomBarClasses = isMobile
    ? "mt-3 flex items-center justify-between"
    : "absolute left-[29px] bottom-[11px] right-[29px] flex items-center justify-between";

  const dailyUsageClasses = isMobile ? "text-[11px] text-[#666F8D]" : "text-[12px] text-[#666F8D]";

  const sendButtonClasses = isMobile ? "cursor-pointer" : "cursor-pointer relative -translate-y-[2px]";

  const imagePreviewClasses = isMobile
    ? "absolute right-3 -top-20 w-[64px] h-[64px] rounded-[12px] border border-[#F0F2F5] bg-white shadow-lg overflow-hidden"
    : "absolute left-[171px] top-[410px] w-[70px] h-[70px] rounded-[12px] border border-[#F0F2F5] bg-white shadow-[0_2px_4px_rgba(25,33,61,0.08)] overflow-hidden";

  const removeButtonClasses = isMobile
    ? "absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[14px]"
    : "absolute top-[2px] right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center text-[15px] hover:bg-black/70 cursor-pointer";

  const wrapperClasses = isMobile ? "relative" : "";
  const bubbleStyles = isMobile
    ? { user: "bg-[#E9F3FF] text-[#0A1625]", assistant: "bg-white text-[#111] border border-[#E1E6F0]" }
    : { user: "bg-[#262626]", assistant: "bg-[#141414] border border-white/10" };
  const bubbleBaseClasses = isMobile ? "px-4 py-3 rounded-[14px]" : "px-4 py-3 rounded-[10px]";
  const messageOuterClass = isMobile ? "inline-block max-w-full" : "inline-block max-w-[90%]";
  const loadingOuterClass = isMobile ? "inline-block max-w-full" : "inline-block max-w-[80%]";
  const messageTextClass = isMobile ? "text-[13px] leading-[1.6] whitespace-pre-wrap" : "text-sm whitespace-pre-wrap";
  const copyButtonClass = isMobile
    ? "inline-flex items-center gap-1 text-xs text-[#0075DC] hover:text-[#005bb5] transition-colors"
    : "inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors";
  const copyToastClass = isMobile
    ? "absolute -top-7 right-0 px-2 py-1 text-[11px] rounded bg-[#0075DC] text-white shadow animate-fade-in-out"
    : "absolute -top-7 right-0 px-2 py-1 text-[11px] rounded bg-blue-600/95 text-white shadow animate-fade-in-out";
  const conversationContainerClasses = isMobile
    ? "mt-5 max-h-[320px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-[#BFD4F0] scrollbar-track-transparent"
    : "absolute left-[171px] top-[130px] w-[858px] h-[320px] text-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800";
  const conversationInnerClasses = isMobile ? "flex flex-col gap-4" : "flex flex-col gap-4 p-4";
  const loadingOverlayClasses = isMobile
    ? "fixed inset-0 bg-black/75 backdrop-blur-sm flex flex-col z-50 px-5 py-8"
    : "absolute left-[171px] top-[130px] w-[858px] h-[320px] bg-black/80 backdrop-blur-sm rounded-lg";
  const loadingHistoryClasses = isMobile
    ? "flex-1 overflow-y-auto flex flex-col gap-4 w-full"
    : "flex flex-col gap-4 p-4 h-full overflow-y-auto";
  const loadingContainerClasses = isMobile
    ? "flex flex-col items-center justify-center mt-6"
    : "flex flex-col items-center justify-center mt-4";
  const loadingTextClass = isMobile ? "text-white text-base mb-2" : "text-white text-lg mb-2";
  const loadingTimeClass = isMobile ? "text-gray-200 text-sm mb-4" : "text-gray-300 text-sm mb-4";
  const loadingCancelButtonClass = isMobile
    ? "bg-[#007ABE] hover:bg-[#006599] text-white px-5 py-2 rounded-lg transition-colors"
    : "bg-[#007ABE] hover:bg-[#006599] text-white px-6 py-2 rounded-lg transition-colors";
  const spinnerWrapperClass = isMobile ? "flex space-x-1 mb-4" : "flex space-x-1 mb-4";
  const spinnerDotStyle = isMobile ? "w-2 h-2 bg-white rounded-full animate-bounce" : "w-2 h-2 bg-white rounded-full animate-bounce";
  const visualizationDimensions = isMobile ? { width: 320, height: 220 } : { width: 750, height: 400 };

  return (
    <div className={wrapperClasses}>
      {/* Image preview overlay */}
      {imagePreview && (
        <div className={imagePreviewClasses}>
          <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
          <button onClick={handleRemoveImage} className={removeButtonClasses}>×</button>
        </div>
      )}

      <div className={containerClasses}
        onClick={() => {
          if (isMobile) {
            mobileWrapperRef.current?.scrollTo({ top: mobileWrapperRef.current.scrollHeight, behavior: "smooth" });
          }
        }}
      >
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        {/* text input area */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="문제 사진만 올려도 OK! 추가 질문도 입력해보세요"
          className={textareaClasses}
          rows={isMobile ? 4 : undefined}
        />
        {/* bottom actions */}
        <div className={bottomBarClasses}>
          <div className="flex items-center gap-2">
            {/* full-SVG buttons per design */}
            <button
              onClick={handleImagePick}
              aria-label="이미지 첨부"
              className="cursor-pointer"
            >
              <img 
                src={image ? "/assets/desktop/chat-input-image-1.svg" : "/assets/desktop/chat-input-image.svg"} 
                alt="이미지 첨부" 
                width={isMobile ? 62 : 78}
                height={isMobile ? 34 : 42}
              />
            </button>
            
            {/* Model Select with Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowModelDropdown(!showModelDropdown);
                  setShowStyleDropdown(false);
                }} 
                aria-label="모델 선택" 
                className="cursor-pointer"
              >
                <img src="/assets/desktop/chat-model-select.svg" alt="모델 선택" width={isMobile ? 110 : 130} height={isMobile ? 30 : 34} />
              </button>
              {showModelDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setModel("SOLVIX 1.0");
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${model === "SOLVIX 1.0" ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                  >
                    <img src="/assets/desktop/brain_icon.svg" alt="SOLVIX 1.0" className="w-6 h-6" />
                    <span className="font-medium">SOLVIX 1.0</span>
                  </button>
                  <button
                    disabled
                    className="w-full px-4 py-3 text-left flex items-center gap-2 opacity-40 cursor-not-allowed text-gray-400"
                  >
                    <img src="/assets/desktop/wing_icon_blue.png" alt="SOLVIX 1.0 LITE" className="w-6 h-6" />
                    <span className="font-medium">SOLVIX 1.0 LITE</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Style Select with Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowStyleDropdown(!showStyleDropdown);
                  setShowModelDropdown(false);
                }} 
                aria-label="해설 스타일" 
                className="cursor-pointer"
              >
                <img src="/assets/desktop/chat-style-select.svg" alt="해설 스타일" width={isMobile ? 88 : 101} height={isMobile ? 28 : 34} />
              </button>
              {showStyleDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setStyle("해설지");
                      setShowStyleDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${style === "해설지" ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"}`}
                  >
                    <img src="/assets/desktop/three_line_icon.svg" alt="해설지" className="w-5 h-5" />
                    <span>해설지</span>
                  </button>
                  <button
                    disabled
                    className="w-full px-4 py-3 text-left flex items-center gap-2 opacity-40 cursor-not-allowed text-gray-400"
                  >
                    <img src="/assets/desktop/teacher_icon.png" alt="과외 선생님" className="w-5 h-5" />
                    <span>과외 선생님</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={dailyUsageClasses}>
              하루 이용 횟수 {daily.used}/{daily.max}
            </div>
            <button onClick={handleSubmit} className={sendButtonClasses}>
              <img src="/assets/desktop/chat-send-button.svg" alt="전송" width={isMobile ? 30 : 42} height={isMobile ? 30 : 42} />
            </button>
          </div>
        </div>
      </div>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute left-[171px] top-[130px] w-[858px] h-[320px] bg-black/80 backdrop-blur-sm rounded-lg">
          {/* Show conversation history */}
          <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
            <div className="flex flex-col gap-4 w-full">
              {messages.map((m, i) => (
                <div key={m.id ?? i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <div className={`inline-block max-w-[80%] px-4 py-3 rounded-[10px] ${m.role === 'user' ? 'bg-[#262626]' : 'bg-[#141414] border border-white/10'}`}>
                    {m.image && (
                      <div className="mb-2">
                        <img src={m.image} alt="attached" className="max-w-[200px] max-h-[150px] object-contain rounded" />
                      </div>
                    )}
                    <MathRenderer text={m.text} className="text-sm whitespace-pre-wrap" />
                    {m.role === 'assistant' && (
                      <div className="mt-2 flex justify-end items-center gap-2 text-right relative">
                        {copiedMessageId === m.id && (
                          <span className="absolute -top-7 right-0 px-2 py-1 text-[11px] rounded bg-blue-600/95 text-white shadow animate-fade-in-out">
                            복사가 완료되었습니다!
                          </span>
                        )}
                        <button
                          onClick={() => handleCopy(m.text, m.id)}
                          className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          복사
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator at the bottom */}
              <div className="flex flex-col items-center justify-center mt-4">
                <div className="flex space-x-1 mb-4">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="text-white text-lg mb-2">답변을 작성 중이에요...</p>
                <p className="text-gray-300 text-sm mb-4">소요시간 {loadingTime}초</p>
                <button 
                  onClick={handleCancel}
                  className="bg-[#007ABE] hover:bg-[#006599] text-white px-6 py-2 rounded-lg transition-colors"
                >
                  취소
                </button>
              </div>
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Messages list (conversation) - Fixed height scrollable area */}
      {conversationMode && !isLoading && (
        <div className="absolute left-[171px] top-[130px] w-[858px] h-[320px] text-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          <div className="flex flex-col gap-4 p-4">
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className="inline-block max-w-[90%]">
                  <div className={`px-4 py-3 rounded-[10px] ${m.role === 'user' ? 'bg-[#262626]' : 'bg-[#141414] border border-white/10'}`}>
                    {m.image && (
                      <div className="mb-2">
                        <img src={m.image} alt="attached" className="max-w-[200px] max-h-[150px] object-contain rounded" />
                      </div>
                    )}
                    <MathRenderer text={m.text} className="text-sm whitespace-pre-wrap" />
                    {m.role === 'assistant' && (
                      <div className="mt-2 flex justify-end items-center gap-2 text-right relative">
                        {copiedMessageId === m.id && (
                          <span className="absolute -top-7 right-0 px-2 py-1 text-[11px] rounded bg-blue-600/95 text-white shadow animate-fade-in-out">
                            복사가 완료되었습니다!
                          </span>
                        )}
                        <button
                          onClick={() => handleCopy(m.text, m.id)}
                          className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          복사
                        </button>
                      </div>
                    )}
                    {m.image && (
                      <div className="mb-2">
                        <img src={m.image} alt="attached" className="max-w-[200px] max-h-[150px] object-contain rounded" />
                      </div>
                    )}
                  </div>
                  
                  {/* 시각화 버튼 및 시각화 (AI 답변에만 표시) */}
                  {m.role === 'assistant' && (
                    <div className="mt-2">
                      {isVisualizing && visualizingMessageIndex === i ? (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span>시각화 중... {visualizingTime}초</span>
                        </div>
                      ) : !m.showVisualization ? (
                        <button
                          onClick={() => handleVisualize(i)}
                          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                          disabled={isVisualizing}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          시각화
                        </button>
                      ) : m.visualization ? (
                        <div className="mt-2">
                          <D3Visualization 
                            visualData={m.visualization} 
                            width={750}
                            height={400}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Login Warning Popup */}
      <LoginWarningPopup
        isOpen={showLoginWarning}
        onClose={() => setShowLoginWarning(false)}
        onLogin={() => {
          setShowLoginWarning(false);
          onLoginRequest?.();
        }}
      />
    </div>
  );
}

