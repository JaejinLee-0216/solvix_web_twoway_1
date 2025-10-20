"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import MathRenderer from "./MathRenderer";
import LoginWarningPopup from "./LoginWarningPopup";
import D3Visualization, { VisualizationData as D3VisualizationData } from "./D3Visualization";

type Props = {
  onSubmit?: (payload: { text: string; images: File[]; model: string; style: string }) => void;
  onStartConversation?: () => void;
  onReset?: () => void;
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
  variant?: "desktop" | "mobile";
  onImageAttached?: (attached: boolean) => void;
  offsetY?: number;
  controlsOffsetY?: number;
  imageButtonOffsetY?: number;
  modelButtonOffsetY?: number;
  usageBlockOffsetY?: number;
  sendButtonOffsetY?: number;
  conversationOffsetY?: number;
};

export type ChatboxHandle = {
  attachImage: (file: File) => void;
  attachImages: (files: FileList | File[]) => void;
  focusInput: () => void;
  resetConversation: () => void;
  loadConversation?: (sessionId: string) => Promise<void>;
};

type Message = {
  role: 'user' | 'assistant';
  text: string;
  images?: string[];
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

const MAX_IMAGES = 5;
const SOLVIX_MAIN_MODEL = "SOLVIX 1.0";
const SOLVIX_LITE_MODEL = "SOLVIX 1.0 LITE";

const getAttachmentIndicatorSrc = (count: number) => {
  const clamped = Math.min(Math.max(count, 0), MAX_IMAGES);
  if (clamped === 0) {
    return "/assets/desktop/chat-input-image.svg";
  }
  return `/assets/desktop/chat-input-image-${clamped}.svg`;
};

const Chatbox = forwardRef<ChatboxHandle, Props>(
function Chatbox(
  {
    onSubmit,
    onStartConversation,
    onReset,
    isLoggedIn = false,
    onLoginRequest,
    variant = "desktop",
    onImageAttached,
    offsetY = 0,
    controlsOffsetY = 0,
    imageButtonOffsetY = 0,
    modelButtonOffsetY = 0,
    usageBlockOffsetY = 0,
    sendButtonOffsetY = 0,
    conversationOffsetY = 0,
  }: Props,
  ref
) {
  const [text, setText] = useState("");
  const [model, setModel] = useState(SOLVIX_MAIN_MODEL);
  const style = "해설지";
  const [daily, setDaily] = useState({ used: 0, free: 0, bonus: 0, unlimited: false });
  const [dailyLoading, setDailyLoading] = useState(false);
  const [usageReady, setUsageReady] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imagesRef = useRef<File[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationMode, setConversationMode] = useState(false);
  const [sessionId, setSessionId] = useState<string>(generateId());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [loadingInterval, setLoadingInterval] = useState<NodeJS.Timeout | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showLoginWarning, setShowLoginWarning] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizingTime, setVisualizingTime] = useState(0);
  const [visualizingMessageIndex, setVisualizingMessageIndex] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileWrapperRef = useRef<HTMLDivElement | null>(null);

  const applyUsage = useCallback((usage: any) => {
    const usedPool = [usage?.usedToday, usage?.used, usage?.daily_count]
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const used = usedPool.length > 0 ? Math.max(...usedPool, 0) : 0;

    const freePool = [usage?.freeDaily, usage?.free, usage?.totalAllowance]
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    const remainingFreeRaw = typeof usage?.remainingFree === "number"
      ? usage.remainingFree
      : typeof usage?.remaining_free === "number"
        ? usage.remaining_free
        : null;

    let free = freePool.length > 0 ? Math.max(...freePool, 0) : 0;
    if (remainingFreeRaw != null && Number.isFinite(remainingFreeRaw)) {
      free = Math.max(used + Math.max(remainingFreeRaw, 0), 0);
    }

    const bonusRaw = typeof usage?.bonusBalance === "number"
      ? usage.bonusBalance
      : typeof usage?.bonus_balance === "number"
        ? usage.bonus_balance
        : null;
    const bonus = bonusRaw != null && Number.isFinite(bonusRaw) ? Math.max(bonusRaw, 0) : 0;

    const unlimited = Boolean(usage?.unlimited ?? usage?.isUnlimited);

    setDaily({ used, free, bonus, unlimited });
  }, []);

  const fetchUsage = useCallback(async () => {
    if (!isLoggedIn) {
      setDaily({ used: 0, free: 0, bonus: 0, unlimited: false });
      setUsageReady(true);
      return;
    }

    try {
      setDailyLoading(true);

      const response = await fetch("/api/usage", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        if (response.status === 404) {
          setDaily({ used: 0, free: 0, bonus: 0, unlimited: false });
          setUsageReady(true);
          return;
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("Usage error", { status: response.status, payload: errorPayload ?? null });
        }
        setUsageReady(true);
        return;
      }

      const payload = await response.json();
      applyUsage(payload?.usage ?? {});
      setUsageReady(true);
    } catch (error) {
      console.error("Failed to fetch usage", error);
      setUsageReady(true);
    } finally {
      setDailyLoading(false);
    }
  }, [applyUsage, isLoggedIn]);

  const updateImageAttachedState = useCallback((nextCount: number) => {
    onImageAttached?.(nextCount > 0);
  }, [onImageAttached]);

  useEffect(() => {
    updateImageAttachedState(images.length);
  }, [images, updateImageAttachedState]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    previewUrlsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  const resetImagesState = useCallback(() => {
    imagesRef.current = [];
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setImages([]);
    setImagePreviews([]);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }, []);

  const clearConversationState = useCallback((options?: { notifyParent?: boolean; sessionId?: string }) => {
    setIsLoading(false);
    setLoadingTime(0);
    setConversationMode(false);
    setMessages([]);
    setAbortController(null);
    resetImagesState();
    setIsVisualizing(false);
    setVisualizingTime(0);
    setVisualizingMessageIndex(null);
    setCopiedMessageId(null);
    setSessionId(options?.sessionId ?? generateId());
    if (options?.notifyParent) {
      onReset?.();
    }
  }, [onReset, resetImagesState]);

  const resetConversationState = useCallback(() => {
    clearConversationState({ notifyParent: true });
  }, [clearConversationState]);

  const applyImageFiles = useCallback((incomingFiles: FileList | File[]) => {
    const filesArray = Array.from(incomingFiles).filter((item): item is File =>
      item instanceof File && item.size > 0
    );

    if (filesArray.length === 0) {
      return;
    }

    const currentImages = imagesRef.current;
    const availableSlots = MAX_IMAGES - currentImages.length;

    if (availableSlots <= 0) {
      return;
    }

    const acceptedFiles = filesArray.slice(0, availableSlots);

    if (acceptedFiles.length === 0) {
      return;
    }

    const nextImages = [...currentImages, ...acceptedFiles];
    const newPreviewUrls = acceptedFiles.map((file) => URL.createObjectURL(file));
    const nextPreviews = [...previewUrlsRef.current, ...newPreviewUrls];

    imagesRef.current = nextImages;
    previewUrlsRef.current = nextPreviews;
    setImages(nextImages);
    setImagePreviews(nextPreviews);
  }, []);

  useImperativeHandle(ref, () => ({
    attachImage: (file: File) => {
      if (!file) return;
      applyImageFiles([file]);
    },
    attachImages: (files: FileList | File[]) => {
      applyImageFiles(files);
    },
    focusInput: () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const value = textareaRef.current.value;
        textareaRef.current.setSelectionRange(value.length, value.length);
      }
    },
    resetConversation: resetConversationState,
    loadConversation: async (sessionId: string) => {
      if (!sessionId || sessionId.length === 0) {
        alert('대화 세션 정보를 찾을 수 없습니다.');
        return Promise.reject(new Error('Invalid session id'));
      }

      clearConversationState({ notifyParent: false, sessionId });

      try {
        const res = await fetch(`/api/mypage/conversations/${sessionId}`, { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`Failed to fetch conversation (${res.status})`);
        }
        const data = await res.json();
        const history = Array.isArray(data?.messages) ? data.messages : [];
        const mapped = history.map((entry: any, index: number) => ({
          id: entry.id ?? `restored-${index}`,
          role: entry.role === 'assistant' ? 'assistant' : 'user',
          text: typeof entry.text === 'string' ? entry.text : '',
          images: Array.isArray(entry.images) ? entry.images.filter((img: unknown) => typeof img === 'string') : [],
          showVisualization: Boolean(entry.visualization),
          visualization: entry.visualization ?? null,
        }));
        setMessages(mapped);
        setConversationMode(true);
        onStartConversation?.();
      } catch (error) {
        console.error('Failed to load conversation history:', error);
        alert('대화 내역을 불러올 수 없습니다. 다시 시도해 주세요.');
        throw error;
      }
    },
  }), [applyImageFiles, clearConversationState, onStartConversation]);

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
    fetchUsage();
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [fetchUsage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleUsageUpdated = () => {
      fetchUsage();
    };

    window.addEventListener("usage-updated", handleUsageUpdated);

    return () => {
      window.removeEventListener("usage-updated", handleUsageUpdated);
    };
  }, [fetchUsage]);

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
    if (!showModelDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showModelDropdown]);

  const handleImagePick = () => fileInput.current?.click();
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      applyImageFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      imagesRef.current = next;
      return next;
    });
    setImagePreviews((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target);
      }
      const next = prev.filter((_, i) => i !== index);
      previewUrlsRef.current = next;
      return next;
    });
  };

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText && images.length === 0) return;

    // Check if user is logged in
    if (!isLoggedIn) {
      setShowLoginWarning(true);
      return;
    }

    if (!usageReady) {
      if (!dailyLoading) {
        fetchUsage();
      }
      alert("일일 사용량 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const totalAllowance = daily.unlimited
      ? Number.POSITIVE_INFINITY
      : Math.max(daily.free + daily.bonus, daily.used);
    if (!daily.unlimited && daily.used >= totalAllowance) {
      alert("일일 질문 횟수를 초과했습니다. 내일 다시 시도하거나 플랜을 업그레이드하세요.");
      return;
    }

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    onSubmit?.({ text: trimmedText, images, model, style });
    const form = new FormData();
    form.append("text", trimmedText);
    form.append("model", model);
    form.append("style", style);
    form.append("sessionId", sessionId);
    // Send conversation history for context
    form.append("conversation", JSON.stringify(messages));
    images.forEach((file) => {
      form.append("images", file);
    });
    const useGenAi = (process.env.NEXT_PUBLIC_USE_GENAI || "").toLowerCase() === "true";
    const endpoint = model === SOLVIX_LITE_MODEL
      ? "/api/gemini/send"
      : useGenAi
        ? "/api/vertex/send/route_second"
        : "/api/vertex/send";
    
    // Start loading state
    setIsLoading(true);
    setLoadingTime(0);
    setConversationMode(true);
    onStartConversation?.();
    
    // Add user message with image if present
    const userMessageBase = { role: "user" as const, text: trimmedText };
    if (images.length > 0) {
      Promise.all(images.map((file) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) ?? "");
        reader.onerror = () => reject(new Error("Failed to load image preview"));
        reader.readAsDataURL(file);
      }))).then((imageDataList) => {
        setMessages((m) => [
          ...m,
          {
            ...userMessageBase,
            images: imageDataList,
            id: generateId(),
          },
        ]);
      }).catch((error) => {
        console.error("Failed to attach images to message", error);
        setMessages((m) => (m.length === 0 ? [{ ...userMessageBase, id: generateId() }] : [...m, { ...userMessageBase, id: generateId() }]));
      });
    } else {
      setMessages((m) => (m.length === 0 ? [{ ...userMessageBase, id: generateId() }] : [...m, { ...userMessageBase, id: generateId() }]));
    }
    
    // Clear chatbox immediately
    setText("");
    resetImagesState();
    updateImageAttachedState(0);
    
    // Start loading timer
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    setLoadingInterval(interval);
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = typeof data?.error === "string" && data.error.length > 0 ? data.error : "응답을 가져오지 못했습니다.";
        throw new Error(message);
      }

      const answer = data?.text ?? "";
      const normalizedAnswer = typeof answer === "string" ? answer.replace(/\\\\/g, "\\") : "";
      if (normalizedAnswer) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: normalizedAnswer, showVisualization: false, visualization: null, id: generateId() },
        ]);
      }

      try {
        const usageRes = await fetch("/api/usage", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ increment: 1 }),
        });
        const usagePayload = await usageRes.json().catch(() => ({}));

        if (usageRes.ok) {
          applyUsage(usagePayload?.usage ?? {});
        } else if (usageRes.status === 429) {
          applyUsage(usagePayload?.usage ?? {});
          alert("일일 질문 횟수를 모두 사용했습니다. 내일 다시 시도하거나 플랜을 업그레이드하세요.");
        } else {
          console.warn("Failed to update usage", usagePayload);
        }
      } catch (usageError) {
        console.error("Usage update failed", usageError);
      }
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
    
    resetConversationState();
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
      }
      setIsVisualizing(false);
      setVisualizingTime(0);
      setVisualizingMessageIndex(null);
    }
  };

  const isMobile = variant === "mobile";
  const desktopContainerStyle = !isMobile ? { top: 620 } : undefined;
  const desktopPreviewStyle = !isMobile ? { top: 540 } : undefined;
  const desktopOverlayStyle = !isMobile ? { top: 260 } : undefined;
  const desktopConversationStyle = !isMobile ? { top: 260 } : undefined;

  const containerClasses = isMobile
    ? "rounded-[16px] border border-[#F0F2F5] bg-white shadow-[0_2px_4px_rgba(25,33,61,0.08)] px-3 py-2 flex flex-col gap-1"
    : "absolute left-[171px] w-[858px] h-[160px] rounded-[16px] border border-[#F0F2F5] bg-white shadow-[0_2px_4px_rgba(25,33,61,0.08)] flex flex-col";

  const textareaClasses = isMobile
    ? "h-[30px] w-full resize-none rounded-[12px] bg-transparent px-2 pt-2 text-[12px] text-[#111] placeholder:text-[#8090AF] outline-none"
    : "flex-1 resize-none rounded-[12px] bg-transparent px-6 pt-5 pb-3 text-[15px] leading-[1.5] text-black placeholder:text-[#666F8D] outline-none";

  const bottomBarClasses = isMobile
    ? "flex items-center justify-between"
    : "px-6 pb-4 flex items-center justify-between";

  const dailyUsageClasses = isMobile ? "text-[8px] text-[#8090AF]" : "text-[12px] text-[#666F8D]";

  const sendButtonClasses = isMobile ? "cursor-pointer" : "cursor-pointer relative -translate-y-[2px]";

  const draftsWrapperClasses = isMobile
    ? "flex items-center gap-2"
    : "flex items-center gap-3";

  const imagePreviewClasses = isMobile
    ? "relative w-[64px] h-[64px] rounded-[12px] border border-[#F0F2F5]/40 bg-transparent shadow-lg overflow-hidden"
    : "relative w-[70px] h-[70px] rounded-[12px] border border-[#F0F2F5] bg-white shadow-[0_2px_4px_rgba(25,33,61,0.08)] overflow-hidden";

  const removeButtonClasses = isMobile
    ? "absolute top-1 right-1 p-1 text-white/70 hover:text-white cursor-pointer"
    : "absolute top-[4px] right-[4px] p-1 text-white/70 hover:text-white cursor-pointer";

  const wrapperClasses = isMobile ? "relative" : "";
  const bubbleBaseClasses = isMobile ? "px-3 py-2 rounded-[12px]" : "px-4 py-3 rounded-[10px]";
  const messageOuterClass = isMobile ? "inline-block max-w-full" : "inline-block max-w-[90%]";
  const loadingOuterClass = isMobile ? "inline-block max-w-full" : "inline-block max-w-[80%]";
  const messageTextClass = isMobile ? "text-[11px] leading-[1.6] whitespace-pre-wrap" : "text-sm whitespace-pre-wrap";
  const copyButtonClass = isMobile
    ? "inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
    : "inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors";
  const copyToastClass = isMobile
    ? "absolute -top-7 right-0 px-2 py-1 text-[11px] rounded bg-[#0075DC] text-white shadow animate-fade-in-out"
    : "absolute -top-7 right-0 px-2 py-1 text-[11px] rounded bg-blue-600/95 text-white shadow animate-fade-in-out";
  const conversationContainerClasses = isMobile
    ? "mt-5 max-h-[360px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-[#BFD4F0] scrollbar-track-transparent"
    : "absolute left-[171px] w-[858px] h-[320px] text-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800";
  const conversationInnerClasses = isMobile ? "flex flex-col gap-4 px-2" : "flex flex-col gap-4 p-4";
  const loadingOverlayClasses = isMobile
    ? "absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col z-40 px-6 py-8"
    : "absolute left-[171px] w-[858px] h-[320px] bg-black/80 backdrop-blur-sm rounded-lg";
  const loadingHistoryClasses = isMobile
    ? "flex-1 overflow-y-auto flex flex-col gap-4 w-full"
    : "flex flex-col gap-4 p-4 h-full overflow-y-auto";
  const loadingCancelButtonClass = "bg-[#007ABE] hover:bg-[#006599] text-white rounded-lg transition-colors";
  const visualizationDimensions = isMobile ? { width: 320, height: 220 } : { width: 750, height: 400 };
  const wrapperStyle = offsetY !== 0 ? { transform: `translateY(${offsetY}px)` } : undefined;
  const controlsOffsetStyle = isMobile && !isLoading && controlsOffsetY !== 0 ? { transform: `translateY(${controlsOffsetY}px)` } : undefined;
  const imageAttachmentOffsetStyle = imageButtonOffsetY !== 0 ? { transform: `translateY(${imageButtonOffsetY}px)` } : undefined;
  const modelSelectOffsetStyle = modelButtonOffsetY !== 0 ? { transform: `translateY(${modelButtonOffsetY}px)` } : undefined;
  const usageBlockOffsetStyle = usageBlockOffsetY !== 0 ? { transform: `translateY(${usageBlockOffsetY}px)` } : undefined;
  const sendButtonOffsetStyle = sendButtonOffsetY !== 0 ? { transform: `translateY(${sendButtonOffsetY}px)` } : undefined;
  const mobileImageButtonStyle = isMobile ? imageAttachmentOffsetStyle : undefined;
  const mobileModelButtonStyle = isMobile ? modelSelectOffsetStyle : undefined;
  const mobileUsageBlockStyle = isMobile ? usageBlockOffsetStyle : undefined;
  const mobileSendButtonStyle = isMobile ? sendButtonOffsetStyle : undefined;

  const totalAllowance = daily.unlimited ? Infinity : Math.max(daily.free + daily.bonus, daily.used);

  const extractMessageImages = (msg: Message): string[] => {
    if (Array.isArray(msg.images) && msg.images.length > 0) {
      return msg.images.filter((src): src is string => typeof src === "string" && src.length > 0);
    }
    if (typeof msg.image === "string" && msg.image.length > 0) {
      return [msg.image];
    }
    return [];
  };

  if (isMobile) {

    const renderMobileMessages = () => (
      <>
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {m.role === "user" ? (
              <div className="relative inline-block bg-[#3A404F] text-white px-3 py-2 rounded-[14px] max-w-[82%]">
                {extractMessageImages(m).length > 0 ? (
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    {extractMessageImages(m).map((imgSrc, idx) => (
                      <img key={idx} src={imgSrc} alt={`attached-${idx + 1}`} className="max-w-full max-h-[150px] object-contain rounded" />
                    ))}
                  </div>
                ) : null}
                <MathRenderer text={m.text} className={messageTextClass} colorScheme="dark" />
                <span className="absolute top-1/2 right-[-6px] -translate-y-1/2 w-3 h-3 bg-[#3A404F] rotate-45 rounded-[2px]"></span>
              </div>
            ) : (
              <div className="inline-block max-w-[90%] text-white space-y-2">
                {extractMessageImages(m).length > 0 ? (
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    {extractMessageImages(m).map((imgSrc, idx) => (
                      <img key={idx} src={imgSrc} alt={`attached-${idx + 1}`} className="max-w-full max-h-[150px] object-contain rounded" />
                    ))}
                  </div>
                ) : null}
                <MathRenderer text={m.text} className={messageTextClass} colorScheme="dark" />
                <div className="flex justify-end items-center gap-2 text-right relative">
                  {copiedMessageId === m.id ? <span className={copyToastClass}>복사가 완료되었습니다!</span> : null}
                  <button onClick={() => handleCopy(m.text, m.id)} className={copyButtonClass}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    복사
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {isVisualizing && visualizingMessageIndex === i ? (
                    <div className="flex items-center gap-2 text-xs text-blue-400">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-[#4CB4FF] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#4CB4FF] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-[#4CB4FF] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                      <span>시각화 중... {visualizingTime}초</span>
                    </div>
                  ) : !m.showVisualization ? (
                    <button
                      onClick={() => handleVisualize(i)}
                      className="self-start text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1"
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
                        width={visualizationDimensions.width}
                        height={visualizationDimensions.height}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading ? (
          <div className="flex justify-start">
            <div className={loadingOuterClass}>
              <div className="px-3 py-3 rounded-[14px] bg-[#0B0F18]/80 border border-white/10 inline-flex items-center gap-3">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-white/20" />
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#4CB4FF] border-l-[#4CB4FF]/40 animate-spin" />
                  <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#0A1625] shadow-[0_0_10px_rgba(76,180,255,0.35)]">
                    <img src="/assets/desktop/logo_icon.png" alt="SOLVIX" className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-center items-center">
                  <p className="text-[11px] text-white/80">답변을 작성 중이에요...</p>
                  <p className="text-[10px] text-white/50">소요시간 {loadingTime}초 (평균 45초)</p>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-[10px] text-[#007ABE] underline"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </>
    );

    return (
      <div className="relative" style={wrapperStyle}>
        <div className="space-y-4" style={controlsOffsetStyle}>
          {imagePreviews.length > 0 ? (
            <div className={draftsWrapperClasses}>
              {imagePreviews.map((preview, index) => (
                <div key={index} className={imagePreviewClasses}>
                  <img src={preview} alt={`preview-${index + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => handleRemoveImage(index)} className={`${removeButtonClasses} text-[16px]`} aria-label="이미지 제거">
                    <span className="material-symbols-rounded text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {conversationMode || messages.length > 0 || isLoading ? (
            <div
              ref={mobileWrapperRef}
              className="px-4 pt-4 max-h-[360px] overflow-y-auto space-y-4"
              style={conversationOffsetY && conversationOffsetY !== 0 ? { transform: `translateY(${conversationOffsetY}px)` } : undefined}
            >
              {messages.length === 0 && !isLoading ? (
                <div className="flex flex-col gap-3 text-left text-white/70 text-[12px] leading-relaxed">
                  <p>안녕하세요! SOLVIX가 준비되어 있어요.</p>
                  <p>문제를 업로드하거나 궁금한 내용을 입력하면 바로 도와드릴게요.</p>
                </div>
              ) : null}
              {renderMobileMessages()}
            </div>
          ) : null}

          <div
            className={containerClasses}
            onClick={() => {
              mobileWrapperRef.current?.scrollTo({ top: mobileWrapperRef.current.scrollHeight, behavior: "smooth" });
            }}
          >
            <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="질문을 입력하거나 추가 안내를 적어 주세요"
              className={textareaClasses}
              rows={4}
            />
            <div className={bottomBarClasses}>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleImagePick}
                  aria-label={`이미지 첨부 (${imagePreviews.length}/${MAX_IMAGES})`}
                  className="cursor-pointer"
                  style={mobileImageButtonStyle}
                >
                  <img src={getAttachmentIndicatorSrc(imagePreviews.length)} alt="이미지 첨부" width={62} height={34} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => {
                      setShowModelDropdown(!showModelDropdown);
                    }}
                    aria-label="모델 선택"
                    className="cursor-pointer"
                    style={mobileModelButtonStyle}
                  >
                    <img src="/assets/desktop/chat-model-select.svg" alt="모델 선택" width={110} height={30} />
                  </button>
                  {showModelDropdown ? (
                    <div className="absolute bottom-full left-0 mb-2 w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                      <button
                        onClick={() => {
                          setModel(SOLVIX_MAIN_MODEL);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${model === SOLVIX_MAIN_MODEL ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                      >
                        <img src="/assets/desktop/brain_icon.svg" alt="SOLVIX 1.0" className="w-6 h-6" />
                        <span className="font-medium">SOLVIX 1.0</span>
                      </button>
                      <button
                        onClick={() => {
                          setModel(SOLVIX_LITE_MODEL);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${model === SOLVIX_LITE_MODEL ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                      >
                        <img src="/assets/desktop/wing_icon_blue.png" alt="SOLVIX 1.0 LITE" className="w-6 h-6" />
                        <span className="font-medium">SOLVIX 1.0 LITE</span>
                      </button>
                    </div>
                  ) : null}
                </div>

              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-col items-center leading-tight" style={mobileUsageBlockStyle}>
                  <span className={`${dailyUsageClasses} whitespace-nowrap text-center`}>오늘 이용</span>
                  <span className="text-[11px] font-semibold text-[#0A1625] whitespace-nowrap text-center">
                    {daily.unlimited ? `무제한 (${daily.used}회 사용)` : `${daily.used}/${daily.free + daily.bonus}`}
                  </span>
                  {daily.unlimited ? (
                    <span className="text-[8px] text-[#3A4A65] mt-0.5 whitespace-nowrap">{daily.used}회 사용</span>
                  ) : null}
                </div>
                <button onClick={handleSubmit} className={sendButtonClasses} style={mobileSendButtonStyle}>
                  <img src="/assets/desktop/chat-send-button.svg" alt="전송" width={30} height={30} />
                </button>
              </div>
            </div>
          </div>
        </div>

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

  return (
    <div className={wrapperClasses} style={wrapperStyle}>
      {imagePreviews.length > 0 && (
        <div
          className={`${draftsWrapperClasses} absolute left-[171px]`}
          style={desktopPreviewStyle}
        >
          {imagePreviews.map((preview, index) => (
            <div key={`desktop-preview-${index}`} className={imagePreviewClasses}>
              <img src={preview} alt={`preview-${index + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => handleRemoveImage(index)} className={removeButtonClasses}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div
        className={containerClasses}
        style={desktopContainerStyle}
        onClick={() => {
          if (isMobile) {
            mobileWrapperRef.current?.scrollTo({ top: mobileWrapperRef.current.scrollHeight, behavior: "smooth" });
          }
        }}
      >
        <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
        {/* text input area */}
        <textarea
        ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
        placeholder="질문을 입력하거나 추가 안내를 적어 주세요"
        className={textareaClasses}
        rows={isMobile ? 3 : undefined}
        />
        {/* bottom actions */}
        <div className={bottomBarClasses}>
          <div className="flex items-center gap-2">
            {/* full-SVG buttons per design */}
            <button
              onClick={handleImagePick}
              aria-label={`이미지 첨부 (${imagePreviews.length}/${MAX_IMAGES})`}
              className="cursor-pointer"
              style={imageAttachmentOffsetStyle}
            >
              <img
                src={getAttachmentIndicatorSrc(imagePreviews.length)}
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
                }} 
                aria-label="모델 선택" 
                className="cursor-pointer"
                style={modelSelectOffsetStyle}
              >
                <img src="/assets/desktop/chat-model-select.svg" alt="모델 선택" width={isMobile ? 110 : 130} height={isMobile ? 30 : 34} />
              </button>
              {showModelDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setModel(SOLVIX_MAIN_MODEL);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${model === SOLVIX_MAIN_MODEL ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                  >
                    <img src="/assets/desktop/brain_icon.svg" alt="SOLVIX 1.0" className="w-6 h-6" />
                    <span className="font-medium">SOLVIX 1.0</span>
                  </button>
                  <button
                    onClick={() => {
                      setModel(SOLVIX_LITE_MODEL);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${model === SOLVIX_LITE_MODEL ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                  >
                    <img src="/assets/desktop/wing_icon_blue.png" alt="SOLVIX 1.0 LITE" className="w-6 h-6" />
                    <span className="font-medium">SOLVIX 1.0 LITE</span>
                  </button>
                </div>
              )}
            </div>
            
          </div>
          <div className="flex items-center gap-4">
            <div className={dailyUsageClasses} style={usageBlockOffsetStyle}>
              오늘 이용 {daily.unlimited ? `무제한 (${daily.used}회 사용)` : `${daily.used}/${daily.free + daily.bonus}`}
            </div>
            <button onClick={handleSubmit} className={sendButtonClasses} style={sendButtonOffsetStyle}>
              <img src="/assets/desktop/chat-send-button.svg" alt="전송" width={isMobile ? 30 : 42} height={isMobile ? 30 : 42} />
            </button>
          </div>
        </div>
      </div>
      {/* Loading overlay */}
      {isLoading && (
        <div className={loadingOverlayClasses} style={desktopOverlayStyle}>
          {/* Show conversation history */}
          <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
            <div className="flex flex-col gap-4 w-full">
              {messages.map((m, i) => (
                <div key={m.id ?? i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <div className={`inline-block max-w-[80%] px-4 py-3 rounded-[10px] ${m.role === 'user' ? 'bg-[#262626]' : 'bg-[#141414] border border-white/10'}`}>
                    {extractMessageImages(m).length > 0 ? (
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        {extractMessageImages(m).map((imgSrc, idx) => (
                          <img key={idx} src={imgSrc} alt={`attached-${idx + 1}`} className="max-w-[200px] max-h-[150px] object-contain rounded" />
                        ))}
                      </div>
                    ) : null}
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
              <p className="text-gray-400 text-sm mb-1">평균 45초 소요</p>
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
        <div className={conversationContainerClasses} style={desktopConversationStyle}>
          <div className="flex flex-col gap-4 p-4">
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className="inline-block max-w-[90%]">
                  <div className={`px-4 py-3 rounded-[10px] ${m.role === 'user' ? 'bg-[#262626]' : 'bg-[#141414] border border-white/10'}`}>
                    {extractMessageImages(m).length > 0 ? (
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        {extractMessageImages(m).map((imgSrc, idx) => (
                          <img key={idx} src={imgSrc} alt={`attached-${idx + 1}`} className="max-w-[200px] max-h-[150px] object-contain rounded" />
                        ))}
                      </div>
                    ) : null}
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
                    {extractMessageImages(m).length > 0 ? (
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        {extractMessageImages(m).map((imgSrc, idx) => (
                          <img key={idx} src={imgSrc} alt={`attached-${idx + 1}`} className="max-w-[200px] max-h-[150px] object-contain rounded" />
                        ))}
                      </div>
                    ) : null}
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
});

export default Chatbox;
