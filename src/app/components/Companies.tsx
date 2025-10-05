export default function Companies() {
  return (
    <section className="container-1200 relative" style={{ height: 522 }}>
      {/* Quote */}
      <p className="absolute left-[288px] top-[134px] w-[588px] h-[68px] text-[23px] leading-[1.478] text-center premium-text">
        최고의 전문가들이 설계하고 검증합니다.
        <br />
        서울대학교 컴퓨터공학부 AI팀과, 수능 전문가들이 함께.
      </p>

      {/* Logos */}
      <div className="absolute left-[417px] top-[219px] w-[330px] h-[88px] rounded-[10px] grid place-items-center">
        <img src="/assets/desktop/snu_logo.svg" alt="서울대학교" className="max-h-[80px] object-contain" />
      </div>
      <div className="absolute left-[273px] top-[332px] w-[291px] h-[88.57px] rounded-[10px] grid place-items-center">
        <img src="/assets/desktop/korea_univ_logo.svg" alt="고려대학교" className="max-h-[80px] object-contain" />
      </div>
      <div className="absolute left-[622px] top-[332px] w-[278px] h-[89px] rounded-[10px] grid place-items-center">
        <img src="/assets/desktop/team_medical_logo.svg" alt="TEAM MEDICAL" className="max-h-[80px] object-contain" />
      </div>

      {/* Graduation hat asset */}
      <div className="absolute left-[537px] top-[16px] w-[114px] h-[118px] bg-[url('/assets/desktop/graduationhat.svg')] bg-contain bg-no-repeat" />
    </section>
  );
}

