interface BusinessInfoProps {
  className?: string;
  align?: "left" | "center";
}

export default function BusinessInfo({ className = "", align = "center" }: BusinessInfoProps) {
  const alignmentClass = align === "left" ? "text-left" : "text-center";

  return (
    <div
      className={`text-[10px] leading-[1.5] tracking-[-0.01em] text-[#8F96A6] ${alignmentClass} ${className}`.trim()}
    >
      <p>
        (주)NeoQ (대표: 김시은) | 사업자등록번호: 162-30-02074 | 사업장 주소: 서울 송파구 위례서이로 25 | E-mail: neoqstudy@gmail.com | 전화번호: 010-5450-6393
      </p>
      <p className="mt-1">Copyright © 2025 NeoQ Inc. All rights reserved.</p>
    </div>
  );
}


