"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import PaymentPopup from "./PaymentPopup";

export default function Pricing() {
  const [paymentPopup, setPaymentPopup] = useState<{ isOpen: boolean; planType: "basic" | "pro" | "ultra" }>({
    isOpen: false,
    planType: "basic"
  });
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash === "#pricing" && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const openPaymentPopup = useCallback((planType: "pro" | "ultra") => {
    setPaymentPopup({ isOpen: true, planType });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ planType: "pro" | "ultra" }>;
      const planType = custom.detail?.planType ?? "pro";
      openPaymentPopup(planType);
    };
    window.addEventListener("openPaymentPopup", handler);
    return () => window.removeEventListener("openPaymentPopup", handler);
  }, [openPaymentPopup]);

  const handlePlanClick = (planType: "basic" | "pro" | "ultra") => {
    if (planType === "basic") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    openPaymentPopup(planType);
  };

  const closePaymentPopup = () => {
    setPaymentPopup({ isOpen: false, planType: "basic" });
  };

  return (
    <>
      <section ref={sectionRef} id="pricing" className="container-1200 relative" style={{ height: 639, transformOrigin: 'center top' }}>
        {/* Title */}
        <div className="relative pt-8">
          {/* pill outline behind the title */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-[20px] w-[214px] h-[71px] rounded-[75px]"
            style={{
              background: "linear-gradient(194deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 100%)",
              boxShadow: "0px 5.37px 7.17px rgba(0,0,0,0.16)",
              border: "0.6px solid rgba(242,159,255,0.29)"
            }}
          />
          <h2 className="w-full text-center mb-3 font-semibold text-[40px] leading-[1.2] premium-text relative">요금제</h2>
        </div>
        <p className="w-full text-center text-white text-[16px] leading-[3.625]">
          나에게 맞는 플랜을 선택하고, 100점을 향한 가장 빠른 길을 찾으세요.
        </p>

        {/* Plans row (SVGs) - absolute positioning to preserve spacing on zoom */}
        <div className="relative mt-10" style={{ height: 420 }}>
          {/* Basic */}
          <div className="absolute" style={{ left: 202, top: 0 }}>
            <img src="/assets/desktop/plan_basic.svg" alt="Basic plan" className="block" />
            <button
              onClick={() => handlePlanClick("basic")}
              className="absolute left-1/2 -translate-x-1/2 bottom-[50px] cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src="/assets/desktop/btn_start_basic.svg"
                alt="무료로 시작하기"
                width={180}
                height={30}
              />
            </button>
          </div>
          {/* Pro */}
          <div className="absolute" style={{ left: 468, top: 0 }}>
            <img src="/assets/desktop/plan_pro.svg" alt="Pro plan" className="block" />
            <button
              onClick={() => handlePlanClick("pro")}
              className="absolute left-1/2 -translate-x-1/2 bottom-[52px] cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src="/assets/desktop/btn_start_pro.svg"
                alt="Pro로 관리 받기"
                width={180}
                height={31}
              />
            </button>
          </div>
          {/* Ultra */}
          <div className="absolute" style={{ left: 743, top: 0 }}>
            <img src="/assets/desktop/plan_ultra.svg" alt="Ultra plan" className="block" />
            <button
              onClick={() => handlePlanClick("ultra")}
              className="absolute left-1/2 -translate-x-1/2 bottom-[54px] cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src="/assets/desktop/btn_start_ultra.svg"
                alt="Ultra로 100점 예약하기"
                width={180}
                height={31}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Payment Popup */}
      <PaymentPopup
        isOpen={paymentPopup.isOpen}
        onClose={closePaymentPopup}
        planType={paymentPopup.planType}
      />
    </>
  );
}