"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { readError } from "@/lib/product";
import { LoadingState } from "@/components/ProductUI";
import type { WorkspaceTask } from "@/app/workspace/[ideaId]/page";

type Draft = { titleKo: string; bodyKo: string; category: string };

type MatchedExpert = {
  id: string;
  userId: string;
  category: string;
  headline: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  user: { id: string; name: string | null; email: string } | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  TEAM_RECRUIT: "팀원 모집",
  OUTSOURCE_REQUEST: "외주 의뢰",
  AC_REQUEST: "AC·멘토 컨택",
  MENTOR_REQUEST: "멘토 모집",
  BETA_TESTER: "베타 테스터",
};

export default function OutsourceModal({
  task,
  onClose,
  onPosted,
}: {
  task: WorkspaceTask;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [matched, setMatched] = useState<MatchedExpert[]>([]);
  // 외주 역할 — 모달 진입 시 task 값으로 시작, 사용자가 직접 수정 가능
  const [roleInput, setRoleInput] = useState<string>(task.outsourceRole ?? "");

  // 추천 전문가는 role/task 변경에 따라 자동 재 fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ experts: MatchedExpert[] }>(
          "GET",
          buildQuery("/api/experts/match", {
            q: task.content,
            role: roleInput,
            limit: 3,
          }),
        );
        if (!cancelled) setMatched(res.experts);
      } catch {
        /* 추천 실패는 무시 */
      }
    })();
    return () => { cancelled = true; };
  }, [task.content, roleInput]);

  // [초안 생성하기] 클릭 시 호출 — 자동 호출은 하지 않음 (역할 입력 후 명시적 호출)
  async function generateDraft() {
    if (!token) return;
    if (!roleInput.trim()) {
      setError("외주 역할을 먼저 입력해주세요. (예: 와이어프레임·디자인)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // 1. role 입력값을 task에 먼저 저장 (백엔드 prompt가 task.outsourceRole을 사용)
      if (roleInput.trim() !== (task.outsourceRole ?? "")) {
        await api(
          "PATCH",
          `/api/workspace/tasks/${task.id}`,
          { outsourceRole: roleInput.trim() },
          token,
        );
      }
      // 2. 초안 생성
      const res = await api<{ draft: Draft }>(
        "POST",
        `/api/workspace/tasks/${task.id}/outsource`,
        { mode: "preview" },
        token,
      );
      setDraft(res.draft);
    } catch (caught) {
      setError(readError(caught, "초안 생성 실패."));
    } finally {
      setLoading(false);
    }
  }

  // 진입 시 — 이미 outsourceRole이 있는 task면 자동 초안 생성 (기존 동작 유지)
  useEffect(() => {
    if (task.outsourceRole && !draft && !loading) {
      generateDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function publish() {
    if (!token || !draft) return;
    setPosting(true);
    setError("");
    try {
      const res = await api<{ post: { id: string } }>(
        "POST",
        `/api/workspace/tasks/${task.id}/outsource`,
        {
          mode: "publish",
          title: draft.titleKo,
          content: draft.bodyKo,
          category: draft.category,
        },
        token,
      );
      // 게시된 글을 새 탭에 열어서 즉시 확인 가능하게
      if (typeof window !== "undefined" && res?.post?.id) {
        window.open(`/community/${res.post.id}`, "_blank", "noopener,noreferrer");
      }
      onPosted();
    } catch (caught) {
      setError(readError(caught, "게시 실패."));
      setPosting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <div className="fixed inset-x-2 top-8 bottom-8 z-[70] mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex h-full flex-col">
          <header className="space-y-3 border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  외주·컨설팅·팀 모집 글 작성
                </p>
                <p className="mt-1 text-sm text-zinc-300">{task.content}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 외주 역할 입력 — 헤더에 항상 노출 */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  어떤 역할을 찾고 있나요?
                </label>
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="예: 와이어프레임·디자인 / 결제 PG 연동 / IR 멘토링"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/30 focus:outline-none"
                />
              </div>
              {!draft ? (
                <button
                  type="button"
                  onClick={generateDraft}
                  disabled={loading || !roleInput.trim()}
                  className="rounded-lg bg-white/[0.10] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.15] disabled:opacity-40"
                >
                  {loading ? "생성 중..." : "초안 자동 작성"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={generateDraft}
                  disabled={loading}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] disabled:opacity-40"
                  title="역할 변경 후 새로 초안 생성"
                >
                  {loading ? "..." : "↻ 다시 생성"}
                </button>
              )}
            </div>
          </header>

          {loading && !draft ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingState label="초안 생성 중... (5~10초)" />
            </div>
          ) : draft ? (
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* 카테고리 선택 */}
              <div>
                <label className="field-label">게시할 카테고리</label>
                <select
                  className="input"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* 제목 */}
              <div>
                <label className="field-label">제목</label>
                <input
                  className="input"
                  value={draft.titleKo}
                  onChange={(e) => setDraft({ ...draft, titleKo: e.target.value })}
                  maxLength={200}
                />
              </div>

              {/* 본문 */}
              <div>
                <label className="field-label">본문 (마크다운 가능)</label>
                <textarea
                  className="input min-h-[280px] resize-y"
                  value={draft.bodyKo}
                  onChange={(e) => setDraft({ ...draft, bodyKo: e.target.value })}
                />
              </div>

              {/* 추천 전문가 — 게시 안 하고 직접 컨택 */}
              {matched.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.10]/[0.04] p-4">
                  <p className="text-xs font-bold text-zinc-400">
                    💡 이 task에 맞는 전문가 {matched.length}명 — 게시 없이 직접 컨택 가능
                  </p>
                  <div className="space-y-1.5">
                    {matched.map((m) => (
                      <Link
                        key={m.id}
                        href={`/u/${m.userId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/[0.10]/[0.06]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white">
                            {m.user?.name || "익명"}
                          </p>
                          <p className="truncate text-[0.7rem] text-zinc-400">{m.headline}</p>
                          {m.skills.length > 0 ? (
                            <p className="truncate text-[0.65rem] text-zinc-500">
                              {m.skills.slice(0, 4).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-[0.7rem] font-semibold text-zinc-400">
                          프로필 →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
          ) : (
            <div className="flex-1 space-y-4 p-5">
              <div className="rounded-2xl border border-white/12 bg-white/[0.10]/[0.06] p-4">
                <p className="text-sm font-semibold text-zinc-200">
                  외주 역할을 입력하고 <strong>[초안 자동 작성]</strong>을 누르세요.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  모집 글 제목·본문이 자동으로 작성되고, 매칭되는 전문가도 함께 추천됩니다.
                </p>
              </div>

              {/* 추천 전문가 — 초안 없어도 미리 노출 */}
              {matched.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs font-bold text-zinc-400">
                    이 task에 맞는 전문가 {matched.length}명 — 게시 없이 직접 컨택 가능
                  </p>
                  <div className="space-y-1.5">
                    {matched.map((m) => (
                      <Link
                        key={m.id}
                        href={`/u/${m.userId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/[0.10]/[0.06]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white">
                            {m.user?.name || "익명"}
                          </p>
                          <p className="truncate text-[0.7rem] text-zinc-400">{m.headline}</p>
                          {m.skills.length > 0 ? (
                            <p className="truncate text-[0.65rem] text-zinc-500">
                              {m.skills.slice(0, 4).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-[0.7rem] font-semibold text-zinc-400">
                          프로필 →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 p-4">
            <p className="text-xs text-zinc-500">
              게시하면 이 task는 자동으로 “외주 진행 중”으로 표시됩니다.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
                취소
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={!draft || posting}
                className="btn-primary px-5 py-2 text-sm"
              >
                {posting ? "게시 중..." : "커뮤니티에 게시"}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
