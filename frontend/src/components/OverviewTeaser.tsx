"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

type SourceCard = {
  companyName: string;
  industry?: string | null;
  foundedYear?: number | null;
  fundingStage?: string | null;
  revenueModel?: string | null;
  why?: string | null;
  score?: number | null;
};

type Idea = {
  id: string;
  titleKo: string;
  oneLinerKo?: string | null;
  marketFitScore?: number | null;
  confidenceScore?: number | null;
  whyNowInKoreaKo?: string | null;
  deepReportKo?: unknown;
  deepReportUnlocked?: boolean;
};

type ConfidenceBreakdown = {
  sourceCount: number;
  matchAvg: number;
  riskCount: number;
  hasExecution: boolean;
};

const STEP_LABELS = [
  { num: "01", label: "실존 증명" },
  { num: "02", label: "MVP 흑역사" },
  { num: "03", label: "송곳 전략" },
  { num: "04", label: "피벗 경고" },
  { num: "05", label: "기술 엔진" },
];

export default function OverviewTeaser({
  idea,
  sourceCards,
  confidenceBreakdown,
  onOpenDeep,
}: {
  idea: Idea;
  sourceCards: SourceCard[];
  confidenceBreakdown: ConfidenceBreakdown;
  onOpenDeep: () => void;
}) {
  const { user } = useAuth();
  const isUnlocked = Boolean(idea.deepReportUnlocked);
  const cost = 8;
  const canAfford = user?.isAdmin || (user?.creditBalance ?? 0) >= cost;

  return (
    <article className="mx-auto max-w-3xl space-y-16 fade-up py-4">
      {/* HERO */}
      <header className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          글로벌 벤치마크 {confidenceBreakdown.sourceCount}건 분석 완료
        </p>
        {idea.oneLinerKo ? (
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {idea.oneLinerKo}
          </h1>
        ) : null}

        {/* 점수 — 작게, 데이터처럼 */}
        <div className="flex flex-wrap gap-x-10 gap-y-3 border-t border-white/10 pt-6 text-sm">
          {typeof idea.marketFitScore === "number" ? (
            <Stat label="Market Fit" value={`${idea.marketFitScore}`} />
          ) : null}
          {typeof idea.confidenceScore === "number" ? (
            <Stat label="Confidence" value={`${idea.confidenceScore}`} />
          ) : null}
          <Stat label="평균 매칭" value={`${confidenceBreakdown.matchAvg}`} />
          <Stat label="식별 리스크" value={`${confidenceBreakdown.riskCount}`} />
        </div>
      </header>

      {/* 한국 타이밍 — pull quote */}
      {idea.whyNowInKoreaKo ? (
        <blockquote className="border-l-2 border-white/30 pl-6 text-base leading-8 text-zinc-200 sm:text-lg">
          {idea.whyNowInKoreaKo}
        </blockquote>
      ) : null}

      {/* 5단계 미리보기 — 잠긴 헤드라인만 */}
      <section className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            5단계 심층 분석
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
            이 아이디어, 진짜 될까?
          </h2>
        </header>

        <ol className="divide-y divide-white/5 border-y border-white/5">
          {STEP_LABELS.map((s) => (
            <li key={s.num} className="flex items-center gap-6 py-4">
              <span className="text-2xl font-black text-white/[0.12] tabular-nums">
                {s.num}
              </span>
              <span className="flex-1 text-base font-semibold text-white">
                {s.label}
              </span>
              {!isUnlocked ? (
                <svg className="h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              ) : (
                <span className="text-xs font-medium text-zinc-300">생성됨</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 단일 큰 CTA */}
      <section className="space-y-4 text-center">
        <button
          type="button"
          onClick={onOpenDeep}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.10] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/[0.15]"
        >
          {isUnlocked ? "분석 보러가기 →" : "심층 리포트 미리보기 →"}
        </button>
        <p className="text-xs text-zinc-500">
          {isUnlocked
            ? "이미 잠금 해제된 분석을 다시 봅니다 (무료)"
            : `미리 생성되어 있고, ${cost} 크레딧으로 잠금 해제 — 도구 3종 자동 포함`}
        </p>
        {!isUnlocked && !canAfford ? (
          <p className="text-xs text-rose-400">잠금 해제에는 {cost} 크레딧 필요</p>
        ) : null}
      </section>

      {/* 출처 */}
      {sourceCards.length > 0 ? (
        <footer className="border-t border-white/10 pt-6 text-xs text-zinc-500">
          <p className="font-semibold uppercase tracking-wider text-zinc-600">분석 근거 회사</p>
          <p className="mt-2 text-zinc-300">
            {sourceCards.map((s) => s.companyName).join(" · ")}
          </p>
        </footer>
      ) : null}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

export type { SourceCard, Idea, ConfidenceBreakdown };
function _unused(_n: ReactNode) { return null; }
void _unused;
