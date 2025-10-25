import { useEffect, useState } from "react";

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
    policies: {
      servicePeriod:
        "결제 완료 직후 Pro 플랜 전용 기능이 활성화되며, 결제일 기준 30일 동안 이용할 수 있습니다. 별도 해지 요청이 없으면 동일 조건으로 매월 자동 갱신됩니다.",
      exchangePolicy:
        "디지털 콘텐츠 특성상 타 상품으로의 직접 교환은 제공되지 않습니다. 다른 플랜으로 변경을 원하시면 다음 결제 예정일 전까지 고객센터 또는 마이페이지를 통해 요청해 주세요.",
      refundPolicy:
        "전자상거래법에 따라 결제일로부터 7일 이내 최초 이용(문제 풀이, 첨삭 등) 기록이 없을 경우 전액 환불이 가능합니다. 이용 이력이 있을 경우 남은 기간에 대해 일할 계산으로 부분 환불이 적용됩니다.",
      cancellationPolicy:
        "마이페이지 > 결제 관리에서 언제든 자동 결제를 해지할 수 있으며, 해지 후에도 남은 이용 기간까지는 Pro 플랜 혜택을 사용할 수 있습니다. 다음 결제 예정일 이후에는 신규 청구가 발생하지 않습니다.",
    },
  },
  ultra: {
    name: "Ultra",
    price: "월 39,000원",
    description: "최고급 AI 튜터링",
    features: ["무제한 모든 기능", "1:1 맞춤 학습", "전화 지원", "개인 학습 계획", "성적 분석 리포트"],
    policies: {
      servicePeriod:
        "결제 완료 직후 Ultra 플랜 전용 기능이 활성화되며, 결제일 기준 30일 동안 이용할 수 있습니다. 별도 해지 요청이 없으면 동일 조건으로 매월 자동 갱신됩니다.",
      exchangePolicy:
        "디지털 콘텐츠 특성상 타 상품으로의 직접 교환은 제공되지 않습니다. 플랜 변경을 원하시면 다음 결제 예정일 전까지 고객센터 또는 마이페이지를 통해 요청해 주세요.",
      refundPolicy:
        "전자상거래법에 따라 결제일로부터 7일 이내 최초 이용(문제 풀이, 첨삭, 1:1 질의응답 등) 기록이 없을 경우 전액 환불이 가능합니다. 이용 이력이 있을 경우 남은 기간에 대해 일할 계산으로 부분 환불이 적용됩니다.",
      cancellationPolicy:
        "마이페이지 > 결제 관리에서 언제든 자동 결제를 해지할 수 있으며, 해지 후에도 남은 이용 기간까지는 Ultra 플랜 혜택을 사용할 수 있습니다. 다음 결제 예정일 이후에는 신규 청구가 발생하지 않습니다.",
    },
  },
} as const;

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  planType: "basic" | "pro" | "ultra";
}

export default function PaymentPopup({ isOpen, onClose, planType }: PaymentPopupProps) {
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsPolicyModalOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsPolicyModalOpen(false);
  }, [planType]);

  if (!isOpen) return null;

  const currentPlan = PLAN_DETAILS[planType];
  const policies = currentPlan.policies;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
        <div className="w-full max-w-[300px] max-h-[90vh] overflow-y-auto rounded-[18px] border border-white/12 bg-[#0F1623] px-4 py-4 text-white shadow-[0_18px_54px_rgba(3,8,20,0.55)]">
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
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#151F2D] p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-[#76C7FF]">{currentPlan.name}</span>
            <span className="text-[11px] text-white/45">월 구독</span>
          </div>
          <div className="mt-1.5 flex items-end gap-1">
            <span className="text-[22px] font-bold tracking-tight">{currentPlan.price}</span>
            <span className="text-[11px] text-white/50">/ VAT 포함</span>
          </div>
          <p className="mt-2 text-[11px] leading-[1.5] text-white/70">{currentPlan.description}</p>

          <ul className="mt-3 space-y-1">
            {currentPlan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[11px] text-white/80">
                <span className="mt-[1px] text-[#82FFB5] material-symbols-outlined text-[15px]">check</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          {policies ? (
            <>
              <p className="mt-3 text-[10px] text-white/55">
                결제 시{" "}
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(true)}
                  aria-haspopup="dialog"
                  className="inline bg-transparent border-0 p-0 font-semibold text-[#58A9FF] underline underline-offset-2 transition hover:text-[#7BC1FF] focus-visible:outline-none"
                >
                  환불 정책
                </button>
                에 동의한 것으로 간주합니다.
              </p>
            </>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="text-[13px] font-semibold text-white/80">결제 방법</h3>
          {[
            { id: "kakao", label: "카카오페이", badge: "카", color: "bg-[#FFCD00] text-[#1C1C1C]" },
            { id: "naver", label: "네이버페이", badge: "N", color: "bg-[#0B5FFF] text-white" },
            { id: "card", label: "신용카드", badge: "C", color: "bg-white/10 text-white" },
          ].map((method) => (
            <button
              key={method.id}
              className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-[#121B29] px-3.5 py-2 text-left transition hover:border-white/25"
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${method.color}`}>
                  {method.badge}
                </span>
                <span className="text-[12px] text-white/85">{method.label}</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-white/35">chevron_right</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/20 bg-white/5 py-2 text-[12px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            취소
          </button>
          <button
            onClick={() => {
              alert(`${currentPlan.name} 플랜 결제가 진행됩니다. (포트원 연동 예정)`);
              onClose();
            }}
            className="flex-1 rounded-full bg-[#3BA7FF] py-2 text-[12px] font-semibold text-[#061120] shadow-[0_10px_24px_rgba(59,167,255,0.32)] transition hover:bg-[#2F8ED6]"
          >
            결제하기
          </button>
        </div>

          <p className="mt-3 text-center text-[10px] text-white/38">* 포트원(PortOne) 결제 시스템 연동 예정</p>
        </div>
      </div>
      {policies && isPolicyModalOpen ? (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-6">
        <div className="w-full max-w-[320px] rounded-[18px] border border-white/12 bg-[#0F1623] px-5 py-4 text-white shadow-[0_20px_60px_rgba(3,8,20,0.6)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Policy</p>
              <h3 className="mt-1 text-[18px] font-semibold">환불 정책</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/18 hover:text-white"
              aria-label="환불 정책 닫기"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#101924] p-4 text-[11px] leading-[1.6] text-white/75">
            <dl className="space-y-3">
              <div>
                <dt className="font-semibold text-white/85">서비스 제공 기간</dt>
                <dd className="mt-1 text-white/65">{policies.servicePeriod}</dd>
              </div>
              <div>
                <dt className="font-semibold text-white/85">교환 정책</dt>
                <dd className="mt-1 text-white/65">{policies.exchangePolicy}</dd>
              </div>
              <div>
                <dt className="font-semibold text-white/85">환불 정책</dt>
                <dd className="mt-1 text-white/65">{policies.refundPolicy}</dd>
              </div>
              <div>
                <dt className="font-semibold text-white/85">취소 규정</dt>
                <dd className="mt-1 text-white/65">{policies.cancellationPolicy}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      ) : null}
    </>
  );
}
