"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { Badge, EmptyState, LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { clampText, formatCurrency, readError } from "@/lib/product";
import type {
  GeneratedIdeaSummary,
  IdeaMatchSessionListResponse,
  ProjectDetailResponse,
} from "@/lib/types";

const IDEA_STATUS_META: Record<string, { label: string; tone: "accent" | "success" | "warning" | "neutral" }> = {
  SELECTED:    { label: "대표 아이디어", tone: "accent" },
  SHORTLISTED: { label: "Shortlist",   tone: "success" },
  ARCHIVED:    { label: "보관됨",       tone: "warning" },
};

export default function ProjectDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { token } = useAuth();

  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [sessions, setSessions] = useState<IdeaMatchSessionListResponse["sessions"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api<ProjectDetailResponse>("GET", `/api/projects/${id}`, undefined, token),
      api<IdeaMatchSessionListResponse>("GET", `/api/idea-match/sessions?projectId=${id}&limit=20`, undefined, token),
    ])
      .then(([proj, sess]) => {
        if (cancelled) return;
        setProject(proj);
        setSessions(sess.sessions ?? []);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "프로젝트를 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token, id]);

  // 모든 세션의 아이디어를 한 줄로 펼침 (status 우선순위로 정렬)
  const allIdeas = useMemo(() => {
    if (!sessions.length) return [] as Array<{ idea: GeneratedIdeaSummary; sessionDate: string }>;
    const list = sessions.flatMap((s) =>
      (s.generatedIdeas ?? []).map((idea) => ({
        idea,
        sessionDate: s.createdAt,
      })),
    );
    const order: Record<string, number> = { SELECTED: 0, SHORTLISTED: 1, DRAFT: 2, ARCHIVED: 3 };
    return list.sort(
      (a, b) =>
        (order[a.idea.status] ?? 9) - (order[b.idea.status] ?? 9) ||
        new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
    );
  }, [sessions]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingState label="프로젝트 불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !project) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <p className="text-sm text-rose-300">{error || "프로젝트를 찾을 수 없습니다."}</p>
          <Link href="/mypage" className="btn-primary">내 아이디어로</Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-8 fade-up pb-12">

        {/* 헤더 */}
        <header className="space-y-3">
          <Link href="/mypage" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            ← 내 아이디어
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {project.title}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
            <span>예산 {formatCurrency(project.budgetLimit)}</span>
            <span className="text-zinc-700">·</span>
            <span>타겟 {project.targetMarket}</span>
            {project.targetDuration ? (
              <>
                <span className="text-zinc-700">·</span>
                <span>기간 {project.targetDuration}</span>
              </>
            ) : null}
          </div>
        </header>

        {/* 메인 CTA */}
        <Link
          href={`/idea-match?projectId=${project.id}`}
          className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            다음 액션
          </p>
          <p className="mt-1.5 text-lg font-bold text-white">
            새 아이디어 매칭 실행 →
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            이 프로젝트 조건으로 새로운 아이디어 5개를 즉시 생성합니다.
          </p>
        </Link>

        {/* 아이디어 목록 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              생성된 아이디어 <span className="text-zinc-500">({allIdeas.length})</span>
            </h2>
          </div>

          {allIdeas.length === 0 ? (
            <EmptyState
              title="아직 생성된 아이디어가 없습니다"
              description="위 '새 아이디어 매칭 실행'을 눌러 첫 아이디어를 받아보세요."
            />
          ) : (
            <div className="space-y-2">
              {allIdeas.map((entry) => {
                const meta = IDEA_STATUS_META[entry.idea.status];
                return (
                  <Link
                    key={entry.idea.id}
                    href={`/ideas/${entry.idea.id}`}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-white">
                          {entry.idea.titleKo}
                        </p>
                        {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
                        {typeof entry.idea.marketFitScore === "number" ? (
                          <span className="text-xs text-zinc-400">적합도 {entry.idea.marketFitScore}</span>
                        ) : null}
                      </div>
                      {entry.idea.oneLinerKo ? (
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-300">
                          {clampText(entry.idea.oneLinerKo, 140)}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-zinc-500 group-hover:text-zinc-200">→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
