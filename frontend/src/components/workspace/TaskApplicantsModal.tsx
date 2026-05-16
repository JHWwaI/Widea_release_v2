"use client";

/**
 * 외주 task의 지원자 모음 모달.
 * 댓글 작성자 + 그 글로부터 시작된 DM 발송자 통합 표시.
 * 카드 클릭 시 1:1 DM 시작 / [+ 워크스페이스 멤버로 추가] 가능.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

type Applicant = {
  userId: string;
  name: string | null;
  email: string;
  userCode: string | null;
  channels: {
    commented: boolean;
    dmId: string | null;
    firstMessage: string | null;
  };
};

type ApplicantsResponse = {
  commentCount: number;
  dmCount: number;
  applicants: Applicant[];
};

export default function TaskApplicantsModal({
  taskId,
  ideaId,
  onClose,
}: {
  taskId: string;
  ideaId: string;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ApplicantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api<ApplicantsResponse>(
      "GET",
      `/api/workspace/tasks/${taskId}/applicants`,
      undefined,
      token,
    )
      .then((res) => setData(res))
      .catch((caught) => setError(readError(caught, "지원자 조회 실패")))
      .finally(() => setLoading(false));
  }, [token, taskId]);

  async function startOrOpenDm(a: Applicant) {
    if (!token) return;
    if (a.channels.dmId) {
      router.push(`/messages?dm=${a.channels.dmId}`);
      onClose();
      return;
    }
    // 댓글만 단 사람 — DM 새로 시작
    try {
      const res = await api<{ conversation: { id: string } }>(
        "POST",
        "/api/dm/start",
        { identifier: a.email },
        token,
      );
      router.push(`/messages?dm=${res.conversation.id}`);
      onClose();
    } catch (caught) {
      setError(readError(caught, "DM 시작 실패"));
    }
  }

  async function addToWorkspace(a: Applicant) {
    if (!token) return;
    setAdding(a.userId);
    try {
      await api(
        "POST",
        `/api/workspace/${ideaId}/members`,
        { targetUserId: a.userId, role: "EDITOR" },
        token,
      );
      alert(`${a.name ?? a.email}님이 워크스페이스 멤버(편집자)로 추가됐습니다.`);
    } catch (caught) {
      setError(readError(caught, "추가 실패"));
    } finally {
      setAdding(null);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
      />
      <div className="fixed left-1/2 top-1/2 z-[70] flex w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-white">지원자 모음</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              이 외주 글에 댓글을 달거나 DM을 보낸 사람들
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-6 text-center text-xs text-zinc-500">불러오는 중...</p>
          ) : !data || data.applicants.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              <p>아직 지원자가 없습니다.</p>
              <p className="mt-1 text-[0.7rem] text-zinc-600">
                글에 댓글이 달리거나 1:1 DM이 도착하면 여기에 모입니다.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.applicants.map((a) => {
                const initial = (a.name ?? a.email).trim()[0]?.toUpperCase() ?? "?";
                return (
                  <li
                    key={a.userId}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-sm font-bold text-white">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {a.name || a.email}
                        </p>
                        <p className="truncate text-[0.65rem] text-zinc-500">
                          {a.userCode ? `ID ${a.userCode}` : null}
                          {a.userCode && a.email ? " · " : null}
                          {a.email}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {a.channels.commented ? (
                            <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[0.6rem] font-semibold text-zinc-200">
                              댓글
                            </span>
                          ) : null}
                          {a.channels.dmId ? (
                            <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[0.6rem] font-semibold text-zinc-200">
                              DM
                            </span>
                          ) : null}
                        </div>
                        {a.channels.firstMessage ? (
                          <p className="mt-1.5 truncate rounded bg-white/[0.03] px-2 py-1 text-[0.65rem] text-zinc-400">
                            &ldquo;{a.channels.firstMessage}&rdquo;
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/u/${a.userId}`}
                        target="_blank"
                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.65rem] font-semibold text-zinc-300 hover:bg-white/[0.08]"
                      >
                        프로필
                      </Link>
                      <button
                        type="button"
                        onClick={() => startOrOpenDm(a)}
                        className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[0.65rem] font-semibold text-zinc-200 hover:bg-white/[0.10]"
                      >
                        메시지
                      </button>
                      <button
                        type="button"
                        onClick={() => addToWorkspace(a)}
                        disabled={adding === a.userId}
                        className="rounded-md border border-white/20 bg-white/[0.06] px-2 py-1 text-[0.65rem] font-bold text-zinc-200 hover:bg-white/[0.10] disabled:opacity-50"
                      >
                        {adding === a.userId ? "추가 중..." : "+ 멤버로"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-end border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            닫기
          </button>
        </footer>
      </div>
    </>
  );
}
