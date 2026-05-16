"use client";

import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Top bar — fixed for scroll-resistant CTA */}
      <header
        style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3.5rem", zIndex: 100, background: "#0B0C10" }}
        className="border-b border-white/[0.06]"
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="text-base font-semibold tracking-tight text-white">
            Widea
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.10]"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-white/[0.06] pt-14">
        <div className="mx-auto max-w-5xl px-6 py-28 lg:px-8 lg:py-36">
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            검증된 해외 사례로<br />한국 창업을 시작하세요
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400">
            당신의 한국 사업 아이디어를 찾고, 실행에 필요한 일정·팀·전문가까지{" "}
            <span className="whitespace-nowrap">한 워크스페이스</span>로 이어가세요
          </p>
          <ol className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
            <li className="inline-flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[0.65rem] font-semibold text-zinc-300 tabular-nums">1</span>
              산업 · 예산 입력
            </li>
            <span className="text-zinc-600">›</span>
            <li className="inline-flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[0.65rem] font-semibold text-zinc-300 tabular-nums">2</span>
              해외 사례 매칭
            </li>
            <span className="text-zinc-600">›</span>
            <li className="inline-flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[0.65rem] font-semibold text-zinc-300 tabular-nums">3</span>
              한국 맞춤형 아이디어
            </li>
          </ol>
          <div className="mt-9">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.10] px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/40 hover:bg-white/[0.16] hover:text-white"
            >
              지금 무료로 시작하기
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-24 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">기능</p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] md:grid-cols-2">
            {[
              {
                title: "해외 사례 탐색",
                desc: "산업·예산 조건으로 검증된 해외 스타트업 사례를 검색합니다.",
              },
              {
                title: "한국형 실행 전략",
                desc: "선택한 사례를 한국 시장 맥락의 비즈니스 모델·실행 단계로 변환합니다.",
              },
              {
                title: "아이디어 매칭",
                desc: "팀 역량·예산 조건에 맞는 한국 사업 아이디어를 추천합니다.",
              },
              {
                title: "워크스페이스",
                desc: "일정·팀·전문가 협업을 한 곳에서 관리합니다.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-[#0B0C10] p-8">
                <h3 className="text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-10 lg:px-8">
          <p className="text-sm font-semibold text-white">Widea</p>
          <p className="text-xs text-zinc-600">© 2026 Widea</p>
        </div>
      </footer>
    </>
  );
}
