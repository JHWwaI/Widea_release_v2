"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/ProductUI";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

type ShowData = {
  idea: {
    id: string;
    titleKo: string;
    oneLinerKo: string | null;
    summaryKo: string | null;
    whyNowInKoreaKo: string | null;
    createdAt: string;
  };
  mvpFeatures: string[];
  benchmark: { companyName: string | null; similarityPct: number | null } | null;
  hookLine: string | null;
  progress: {
    overallPct: number;
    doneTasks: number;
    totalTasks: number;
    stages: Array<{
      stageNumber: number;
      name: string;
      status: string;
      taskTotal: number;
      taskDone: number;
    }>;
  };
};

export default function ShowPage() {
  const { ideaId: rawId } = useParams<{ ideaId: string }>();
  const ideaId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [data, setData] = useState<ShowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ideaId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/show/${ideaId}`);
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as ShowData;
        if (!cancelled) setData(json);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "불러오기 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ideaId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <LoadingState label="불러오는 중..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-sm text-zinc-400">사업 페이지를 찾을 수 없습니다.</p>
          <p className="mt-2 text-xs text-zinc-600">{error}</p>
        </div>
      </div>
    );
  }

  const { idea, mvpFeatures, benchmark, hookLine, progress } = data;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-20 sm:py-28">
        {/* 배경 그라디언트 */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.15),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.10),transparent_60%)]" />

        <div className="relative mx-auto max-w-3xl space-y-8 text-center">
          {benchmark?.similarityPct ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-zinc-200">
              ✦ {benchmark.companyName}와 {benchmark.similarityPct}% 유사 · 검증된 모델
            </p>
          ) : null}

          <h1 className="editorial-h1 text-white">
            {idea.titleKo}
          </h1>

          {idea.oneLinerKo ? (
            <p className="editorial-body mx-auto max-w-2xl text-zinc-300">
              {idea.oneLinerKo}
            </p>
          ) : null}

          {hookLine ? (
            <blockquote className="editorial-quote mx-auto max-w-xl text-zinc-200">
              "{hookLine}"
            </blockquote>
          ) : null}
        </div>
      </section>

      {/* MVP 기능 */}
      {mvpFeatures.length > 0 ? (
        <section className="border-b border-white/10 px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">핵심 기능</p>
            <h2 className="editorial-h2 mt-3 text-white">
              어떻게 작동하나요
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {mvpFeatures.slice(0, 3).map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <p className="text-3xl font-black tabular-nums text-white/[0.12]">
                    0{i + 1}
                  </p>
                  <p className="mt-3 text-base leading-7 text-zinc-100">{f}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 한국 타이밍 */}
      {idea.whyNowInKoreaKo ? (
        <section className="border-b border-white/10 px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow text-zinc-200">⏰ 지금 한국에서</p>
            <p className="editorial-body mt-3 text-zinc-200">
              {idea.whyNowInKoreaKo}
            </p>
          </div>
        </section>
      ) : null}

      {/* 진척 */}
      {progress.totalTasks > 0 ? (
        <section className="border-b border-white/10 px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-zinc-200">현재 진척</p>
              <p className="display-num text-3xl text-zinc-200 sm:text-4xl">
                {progress.overallPct}%
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-zinc-300 to-white transition-all"
                style={{ width: `${progress.overallPct}%` }}
              />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {progress.stages.map((s) => {
                const pct = s.taskTotal === 0 ? 0 : (s.taskDone / s.taskTotal) * 100;
                return (
                  <div key={s.stageNumber} className="space-y-1.5">
                    <p className="text-[0.65rem] font-semibold text-zinc-500">
                      0{s.stageNumber}
                    </p>
                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className={`h-full rounded-full ${
                          pct === 100 ? "bg-white" : "bg-zinc-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="truncate text-[0.65rem] text-zinc-500">{s.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <h3 className="text-2xl font-bold text-white sm:text-3xl">
            관심 있으시면 연락주세요
          </h3>
          <p className="text-sm leading-7 text-zinc-400">
            함께할 분 · 베타 사용자 · 투자자 누구나 환영합니다.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`mailto:?subject=${encodeURIComponent(idea.titleKo)}&body=${encodeURIComponent(`${idea.oneLinerKo ?? ""}\n\n${typeof window !== "undefined" ? window.location.href : ""}`)}`}
              className="rounded-full bg-white/[0.10] px-6 py-3 text-sm font-bold text-white hover:bg-white/[0.15]"
            >
              💬 연락하기 (이메일)
            </a>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("링크 복사됨!");
                }
              }}
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              🔗 링크 복사
            </button>
          </div>
        </div>
      </section>

      {/* Footer — Powered by Widea */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            ⚡ Powered by Widea
          </Link>
          <p>
            AI 창업 워크스페이스 ·{" "}
            <Link href="/idea-match" className="text-zinc-400 hover:text-zinc-200">
              내 사업도 시작하기 →
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
