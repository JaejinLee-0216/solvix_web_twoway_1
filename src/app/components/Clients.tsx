export default function Clients() {
  return (
    <section className="container-1200 relative" style={{ height: 905 }}>
      {/* Heading */}
      <h2 className="absolute left-[162px] top-[80px] w-[852px] h-[138px] premium-text text-[56px] leading-[1.1607] text-center font-serif font-bold">
        신중한 선택,<br />
        확실한 결과로 보답합니다.
      </h2>
      <p className="absolute left-[396px] top-[496px] w-[433px] h-[31px] text-[16px] text-white text-center">먼저 경험한 학생들의 생생한 후기를 들어보세요.</p>

      {/* background glow */}
      <div className="absolute left-[205px] top-[203px] w-[765px] h-[354px] rounded-full" style={{ background: "rgba(69,199,255,0.5)", filter: "blur(254px)" }} />

      {/* Rating SVG */}
      <div className="absolute left-10 right-0 top-[200px] flex justify-center">
        <img src="/assets/desktop/rating.svg" alt="평균 만족도" className="block" />
      </div>

      {/* Three review cards */}
      <div className="absolute left-0 right-0 top-[558px] flex justify-center gap-6">
        <img src="/assets/desktop/card1.svg" alt="리뷰 카드 1" className="block" />
        <img src="/assets/desktop/card2.svg" alt="리뷰 카드 2" className="block" />
        <img src="/assets/desktop/card3.svg" alt="리뷰 카드 3" className="block" />
      </div>
    </section>
  );
}

