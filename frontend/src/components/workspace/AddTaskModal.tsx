"use client";

/**
 * 어디서든 일정(task) 빠르게 추가하는 공용 모달.
 *  - 워크스페이스 선택 → 단계 → 내용 + 마감일 + (선택) 담당자
 *  - /schedule, DM 채팅 헤더 등에서 임베드 사용
 *
 * defaultAssigneeId가 주어지면 (DM 상대 등) 담당자 자동 prefill.
 */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

type WorkspaceItem = { ideaId: string; title: string; isOwner: boolean };
type Stage = { id: string; stageNumber: number; name: string };
type Member = { id: string; name: string | null; email: string };

export default function AddTaskModal({
  open,
  onClose,
  onCreated,
  defaultAssigneeId,
  defaultIdeaId,
  defaultDueDate,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  /** DM 상대 등 — 담당자 자동 prefill (그 user가 워크스페이스 멤버일 때만 적용됨) */
  defaultAssigneeId?: string;
  /** 특정 워크스페이스 prefill (선택) */
  defaultIdeaId?: string;
  /** 마감일 prefill (YYYY-MM-DD) — 캘린더 날짜 클릭 시 */
  defaultDueDate?: string;
}) {
  const { token, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ideaId, setIdeaId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(() => {
    if (defaultDueDate) return defaultDueDate;
    // 기본 마감일: 1주 후
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  // open 시 defaultDueDate 변경되면 동기화
  useEffect(() => {
    if (defaultDueDate) setDueDate(defaultDueDate);
  }, [defaultDueDate]);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 모달 열릴 때 — 내 워크스페이스 목록 fetch
  useEffect(() => {
    if (!open || !token) return;
    setError("");
    api<{ workspaces: WorkspaceItem[] }>("GET", "/api/workspace/my-list", undefined, token)
      .then((res) => {
        setWorkspaces(res.workspaces);
        const initial = defaultIdeaId && res.workspaces.find((w) => w.ideaId === defaultIdeaId)
          ? defaultIdeaId
          : res.workspaces[0]?.ideaId ?? "";
        setIdeaId(initial);
      })
      .catch((caught) => setError(readError(caught, "워크스페이스 목록 실패")));
  }, [open, token, defaultIdeaId]);

  // ideaId 변경 시 — stages + members fetch
  useEffect(() => {
    if (!open || !token || !ideaId) {
      setStages([]);
      setMembers([]);
      setStageId("");
      return;
    }
    Promise.all([
      api<{ stages: Stage[] }>("GET", `/api/workspace/${ideaId}`, undefined, token).then((r: any) => ({ stages: r.stages as Stage[] })),
      api<{ members: Array<{ user: Member }> }>("GET", `/api/workspace/${ideaId}/members`, undefined, token).catch(() => ({ members: [] as Array<{ user: Member }> })),
    ])
      .then(([stagesRes, membersRes]) => {
        const sortedStages = [...stagesRes.stages].sort((a, b) => a.stageNumber - b.stageNumber);
        setStages(sortedStages);
        // 첫 번째 PENDING/ACTIVE stage 또는 1번
        const firstActive = sortedStages.find((s: any) => s.status === "ACTIVE") ?? sortedStages[0];
        setStageId(firstActive?.id ?? "");

        const memberList: Member[] = membersRes.members.map((m) => m.user);
        // 본인도 멤버 후보로
        if (user) memberList.unshift({ id: user.id, name: user.name ?? null, email: user.email });
        setMembers(memberList);

        // 담당자 prefill — 멤버 중 매칭되는 사람 있으면 set
        if (defaultAssigneeId && memberList.some((m) => m.id === defaultAssigneeId)) {
          setAssigneeId(defaultAssigneeId);
        } else {
          setAssigneeId("");
        }
      })
      .catch((caught) => setError(readError(caught, "단계·멤버 불러오기 실패")));
  }, [open, token, ideaId, defaultAssigneeId, user]);

  const peerIsMember = useMemo(() => {
    if (!defaultAssigneeId) return null;
    return members.some((m) => m.id === defaultAssigneeId);
  }, [defaultAssigneeId, members]);

  async function handleSubmit() {
    if (!token || !stageId || !content.trim()) return;
    setLoading(true);
    setError("");
    try {
      // 1. task 생성
      const createRes = await api<{ task: { id: string } }>(
        "POST",
        `/api/workspace/stages/${stageId}/tasks`,
        { content: content.trim() },
        token,
      );
      const taskId = createRes.task.id;

      // 2. dueDate / assigneeId 설정 (PATCH)
      const patch: Record<string, unknown> = {};
      if (dueDate) patch.dueDate = dueDate;
      if (assigneeId) patch.assigneeId = assigneeId;
      if (Object.keys(patch).length > 0) {
        await api("PATCH", `/api/workspace/tasks/${taskId}`, patch, token);
      }

      // 초기화 + 닫기
      setContent("");
      onCreated?.();
      onClose();
    } catch (caught) {
      setError(readError(caught, "추가 실패"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
      />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">새 일정</p>
            <h3 className="mt-0.5 text-lg font-semibold text-white">일정 추가</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="space-y-3 p-5">
          {/* 워크스페이스 */}
          {workspaces.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
              워크스페이스가 없습니다. 먼저 [아이디어 만들기]로 만들어주세요.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  워크스페이스
                </label>
                <select
                  value={ideaId}
                  onChange={(e) => setIdeaId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                >
                  {workspaces.map((w) => (
                    <option key={w.ideaId} value={w.ideaId}>
                      {w.title} {w.isOwner ? "" : "(멤버)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* 단계 */}
              <div>
                <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  단계
                </label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      0{s.stageNumber}. {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 내용 */}
              <div>
                <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  작업 내용
                </label>
                <input
                  autoFocus
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="예: 와이어프레임 초안 / 결제 PG 연동 / 인터뷰 정리"
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 마감일 */}
                <div>
                  <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                    마감일
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                  />
                </div>

                {/* 담당자 */}
                <div>
                  <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                    담당자 (선택)
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                  >
                    <option value="">— 담당자 없음 —</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === user?.id ? "나" : m.name ?? m.email.split("@")[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DM 상대가 멤버 아님 안내 */}
              {defaultAssigneeId && peerIsMember === false ? (
                <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.7rem] text-zinc-300">
                  이 사람은 선택한 워크스페이스 멤버가 아닙니다. 담당자 할당하려면 먼저 [+ 멤버로 추가] 후 다시 시도하세요.
                </p>
              ) : null}
            </>
          )}

          {error ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 bg-white/[0.02] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !stageId || !content.trim() || workspaces.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-zinc-500 disabled:shadow-none"
          >
            {loading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                추가 중…
              </>
            ) : (
              "추가하기"
            )}
          </button>
        </footer>
      </div>
    </>
  );
}
