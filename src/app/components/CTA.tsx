'use client';

export default function CTA() {
  const handleBasicStart = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleProStart = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("openPaymentPopup", {
          detail: { planType: "pro" as const },
        })
      );
    }
  };

  return (
    <section className="container-1200 relative" style={{ height: 358 }}>
      {/* Heading with gradient on '확신' and forced line break */}
      <h3 className="absolute left-1/2 -translate-x-1/2 top-[40px] w-[720px] text-[40px] leading-[1.4] text-center font-semibold">
        <span>망설임은 끝났습니다.</span>
        <br />
        <span>
          이제, <span className="gold-text">확신</span>을 가질 시간입니다.
        </span>
      </h3>

      {/* Buttons as independent SVGs (sizes here are independent from Pricing) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[185px] flex items-center gap-10">
        <button type="button" onClick={handleBasicStart} aria-label="무료로 시작하기" className="cursor-pointer hover:opacity-90 transition-opacity">
          <img src="/assets/desktop/btn_start_basic.svg" alt="무료로 시작하기" width={230} height={53} />
        </button>
        <button type="button" onClick={handleProStart} aria-label="Pro로 관리받기" className="cursor-pointer hover:opacity-90 transition-opacity">
          <img src="/assets/desktop/btn_start_pro.svg" alt="Pro로 관리받기" width={240} height={53} />
        </button>
      </div>

      {/* one-line helper */}
      <p className="absolute left-1/2 -translate-x-1/2 top-[283px] text-[16px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">
        카카오톡 로그인으로, 10초 만에 시작하세요.
      </p>
    </section>
  );
}

