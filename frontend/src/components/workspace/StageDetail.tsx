"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import OutsourceModal from "@/components/workspace/OutsourceModal";
import TaskApplicantsModal from "@/components/workspace/TaskApplicantsModal";
import { STAGE_RESOURCES } from "@/data/stageResources";
import { STAGE_GOALS } from "@/data/stageGoals";
import type { WorkspaceStage, WorkspaceTask } from "@/app/workspace/[ideaId]/page";

type Member = { id: string; name: string | null; email: string };

export default function StageDetail({
  stage,
  ideaTitle,
  onClose,
  onChanged,
}: {
  stage: WorkspaceStage;
  ideaTitle: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newTask, setNewTask] = useState("");
  const [outsourceTask, setOutsourceTask] = useState<WorkspaceTask | null>(null);
  const [applicantsTaskId, setApplicantsTaskId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // 워크스페이스 멤버 목록 (담당자 선택용)
  useEffect(() => {
    if (!token) return;
    api<{ members: Array<{ user: Member }> }>(
      "GET",
      `/api/workspace/${stage.ideaId}/members`,
      undefined,
      token,
    ).then((res) => setMembers(res.members.map((m) => m.user))).catch(() => {});
  }, [token, stage.ideaId]);

  async function toggleStatus(task: WorkspaceTask, next: WorkspaceTask["status"]) {
    if (!token) return;
    setBusy(task.id);
    setError("");
    try {
      await api("PATCH", `/api/workspace/tasks/${task.id}`, { status: next }, token);
      onChanged();
    } catch (caught) {
      setError(readError(caught, "변경 실패."));
    } finally {
      setBusy(null);
    }
  }

  async function saveTaskDetail(taskId: string, patch: { assigneeId?: string | null; dueDate?: string | null; notes?: string | null; outsourceRole?: string | null }) {
    if (!token) return;
    try {
      await api("PATCH", `/api/workspace/tasks/${taskId}`, patch, token);
      onChanged();
    } catch (caught) {
      setError(readError(caught, "저장 실패."));
    }
  }

  async function addTask() {
    if (!token || !newTask.trim()) return;
    setBusy("add");
    setError("");
    try {
      await api("POST", `/api/workspace/stages/${stage.id}/tasks`, { content: newTask.trim() }, token);
      setNewTask("");
      onChanged();
    } catch (caught) {
      setError(readError(caught, "추가 실패."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteTask(task: WorkspaceTask) {
    if (!token || !task.isCustom) return;
    if (!confirm("이 항목을 삭제할까요?")) return;
    setBusy(task.id);
    try {
      await api("DELETE", `/api/workspace/tasks/${task.id}`, undefined, token);
      onChanged();
    } catch (caught) {
      setError(readError(caught, "삭제 실패."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        role="button" tabIndex={-1} aria-label="닫기"
        onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}
      />

      <div className="fixed inset-x-0 bottom-0 top-12 z-50 mx-auto w-full max-w-3xl overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950 shadow-2xl sm:inset-x-4 sm:top-16 sm:rounded-3xl lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[720px]">
        <div className="flex h-full max-h-[calc(100vh-3rem)] flex-col">

          {/* Header */}
          <header className="space-y-3 border-b border-white/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">{ideaTitle}</p>
                <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                  <span className="text-zinc-600">0{stage.stageNumber}.</span> {stage.name}
                </h2>
              </div>
              <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <StageGoalBanner stage={stage} />
          </header>

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <NextActionHero stage={stage} />
            <StageResourcesBox stageNumber={stage.stageNumber} />
            <StageFilesBox stageId={stage.id} />

            <div className="space-y-2">
              {stage.tasks.length === 0 ? (
                <p className="text-sm text-zinc-500">아직 task가 없습니다.</p>
              ) : (
                stage.tasks.map((t) => {
                  const checked = t.status === "DONE" || t.status === "SKIPPED" || t.status === "OUTSOURCED";
                  const isOpen = openTaskId === t.id;
                  return (
                    <div key={t.id} className={`rounded-xl border transition-colors ${isOpen ? "border-white/20 bg-white/[0.10]/[0.05]" : checked ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.03]"}`}>
                      {/* Task row */}
                      <div className="group flex items-start gap-3 p-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          disabled={busy === t.id}
                          onClick={() => toggleStatus(t, t.status === "DONE" ? "PENDING" : "DONE")}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                            t.status === "DONE" ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                              : t.status === "OUTSOURCED" ? "border-white/30 bg-white/30 text-zinc-950"
                              : t.status === "SKIPPED" ? "border-zinc-600 bg-zinc-700 text-zinc-300"
                              : "border-zinc-600 hover:border-emerald-400"
                          }`}
                        >
                          {t.status === "DONE" ? <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                            : t.status === "OUTSOURCED" ? <span className="text-[0.5rem] font-black">外</span>
                            : t.status === "SKIPPED" ? <span className="text-[0.5rem]">—</span>
                            : null}
                        </button>

                        {/* Content + meta */}
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setOpenTaskId(isOpen ? null : t.id)}
                            className="w-full text-left"
                          >
                            <p className={`text-sm leading-6 ${checked ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                              {t.content}
                            </p>
                          </button>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {t.assignee ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[0.65rem] text-zinc-200">
                                👤 {t.assignee.name || t.assignee.email.split("@")[0]}
                              </span>
                            ) : null}
                            {t.dueDate ? (
                              <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] ${
                                new Date(t.dueDate) < new Date() && t.status !== "DONE"
                                  ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
                                  : "border-amber-400/25 bg-white/[0.06] text-zinc-200"
                              }`}>
                                📅 {new Date(t.dueDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                              </span>
                            ) : null}
                            {t.notes ? (
                              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] text-zinc-400">
                                📝 메모 있음
                              </span>
                            ) : null}
                            {t.outsourceRole ? (
                              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[0.65rem] text-zinc-300">🛠 {t.outsourceRole}</span>
                            ) : null}
                            {t.isCustom ? (
                              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[0.65rem] text-zinc-400">사용자 추가</span>
                            ) : null}
                            {t.status === "OUTSOURCED" && t.communityPostId ? (
                              <>
                                <a href={`/community/${t.communityPostId}`} target="_blank" rel="noopener noreferrer" className="text-[0.7rem] font-semibold text-zinc-400 hover:underline">
                                  외주 글 →
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setApplicantsTaskId(t.id); }}
                                  className="rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[0.65rem] font-semibold text-zinc-200 hover:bg-white/[0.10]"
                                  title="이 글에 댓글·DM 보낸 지원자 보기"
                                >
                                  지원자 보기
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {t.status !== "OUTSOURCED" && t.status !== "DONE" ? (
                            <button
                              type="button"
                              onClick={() => setOutsourceTask(t)}
                              className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[0.7rem] font-semibold text-zinc-200 hover:bg-white/[0.10]"
                              title={t.outsourceRole ? `${t.outsourceRole} 도움받기` : "외주·전문가 도움받기"}
                            >
                              도움받기
                            </button>
                          ) : null}
                          {t.status !== "SKIPPED" && t.status !== "DONE" ? (
                            <button type="button" onClick={() => toggleStatus(t, "SKIPPED")} className="rounded-md border border-white/10 px-2 py-1 text-[0.7rem] text-zinc-400 hover:bg-white/5" title="건너뛰기">—</button>
                          ) : null}
                          {t.isCustom ? (
                            <button type="button" onClick={() => deleteTask(t)} className="rounded-md px-2 py-1 text-[0.7rem] text-rose-300 hover:bg-rose-500/10">삭제</button>
                          ) : null}
                        </div>
                      </div>

                      {/* Expandable detail panel */}
                      {isOpen ? (
                        <TaskDetailPanel
                          task={t}
                          members={members}
                          onSave={(patch) => saveTaskDetail(t.id, patch)}
                        />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>

          {/* Footer */}
          <footer className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="새 항목 추가 (예: 사업자등록 후 카카오 챗봇 연동 검토)"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
              />
              <button type="button" onClick={addTask} disabled={!newTask.trim() || busy === "add"} className="btn-secondary px-4">추가</button>
            </div>
          </footer>
        </div>
      </div>

      {outsourceTask ? (
        <OutsourceModal task={outsourceTask} onClose={() => setOutsourceTask(null)} onPosted={() => { setOutsourceTask(null); onChanged(); }} />
      ) : null}
      {applicantsTaskId ? (
        <TaskApplicantsModal
          taskId={applicantsTaskId}
          ideaId={stage.ideaId}
          onClose={() => setApplicantsTaskId(null)}
        />
      ) : null}
    </>
  );
}

/* ─── 태스크 상세 패널 ──────────────────────────────────────── */
type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
};

function TaskDetailPanel({
  task,
  members,
  onSave,
}: {
  task: WorkspaceTask;
  members: Member[];
  onSave: (patch: { assigneeId?: string | null; dueDate?: string | null; notes?: string | null; outsourceRole?: string | null }) => void;
}) {
  const { token, user } = useAuth();
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [dueDate, setDueDate] = useState<string>(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
  );
  const [notes, setNotes] = useState<string>(task.notes ?? "");
  const [outsourceRole, setOutsourceRole] = useState<string>(task.outsourceRole ?? "");
  const [saved, setSaved] = useState(false);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ comments: TaskComment[] }>(
      "GET",
      `/api/workspace/tasks/${task.id}/comments`,
      undefined,
      token,
    ).then((r) => setComments(r.comments)).catch(() => {});
  }, [token, task.id]);

  function handleSave() {
    onSave({
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      notes: notes || null,
      outsourceRole: outsourceRole.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleAddComment() {
    if (!commentText.trim() || !token) return;
    setCommentSending(true);
    try {
      const res = await api<{ comment: TaskComment }>(
        "POST",
        `/api/workspace/tasks/${task.id}/comments`,
        { content: commentText.trim() },
        token,
      );
      setComments((prev) => [...prev, res.comment]);
      setCommentText("");
    } catch {
      // silent
    } finally {
      setCommentSending(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token) return;
    try {
      await api("DELETE", `/api/workspace/tasks/${task.id}/comments/${commentId}`, undefined, token);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // silent
    }
  }

  return (
    <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-4">
      {/* 담당자 + 마감일 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">담당자</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-white/30 focus:outline-none"
          >
            <option value="">담당자 없음</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.email.split("@")[0]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">마감일</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-white/30 focus:outline-none"
          />
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">메모 / 작업 내용</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="기획서 내용, 링크, 진행 상황 등을 적어두세요."
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/30 focus:outline-none resize-none"
        />
      </div>

      {/* 외주 역할 — 입력하고 저장하면 [도움받기] 버튼 노출 */}
      <div>
        <label className="mb-1 flex items-baseline gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
          외주 / 영입 역할
          <span className="text-[0.6rem] font-normal normal-case text-zinc-600">
            — 적어두면 [도움받기] 버튼 노출 + 외주 글 자동 작성
          </span>
        </label>
        <input
          type="text"
          value={outsourceRole}
          onChange={(e) => setOutsourceRole(e.target.value)}
          placeholder="예: 와이어프레임·디자인 / 결제 PG 연동 / IR 멘토링"
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/30 focus:outline-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-white/[0.10] px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.15]"
        >
          {saved ? "✓ 저장됨" : "저장"}
        </button>
      </div>

      {/* 댓글 */}
      <div className="space-y-2 border-t border-white/[0.06] pt-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
          댓글 {comments.length > 0 ? `(${comments.length})` : ""}
        </p>

        {comments.length > 0 && (
          <ul className="space-y-2">
            {comments.map((c) => {
              const isMe = c.author.id === user?.id;
              return (
                <li key={c.id} className="group flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[0.55rem] font-bold text-zinc-300">
                    {(c.author.name ?? c.author.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[0.7rem] font-semibold text-zinc-300">
                        {c.author.name ?? c.author.email.split("@")[0]}
                      </span>
                      <span className="text-[0.6rem] text-zinc-600">
                        {new Date(c.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">{c.content}</p>
                  </div>
                  {isMe && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-[0.65rem] text-rose-400 hover:text-rose-300 transition-opacity"
                    >
                      삭제
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {comments.length === 0 && (
          <p className="text-xs text-zinc-600">아직 댓글이 없습니다.</p>
        )}

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/30 focus:outline-none"
            placeholder="댓글 입력..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
          />
          <button
            type="button"
            onClick={handleAddComment}
            disabled={commentSending || !commentText.trim()}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.10] disabled:opacity-40"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 단계별 리소스 박스 ────────────────────────────────────── */
function StageResourcesBox({ stageNumber }: { stageNumber: number }) {
  const res = STAGE_RESOURCES[stageNumber];
  if (!res || !res.groups || res.groups.length === 0) return null;
  const totalItems = res.groups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="space-y-4 rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5">
      <header className="space-y-1.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          이 단계에서 진짜 필요한 것 · 도구 {totalItems}개
        </p>
        {res.nextAction ? <p className="text-base font-bold leading-snug text-white">✦ {res.nextAction}</p> : null}
      </header>
      <div className="space-y-5">
        {res.groups.map((g) => (
          <div key={g.title} className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-base">{g.icon}</span>
              <h4 className="text-sm font-bold text-white">{g.title}</h4>
              {g.description ? <span className="text-xs text-zinc-500">— {g.description}</span> : null}
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {g.items.map((item, i) => (
                <li key={`${item.url}-${i}`}><ResourceItem item={item} /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceItem({ item }: { item: { label: string; url: string; outcome?: string; badge?: string } }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="group block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-all hover:border-white/20 hover:bg-white/[0.10]/[0.08]">
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-sm font-bold text-white group-hover:text-zinc-100">{item.label}</span>
        {item.badge ? (
          <span className={`rounded px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wider ${
            item.badge === "정부" ? "bg-white/[0.08] text-zinc-200"
              : item.badge === "한국" ? "bg-rose-500/15 text-rose-300"
              : item.badge === "무료" ? "bg-white/[0.08] text-zinc-200"
              : item.badge === "추천" ? "bg-white/[0.12] text-zinc-100"
              : "bg-zinc-700 text-zinc-300"
          }`}>{item.badge}</span>
        ) : null}
      </div>
      {item.outcome ? <p className="mt-1 text-xs leading-relaxed text-zinc-400 group-hover:text-zinc-300">→ {item.outcome}</p> : null}
    </a>
  );
}

/* ─── 단계별 첨부 파일 박스 ────────────────────────────────────── */
type StageFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  note: string | null;
  createdAt: string;
  uploader: { id: string; name: string | null; email: string };
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

function fileEmoji(mime: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf" || ext === "pdf") return "📕";
  if (ext === "docx" || ext === "doc") return "📘";
  if (ext === "hwpx" || ext === "hwp") return "📗";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "📊";
  if (ext === "pptx" || ext === "ppt") return "📙";
  if (ext === "zip" || ext === "rar") return "🗂";
  return "📄";
}

function StageFilesBox({ stageId }: { stageId: string }) {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<StageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api<{ files: StageFile[] }>(
        "GET",
        `/api/workspace/stages/${stageId}/files`,
        undefined,
        token,
      );
      setFiles(res.files);
    } catch (caught) {
      setError(readError(caught, "파일 목록 불러오기 실패"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, token]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("25MB 이하 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/workspace/stages/${stageId}/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = txt;
        try { msg = JSON.parse(txt).error ?? txt; } catch {}
        throw new Error(msg || "업로드 실패");
      }
      await refresh();
    } catch (caught) {
      setError(readError(caught, "업로드 실패"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onDownload(f: StageFile) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/workspace/files/${f.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("다운로드 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(readError(caught, "다운로드 실패"));
    }
  }

  async function onDelete(f: StageFile) {
    if (!token) return;
    if (!window.confirm(`"${f.filename}" 파일을 삭제할까요?`)) return;
    try {
      await api("DELETE", `/api/workspace/files/${f.id}`, undefined, token);
      await refresh();
    } catch (caught) {
      setError(readError(caught, "삭제 실패"));
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/[0.05] to-sky-500/[0.01] p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sky-300">
            단계 자료 · 파일 첨부
          </p>
          <p className="mt-0.5 text-sm text-zinc-300">
            사업자등록증, 외주 견적서, 와이어프레임 등 — 단계 컨텍스트로 묶어서 보관
          </p>
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {uploading ? "업로드 중..." : "+ 파일 업로드"}
          <input type="file" className="hidden" onChange={onPick} disabled={uploading} />
        </label>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-zinc-500">불러오는 중...</p>
      ) : files.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
          아직 첨부된 파일이 없습니다. 25MB 이하 어떤 파일이든 올릴 수 있어요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => {
            const canDelete = user?.id === f.uploader.id;
            return (
              <li
                key={f.id}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-sky-400/40 hover:bg-white/[0.05]"
              >
                <span className="text-base">{fileEmoji(f.mimeType, f.filename)}</span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onDownload(f)}
                    className="block w-full truncate text-left text-sm font-semibold text-white hover:text-sky-200"
                    title="다운로드"
                  >
                    {f.filename}
                  </button>
                  <p className="text-[0.65rem] text-zinc-500">
                    {formatBytes(f.sizeBytes)} · {f.uploader.name ?? f.uploader.email} ·{" "}
                    {new Date(f.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDownload(f)}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.65rem] font-semibold text-zinc-300 hover:bg-white/[0.08]"
                >
                  다운로드
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(f)}
                    className="rounded-md px-2 py-1 text-[0.65rem] font-semibold text-rose-300 opacity-0 transition-opacity hover:bg-rose-500/10 group-hover:opacity-100"
                  >
                    삭제
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   StageGoalBanner — 단계 헤더에 "목표·결과물·기간" 압축 표시
   ───────────────────────────────────────────── */
function StageGoalBanner({ stage }: { stage: WorkspaceStage }) {
  const meta = STAGE_GOALS[stage.stageNumber];
  if (!meta) return null;
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:grid-cols-3">
      <div className="space-y-1">
        <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-zinc-500">목표</p>
        <p className="text-xs leading-snug text-zinc-200">{meta.goal}</p>
      </div>
      <div className="space-y-1 sm:border-l sm:border-white/5 sm:pl-3">
        <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-zinc-500">결과물</p>
        <p className="text-xs leading-snug text-zinc-200">{meta.outcome}</p>
      </div>
      <div className="space-y-1 sm:border-l sm:border-white/5 sm:pl-3">
        <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-zinc-500">예상 기간</p>
        <p className="text-xs leading-snug text-zinc-200">{meta.duration}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NextActionHero — "지금 당장 할 일" 강조 카드
   첫 PENDING task 또는 firstAction 매칭 task를 큰 hero로
   ───────────────────────────────────────────── */
function NextActionHero({ stage }: { stage: WorkspaceStage }) {
  const meta = STAGE_GOALS[stage.stageNumber];
  const pending = stage.tasks.find((t) => t.status === "PENDING");

  // 모든 task 완료
  if (!pending) {
    const total = stage.tasks.length;
    if (total === 0) return null;
    return (
      <div className="rounded-xl border border-white/15 bg-white/[0.10]/[0.06] p-4">
        <p className="text-sm font-bold text-zinc-200">이 단계의 모든 작업이 완료됐습니다</p>
        <p className="mt-0.5 text-xs text-zinc-500">{total}개 작업 완료. 다음 단계로 넘어가세요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.10]/[0.04] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          다음 할 일
        </p>
        {meta?.duration ? (
          <p className="text-[0.65rem] text-zinc-500">단계 예상 기간 {meta.duration}</p>
        ) : null}
      </div>
      <p className="mt-1.5 text-base font-bold leading-snug text-white">{pending.content}</p>
      {pending.outsourceRole ? (
        <p className="mt-1 text-xs text-zinc-400">
          외주 가능: <span className="text-zinc-200">{pending.outsourceRole}</span> — 아래 task 카드의 [도움받기]
        </p>
      ) : null}
      {meta?.pitfall ? (
        <p className="mt-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[0.7rem] text-zinc-400">
          <span className="text-zinc-300">참고:</span> {meta.pitfall}
        </p>
      ) : null}
    </div>
  );
}
