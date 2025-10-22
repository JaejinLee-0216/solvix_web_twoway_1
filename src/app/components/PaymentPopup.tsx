const PLAN_DETAILS = {
  basic: {
    name: "Basic",
    price: "무료",
    description: "기본 문제 풀이 기능",
    features: ["하루 5회 문제 풀이", "기본 해설 제공", "이메일 지원"],
  },
  pro: {
    name: "Pro",
    price: "월 29,000원",
    description: "고급 문제 풀이 및 첨삭",
    features: ["무제한 문제 풀이", "상세 해설 및 첨삭", "우선 지원", "고급 분석 도구"],
  },
  ultra: {
    name: "Ultra",
    price: "월 39,000원",
    description: "최고급 AI 튜터링",
    features: ["무제한 모든 기능", "1:1 맞춤 학습", "전화 지원", "개인 학습 계획", "성적 분석 리포트"],
  },
} as const;

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  planType: "basic" | "pro" | "ultra";
}

export default function PaymentPopup({ isOpen, onClose, planType }: PaymentPopupProps) {
  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[planType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="w-full max-w-[320px] rounded-[20px] border border-white/12 bg-[#0F1623] px-5 py-5 text-white shadow-[0_20px_60px_rgba(3,8,20,0.6)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Checkout</p>
            <h2 className="mt-1.5 text-[20px] font-semibold">결제하기</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/16 hover:text-white"
            aria-label="닫기"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#151F2D] p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-[#76C7FF]">{currentPlan.name}</span>
            <span className="text-[11px] text-white/45">월 구독</span>
          </div>
          <div className="mt-1.5 flex items-end gap-1">
            <span className="text-[22px] font-bold tracking-tight">{currentPlan.price}</span>
            <span className="text-[11px] text-white/50">/ VAT 포함</span>
          </div>
          <p className="mt-2 text-[11px] leading-[1.5] text-white/70">{currentPlan.description}</p>

          <ul className="mt-3 space-y-1.5">
            {currentPlan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[11px] text-white/80">
                <span className="mt-[1px] text-[#82FFB5] material-symbols-rounded text-[15px]">check</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 space-y-2.5">
          <h3 className="text-[13px] font-semibold text-white/80">결제 방법</h3>
          {[
            { id: "kakao", label: "카카오페이", badge: "카", color: "bg-[#FFCD00] text-[#1C1C1C]" },
            { id: "naver", label: "네이버페이", badge: "N", color: "bg-[#0B5FFF] text-white" },
            { id: "card", label: "신용카드", badge: "C", color: "bg-white/10 text-white" },
          ].map((method) => (
            <button
              key={method.id}
              className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-[#121B29] px-3.5 py-2.5 text-left transition hover:border-white/25"
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${method.color}`}>
                  {method.badge}
                </span>
                <span className="text-[12px] text-white/85">{method.label}</span>
              </div>
              <span className="material-symbols-rounded text-[16px] text-white/35">chevron_right</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/20 bg-white/5 py-2.5 text-[12px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            취소
          </button>
          <button
            onClick={() => {
              alert(`${currentPlan.name} 플랜 결제가 진행됩니다. (포트원 연동 예정)`);
              onClose();
            }}
            className="flex-1 rounded-full bg-[#3BA7FF] py-2.5 text-[12px] font-semibold text-[#061120] shadow-[0_10px_24px_rgba(59,167,255,0.32)] transition hover:bg-[#2F8ED6]"
          >
            결제하기
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-white/38">* 포트원(PortOne) 결제 시스템 연동 예정</p>
      </div>
    </div>
  );
}
