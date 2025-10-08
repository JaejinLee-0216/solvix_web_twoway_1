"use client";

import Chatbox from "../components/Chatbox";

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-[#03050A] text-white">
      <section className="max-w-[780px] mx-auto px-5 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">문제 풀이</h1>
          <p className="mt-2 text-sm text-white/60">
            SOLVIX와의 대화가 여기서 이어집니다. 질문과 이미지 파일을 업로드해보세요.
          </p>
        </div>
        <Chatbox variant="mobile" isLoggedIn={true} />
      </section>
    </main>
  );
}
