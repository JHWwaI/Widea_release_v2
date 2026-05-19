"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#08090C] text-zinc-100">
      {/* Ambient background — monochrome radial glow + subtle grid */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 50% -10%, rgba(255,255,255,0.07), transparent 60%), radial-gradient(700px 400px at 90% 10%, rgba(255,255,255,0.035), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* Top bar — fixed, blurs on scroll */}
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(8,9,12,0.72)" : "rgba(8,9,12,0)",
          backdropFilter: scrolled ? "saturate(160%) blur(14px)" : "none",
          WebkitBackdropFilter: scrolled ? "saturate(160%) blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-white">
            Widea
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:border-white/40 hover:bg-white/[0.12] hover:text-white"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero */}
        <section className="pt-32 sm:pt-40 lg:pt-48">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            {/* Eyebrow chip */}
            <div className="animate-[fadeUp_0.7s_ease-out_both]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                검증된 해외 사례 기반 한국 창업 플랫폼
              </span>
            </div>

            <h1
              className="mt-6 text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[88px] xl:text-[104px] animate-[fadeUp_0.8s_ease-out_0.05s_both]"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #b8bcc4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              검증된 해외 사례로<br />한국 창업을 시작합니다
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg animate-[fadeUp_0.8s_ease-out_0.1s_both]">
              산업·예산을 입력하면 글로벌에서 검증된 사례를 한국 시장 아이디어로 변환합니다.
              일정·팀·전문가 협업까지 한 워크스페이스에서 이어갑니다.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3 animate-[fadeUp_0.8s_ease-out_0.15s_both]">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-all hover:-translate-y-px hover:border-white/45 hover:bg-white/[0.14] hover:text-white hover:shadow-[0_8px_30px_rgba(255,255,255,0.10)]"
              >
                지금 무료로 시작하기
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
              >
                로그인
              </Link>
            </div>

            {/* Step rail */}
            <ol className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-zinc-300 animate-[fadeUp_0.8s_ease-out_0.2s_both]">
              {["산업 · 예산 입력", "해외 사례 매칭", "한국 맞춤형 아이디어"].map((label, i) => (
                <li key={label} className="inline-flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[10px] font-semibold text-zinc-300 tabular-nums">
                    {i + 1}
                  </span>
                  <span>{label}</span>
                  {i < 2 ? <span className="ml-2 text-zinc-600">›</span> : null}
                </li>
              ))}
            </ol>

            {/* Product mockup */}
            <div className="relative mt-20 animate-[fadeUp_0.9s_ease-out_0.3s_both] lg:mt-24">
              <div
                className="absolute inset-x-10 -bottom-10 h-40 rounded-full opacity-60 blur-3xl"
                style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.10), transparent)" }}
              />
              <div
                className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
              >
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="ml-4 text-[11px] text-zinc-500">widea.app / workspace</span>
                </div>
                <div className="grid gap-0 md:grid-cols-[200px_1fr]">
                  {/* Sidebar mock */}
                  <div className="hidden border-r border-white/[0.06] p-4 md:block">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">워크스페이스</p>
                    <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
                      <li className="rounded-md bg-white/[0.05] px-2 py-1.5">B2C 헬스케어 SaaS</li>
                      <li className="px-2 py-1.5 text-zinc-400">D2C 뷰티 커머스</li>
                      <li className="px-2 py-1.5 text-zinc-400">로컬 F&B 플랫폼</li>
                    </ul>
                    <p className="mt-5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">분석 기록</p>
                    <ul className="mt-3 space-y-1.5 text-xs text-zinc-400">
                      <li className="px-2 py-1.5">헬스케어 아이디어 매칭</li>
                      <li className="px-2 py-1.5">F&B 매칭</li>
                    </ul>
                  </div>
                  {/* Main mock */}
                  <div className="p-5 sm:p-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">아이디어 매칭 결과</p>
                        <h3 className="mt-1 text-sm font-semibold text-white sm:text-base">B2C 헬스케어 SaaS · 예산 5천만원</h3>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300">3개 후보</span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        { src: "Calm (US)", title: "수면 명상 구독", note: "한국형: 직장인 야근 회복" },
                        { src: "Whoop (US)", title: "회복지수 웨어러블", note: "한국형: 골프·러닝 코칭" },
                        { src: "Babylon (UK)", title: "AI 1차 진료", note: "한국형: 비대면 만성질환" },
                      ].map((c) => (
                        <div key={c.title} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">{c.src}</p>
                          <p className="mt-1 text-xs font-medium text-zinc-100">{c.title}</p>
                          <p className="mt-1.5 text-[11px] text-zinc-400">{c.note}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-2 text-[11px] text-zinc-400">
                      <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <span>실행 단계 · 12주 로드맵</span>
                        <span className="text-zinc-500">자동 생성됨</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <span>팀 · 전문가 매칭</span>
                        <span className="text-zinc-500">3명 추천</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-32 lg:mt-40">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">기능</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                탐색에서 실행까지, 끊김 없이
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                해외 사례 검색·한국형 변환·실행 협업이 한 흐름으로 연결됩니다.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] md:grid-cols-2">
              {[
                {
                  title: "해외 사례 탐색",
                  desc: "산업·예산 조건으로 검증된 해외 스타트업 사례를 검색합니다.",
                  k: "01",
                },
                {
                  title: "한국형 실행 전략",
                  desc: "선택한 사례를 한국 시장 맥락의 비즈니스 모델·실행 단계로 변환합니다.",
                  k: "02",
                },
                {
                  title: "아이디어 매칭",
                  desc: "팀 역량·예산 조건에 맞는 한국 사업 아이디어를 추천합니다.",
                  k: "03",
                },
                {
                  title: "워크스페이스",
                  desc: "일정·팀·전문가 협업을 한 곳에서 관리합니다.",
                  k: "04",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group relative bg-[#0A0B0F] p-8 transition-colors hover:bg-[#0D0E13]"
                >
                  <p className="text-[11px] font-medium tracking-wider text-zinc-600 tabular-nums">{f.k}</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mt-32 lg:mt-40">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.01] px-8 py-14 text-center sm:px-12 sm:py-16"
            >
              <div
                className="pointer-events-none absolute inset-x-0 -top-20 h-40 opacity-60 blur-3xl"
                style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.12), transparent)" }}
              />
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                아이디어부터 실행까지, 오늘 시작하세요
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
                가입 즉시 50 크레딧이 지급되어 바로 매칭을 시작할 수 있습니다.
              </p>
              <Link
                href="/register"
                className="mt-7 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-all hover:-translate-y-px hover:border-white/45 hover:bg-white/[0.14] hover:text-white hover:shadow-[0_8px_30px_rgba(255,255,255,0.10)]"
              >
                지금 무료로 시작하기 <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-24" />
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
