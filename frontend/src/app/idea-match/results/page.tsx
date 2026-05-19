"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import type {
  GeneratedIdea,
  IdeaCard,
  IdeaMatchSessionDetailResponse,
} from "@/lib/types";

/* ── Helpers ── */

function toIdeaCardFromGeneratedIdea(idea: GeneratedIdea): IdeaCard {
  const sourceBenchmark = Array.isArray(idea.sourceBenchmarks)
    ? idea.sourceBenchmarks
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "companyName" in item) {
            return typeof (item as { companyName?: unknown }).companyName === "string"
              ? (item as { companyName: string }).companyName
              : null;
          }
          return null;
        })
        .filter((item): item is string => Boolean(item))
        .join(", ")
    : undefined;

  return {
    title: idea.titleKo,
    summary: idea.oneLinerKo || idea.summaryKo || undefined,
    whyNowInKorea: idea.whyNowInKoreaKo || undefined,
    sourceBenchmark,
    feasibilityScore: idea.marketFitScore ?? undefined,
    confidenceScore: idea.confidenceScore ?? undefined,
    targetCustomer: idea.targetCustomer ?? undefined,
    problemDetail: idea.problemDetail ?? undefined,
    businessModel: idea.businessModel ?? undefined,
    mvpScope: idea.mvpScope ?? undefined,
    goToMarket: idea.goToMarket ?? undefined,
    executionPlan: idea.executionPlan ?? undefined,
    estimatedCost: idea.estimatedCost ?? undefined,
    risks: Array.isArray(idea.risks) ? (idea.risks as IdeaCard["risks"]) : undefined,
  };
}

function getIdeaHighlight(idea: IdeaCard) {
  if (typeof idea.whyNowInKorea === "string" && idea.whyNowInKorea.trim()) return idea.whyNowInKorea;
  if (typeof idea.whyKorea === "string" && idea.whyKorea.trim()) return idea.whyKorea;
  return idea.summary || "";
}

/* ── Status pill ── */
function StatusPill({ status }: { status: string }) {
  if (status === "SELECTED") return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6EE7B7" }}>
      <span className="h-1.5 w-1.5 rounded-full bg-white/[0.06]" />대표안
    </span>
  );
  return null;
}

/* ── Page ── */

function IdeaMatchResultsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { token, user, updateCredit } = useAuth();
  const [session, setSession] = useState<IdeaMatchSessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unlockedIndexes, setUnlockedIndexes] = useState<Set<number>>(new Set([0]));
  const [unlockingIndex, setUnlockingIndex] = useState<number | null>(null);
  const [unlockError, setUnlockError] = useState("");

  useEffect(() => {
    if (!token || !sessionId) return;
    let cancelled = false;
    setLoading(true);

    api<IdeaMatchSessionDetailResponse>("GET", `/api/idea-match/sessions/${sessionId}`, undefined, token)
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        const unlockedSet = new Set<number>(
          (data.generatedIdeas ?? []).reduce<number[]>((acc, idea, i) => {
            if (!idea.requiresCredit) acc.push(i);
            return acc;
          }, []),
        );
        unlockedSet.add(0);
        setUnlockedIndexes(unlockedSet);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "세션을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token, sessionId]);

  const generatedIdeas = session?.generatedIdeas ?? [];
  const ideaCards = generatedIdeas.map(toIdeaCardFromGeneratedIdea);
  const projectTitle = session?.projectPolicy?.title ?? "";

  async function handleUnlock(index: number) {
    const ideaId = generatedIdeas[index]?.id;
    if (!token || !ideaId) return;
    setUnlockingIndex(index);
    setUnlockError("");
    try {
      const res = await api<{ idea: { id: string; requiresCredit: boolean }; creditBalance: number }>(
        "POST", `/api/ideas/${ideaId}/unlock`, {}, token,
      );
      updateCredit(res.creditBalance);
      setUnlockedIndexes((prev) => new Set([...prev, index]));
    } catch (caught) {
      setUnlockError(readError(caught, "잠금 해제에 실패했습니다."));
    } finally {
      setUnlockingIndex(null);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState label="아이디어를 불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !session) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-2xl space-y-4 py-20 text-center">
          <p style={{ color: "#F87171" }}>{error || "세션을 찾을 수 없습니다."}</p>
          <Link href="/idea-match" className="btn-primary">다시 탐색하기</Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="fade-up space-y-8 pb-12">

        {/* 헤더 */}
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            아이디어 매칭 결과
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {projectTitle || "AI가 추천한 창업 아이디어"}
          </h1>
          <p className="text-base leading-7 text-zinc-300">
            마음에 드는 카드를 선택하면 실행 전략과 정부지원사업 매칭까지 한번에 볼 수 있어요.
          </p>
        </header>

        {unlockError ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {unlockError}
          </div>
        ) : null}

        {/* 카드 그리드 */}
        {ideaCards.length === 0 ? (
          <EmptyState title="생성된 아이디어가 없습니다" description="다시 탐색을 시도해보세요." />
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideaCards.map((idea, index) => {
              const isUnlocked = unlockedIndexes.has(index);
              const generated = generatedIdeas[index];
              const status = generated?.status ?? "DRAFT";
              const unlockCost = 5;
              const canUnlock = (user?.creditBalance ?? 0) >= unlockCost || user?.isAdmin;
              const cardBody = (
                <>
                  {/* 잠금 오버레이 */}
                  {!isUnlocked ? (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-md"
                      style={{ background: "rgba(7,6,15,0.85)" }}
                    >
                      <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <p className="text-sm font-semibold text-white">잠긴 아이디어</p>
                      {canUnlock ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUnlock(index); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleUnlock(index); } }}
                          className="btn-primary cursor-pointer px-4 py-2 text-xs"
                        >
                          {unlockingIndex === index ? "처리 중..." : `${unlockCost} 크레딧으로 열기`}
                        </span>
                      ) : (
                        <Link href="/pricing" onClick={(e) => e.stopPropagation()} className="btn-secondary px-4 py-2 text-xs">
                          크레딧 충전
                        </Link>
                      )}
                    </div>
                  ) : null}

                  {/* 상단: 번호 */}
                  <div>
                    <span className="text-3xl font-bold tracking-tight text-zinc-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* 타이틀 */}
                  <h3 className="mt-4 text-lg font-bold leading-snug text-white">
                    {idea.title || `아이디어 ${index + 1}`}
                  </h3>

                  {/* 한 줄 요약 */}
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-300">
                    {getIdeaHighlight(idea) || idea.summary || "핵심 가치 제안"}
                  </p>

                  {/* 상태 */}
                  {status !== "DRAFT" ? (
                    <div className="mt-4">
                      <StatusPill status={status} />
                    </div>
                  ) : null}

                  {/* 액션 라벨 */}
                  {isUnlocked ? (
                    <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-zinc-300">
                      자세히 보기 →
                    </p>
                  ) : null}
                </>
              );

              const baseClass = "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_0_24px_rgba(93,93,255,0.12)]";

              if (isUnlocked && generated?.id) {
                return (
                  <Link key={`idea-${index}`} href={`/ideas/${generated.id}`} className={baseClass}>
                    {cardBody}
                  </Link>
                );
              }
              return (
                <div key={`idea-${index}`} className={baseClass}>
                  {cardBody}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </AuthGuard>
  );
}

export default function IdeaMatchResultsPage() {
  return (
    <Suspense fallback={null}>
      <IdeaMatchResultsContent />
    </Suspense>
  );
}
