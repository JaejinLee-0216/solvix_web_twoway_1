import Image from "next/image";
import Link from "next/link";

const mobileFeatures = [
  { label: "문제 풀이", description: "SOLVIX 핵심 기능", status: "active" },
  { label: "풀이 첨삭", description: "정확한 첨삭", status: "disabled" },
  { label: "문제 오류", description: "출제 의도 분석", status: "disabled" }
];

const mockMessages = [
  {
    id: "1",
    role: "user" as const,
    text: "x^2 + y^2 = 25 원 위의 P에서 접선을 그었을 때 기울기는?"
  },
  {
    id: "2",
    role: "assistant" as const,
    text: "원의 방정식 x^2 + y^2 = 25는 중심이 (0,0)이고 반지름이 5인 원입니다. 점 P(a,b)가 원 위에 있다면 a^2 + b^2 = 25를 만족합니다. 접선의 기울기는 -a/b가 됩니다."
  }
];

export default function MobileLandingPlaceholder() {
  return (
    <div className="min-h-screen w-full bg-[#020103] text-white flex flex-col">
      <header className="px-6 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/assets/desktop/nav_logo.png" alt="SOLVIX" width={120} height={32} priority />
            <span className="text-xs text-white/60">Beta</span>
          </div>
          <Link href="#login" className="text-sm font-semibold text-[#0075DC] underline">로그인</Link>
        </div>
        <div className="mt-8 space-y-3">
          <h1 className="text-[26px] leading-[1.3] font-semibold">
            킬러 문항도,<br />SOLVIX와 함께라면 두렵지 않게.
          </h1>
          <p className="text-sm text-white/70">
            수능 전문가와 AI가 함께 만든 수학 학습 코파일럿.
            성적 향상을 위한 맞춤형 풀이와 시각화를 경험해보세요.
          </p>
        </div>
      </header>

      <main className="flex-1 px-6">
        <section>
          <div className="flex gap-2">
            {mobileFeatures.map((feature) => (
              <button
                key={feature.label}
                type="button"
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  feature.status === "active"
                    ? "border-sky-400 bg-white/5 text-white"
                    : "border-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                {feature.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-2xl bg-white text-[#111] p-4 shadow-lg">
            <div className="rounded-xl border border-[#E5E7EB] bg-white">
              <textarea
                placeholder="문제 사진만 올려도 OK! 추가 질문도 입력해보세요"
                className="w-full resize-none rounded-t-xl border-b border-[#E5E7EB] p-4 text-sm outline-none"
                rows={3}
                readOnly
              />
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#1E3A8A]">0/1</button>
                  <button type="button" className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-xs text-[#1E3A8A]">SOLVIX 1.0</button>
                  <button type="button" className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-xs text-[#1E3A8A]">해설지</button>
                </div>
                <button type="button" className="rounded-full bg-[#0075DC] p-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          {mockMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-[#1E1E1F] text-white" : "bg-white text-[#111]"}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="mt-auto px-6 py-8 space-y-4">
        <div className="rounded-2xl bg-[#1A1A1F] px-4 py-3 text-xs text-white/70">
          <p>서울대학교 컴퓨터공학부 AI팀과 수능 전문가들이 함께 설계한 솔루션입니다.</p>
        </div>
        <div className="flex justify-between text-xs text-white/40">
          <span>© {new Date().getFullYear()} SOLVIX</span>
          <span>이용 약관 · 개인정보 처리방침</span>
        </div>
      </footer>
    </div>
  );
}
