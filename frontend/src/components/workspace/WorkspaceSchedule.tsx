"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { WorkspaceStage, WorkspaceTask } from "@/app/workspace/[ideaId]/page";

type Member = { id: string; name: string | null; email: string };

type Props = {
  stages: WorkspaceStage[];
  ideaId: string;
  onChanged: () => void;
};

type Filter = "all" | "due_soon" | "overdue" | "mine";
type ViewMode = "stages" | "timeline";

type StageRef = { stageNumber: number; stageName: string };
type TaskWithStage = WorkspaceTask & { stage: StageRef };

/** "오늘 / 내일 / 이번 주 / ..." 같은 시간 버킷 분류 */
type TimeBucket =
  | "OVERDUE"
  | "TODAY"
  | "TOMORROW"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LATER"
  | "NO_DUE";

const BUCKET_META: Record<TimeBucket, { label: string; emoji: string; ring: string; tone: string }> = {
  OVERDUE:    { label: "기한 초과",  emoji: "⚠️",  ring: "ring-rose-400/30",    tone: "text-rose-300" },
  TODAY:      { label: "오늘 마감",  emoji: "🔥",  ring: "ring-white/15",   tone: "text-zinc-200" },
  TOMORROW:   { label: "내일 마감",  emoji: "📅",  ring: "ring-amber-400/20",   tone: "text-zinc-200" },
  THIS_WEEK:  { label: "이번 주",    emoji: "📆",  ring: "ring-white/15",  tone: "text-zinc-200" },
  THIS_MONTH: { label: "이번 달",    emoji: "🗓",   ring: "ring-white/20",  tone: "text-zinc-300" },
  LATER:      { label: "이후",       emoji: "⏳",  ring: "ring-white/10",       tone: "text-zinc-400" },
  NO_DUE:     { label: "기한 없음",  emoji: "—",    ring: "ring-white/5",        tone: "text-zinc-500" },
};

function classifyBucket(due: string | null, status: WorkspaceTask["status"]): TimeBucket {
  if (status !== "PENDING") return "NO_DUE"; // 완료된 건 시간순에서 제외 (별도 처리)
  if (!due) return "NO_DUE";
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "OVERDUE";
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "TOMORROW";
  if (diffDays <= 7) return "THIS_WEEK";
  if (diffDays <= 30) return "THIS_MONTH";
  return "LATER";
}

const STATUS_OPTS: { value: WorkspaceTask["status"]; label: string; emoji: string }[] = [
  { value: "PENDING", label: "대기", emoji: "○" },
  { value: "DONE", label: "완료", emoji: "✓" },
  { value: "SKIPPED", label: "스킵", emoji: "—" },
  { value: "OUTSOURCED", label: "외주", emoji: "🤝" },
];

const STATUS_BADGE: Record<WorkspaceTask["status"], string> = {
  PENDING: "bg-zinc-700 text-zinc-300 ring-white/10",
  DONE: "bg-white/[0.08] text-zinc-200 ring-white/15",
  SKIPPED: "bg-zinc-700 text-zinc-500 ring-white/5",
  OUTSOURCED: "bg-white/[0.08] text-zinc-200 ring-white/15",
};

const STATUS_LABEL: Record<WorkspaceTask["status"], string> = {
  PENDING: "대기",
  DONE: "완료",
  SKIPPED: "스킵",
  OUTSOURCED: "외주",
};

function dueDateInfo(due: string | null): {
  text: string;
  className: string;
} {
  if (!due) return { text: "마감일 없음", className: "text-zinc-600" };
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  if (diffDays < 0) return { text: `${dateStr} · ${-diffDays}일 지남`, className: "text-rose-300" };
  if (diffDays === 0) return { text: `${dateStr} · 오늘`, className: "text-zinc-200" };
  if (diffDays === 1) return { text: `${dateStr} · 내일`, className: "text-zinc-200" };
  if (diffDays <= 7) return { text: `${dateStr} · ${diffDays}일 후`, className: "text-zinc-300" };
  return { text: dateStr, className: "text-zinc-500" };
}

function memberInitial(m: Member): string {
  return (m.name ?? m.email).trim()[0]?.toUpperCase() ?? "?";
}

export default function WorkspaceSchedule({ stages, ideaId, onChanged }: Props) {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<{ stageId: string; value: string } | null>(null);
  const [editingDue, setEditingDue] = useState<string | null>(null);
  const [editingAssignee, setEditingAssignee] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<ViewMode>("stages");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ members: Array<{ user: Member }> }>(
      "GET",
      `/api/workspace/${ideaId}/members`,
      undefined,
      token,
    )
      .then((r) => setMembers(r.members.map((m) => m.user)))
      .catch(() => {});
  }, [token, ideaId]);

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    if (!token) return;
    setSaving(true);
    try {
      await api("PATCH", `/api/workspace/tasks/${taskId}`, patch, token);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function addTask(stageId: string, content: string) {
    if (!token || !content.trim()) return;
    setSaving(true);
    try {
      await api("POST", `/api/workspace/stages/${stageId}/tasks`, { content: content.trim() }, token);
      setAdding(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  function toggleCollapse(stageId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  function passesFilter(t: WorkspaceTask): boolean {
    if (filter === "all") return true;
    if (filter === "mine") return t.assigneeId === user?.id;
    if (filter === "overdue") {
      if (!t.dueDate || t.status !== "PENDING") return false;
      return new Date(t.dueDate) < today;
    }
    if (filter === "due_soon") {
      if (!t.dueDate || t.status !== "PENDING") return false;
      const diff = (new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }
    return true;
  }

  // 모든 task를 단계 정보 포함해서 평탄화
  const allTasksFlat: TaskWithStage[] = useMemo(() => {
    return stages.flatMap((s) =>
      s.tasks.map((t) => ({
        ...t,
        stage: { stageNumber: s.stageNumber, stageName: s.name },
      })),
    );
  }, [stages]);

  // "지금 급한 것" — 기한 초과 + 오늘 + 내일 (PENDING만)
  const urgentTasks = useMemo(() => {
    return allTasksFlat
      .filter((t) => {
        if (t.status !== "PENDING") return false;
        const b = classifyBucket(t.dueDate, t.status);
        return b === "OVERDUE" || b === "TODAY" || b === "TOMORROW";
      })
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [allTasksFlat]);

  // 시간순 버킷 (필터 적용)
  const timelineGroups = useMemo(() => {
    const buckets: Record<TimeBucket, TaskWithStage[]> = {
      OVERDUE: [],
      TODAY: [],
      TOMORROW: [],
      THIS_WEEK: [],
      THIS_MONTH: [],
      LATER: [],
      NO_DUE: [],
    };
    for (const t of allTasksFlat) {
      // 시간순 뷰는 PENDING 위주. 완료된 건 NO_DUE로 분리하지 않고 별도 표시.
      // 필터 inline (passesFilter 동등 로직)
      if (filter === "mine" && t.assigneeId !== user?.id) continue;
      if (filter === "overdue") {
        if (!t.dueDate || t.status !== "PENDING") continue;
        if (new Date(t.dueDate) >= today) continue;
      }
      if (filter === "due_soon") {
        if (!t.dueDate || t.status !== "PENDING") continue;
        const diff = (new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        if (diff < 0 || diff > 7) continue;
      }
      const b = classifyBucket(t.dueDate, t.status);
      buckets[b].push(t);
    }
    for (const k of Object.keys(buckets) as TimeBucket[]) {
      buckets[k].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return buckets;
  }, [allTasksFlat, filter, user, today]);

  // 전체 통계
  const stats = useMemo(() => {
    const all = stages.flatMap((s) => s.tasks);
    const total = all.length;
    const done = all.filter((t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED").length;
    const overdue = all.filter(
      (t) => t.dueDate && new Date(t.dueDate) < today && t.status === "PENDING",
    ).length;
    const dueSoon = all.filter(
      (t) => {
        if (!t.dueDate || t.status !== "PENDING") return false;
        const diff = (new Date(t.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      },
    ).length;
    const mine = user ? all.filter((t) => t.assigneeId === user.id && t.status === "PENDING").length : 0;
    return { total, done, overdue, dueSoon, mine };
  }, [stages, today, user]);

  function FilterChip({ value, label, count, accent }: { value: Filter; label: string; count: number; accent?: string }) {
    const active = filter === value;
    return (
      <button
        type="button"
        onClick={() => setFilter(value)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          active
            ? "bg-white/[0.10] text-white"
            : "border border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]"
        }`}
      >
        <span>{label}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums ${
            active ? "bg-white/20 text-white" : accent ?? "bg-zinc-700 text-zinc-300"
          }`}
        >
          {count}
        </span>
      </button>
    );
  }

  return (
    <section className="space-y-4">
      {/* 상단 요약 + 필터 */}
      <header className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              일정
            </p>
            <p className="mt-0.5 text-sm text-zinc-300">
              전체 {stats.total}개 · 완료 {stats.done}개{" "}
              {stats.total > 0 ? (
                <span className="text-zinc-500">
                  ({Math.round((stats.done / stats.total) * 100)}%)
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex w-full max-w-[260px] flex-col gap-1 sm:max-w-[320px]">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-zinc-300 to-white transition-[width]"
                style={{
                  width:
                    stats.total === 0 ? "0%" : `${Math.round((stats.done / stats.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip value="all" label="전체" count={stats.total} />
            <FilterChip value="mine" label="내 일" count={stats.mine} accent="bg-white/[0.10] text-zinc-200" />
            <FilterChip value="due_soon" label="이번주" count={stats.dueSoon} accent="bg-white/[0.10] text-zinc-200" />
            <FilterChip value="overdue" label="기한 초과" count={stats.overdue} accent="bg-rose-500/20 text-rose-200" />
          </div>
          {/* 뷰 토글 */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            <button
              type="button"
              onClick={() => setView("timeline")}
              className={`rounded-md px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${view === "timeline" ? "bg-white/[0.10] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              ⏱ 시간순
            </button>
            <button
              type="button"
              onClick={() => setView("stages")}
              className={`rounded-md px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${view === "stages" ? "bg-white/[0.10] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              🗂 단계순
            </button>
          </div>
        </div>
      </header>

      {/* 지금 급한 것 — 기한 초과 + 오늘 + 내일 마감 task 강조 */}
      {urgentTasks.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/[0.07] via-amber-500/[0.04] to-transparent p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-rose-200">
              🔥 지금 가장 급한 것 {urgentTasks.length}개
            </p>
            <p className="text-[0.65rem] text-rose-300/70">
              기한 초과 · 오늘 · 내일 마감
            </p>
          </div>
          <ul className="space-y-1.5">
            {urgentTasks.slice(0, 5).map((t) => {
              const due = dueDateInfo(t.dueDate);
              const assignee = members.find((m) => m.id === t.assigneeId);
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => patchTask(t.id, { status: "DONE" })}
                    disabled={saving}
                    title="완료"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/15 hover:border-white/25 hover:bg-white/[0.06]"
                  >
                    {""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-100">{t.content}</p>
                    <p className="truncate text-[0.65rem] text-zinc-500">
                      0{t.stage.stageNumber}. {t.stage.stageName}
                      {assignee ? <> · 👤 {assignee.name ?? assignee.email.split("@")[0]}</> : null}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full bg-white/[0.04] px-2 py-1 text-[0.65rem] font-semibold ${due.className}`}>
                    📅 {due.text}
                  </span>
                </li>
              );
            })}
          </ul>
          {urgentTasks.length > 5 ? (
            <p className="pt-1 text-center text-[0.65rem] text-zinc-500">
              + {urgentTasks.length - 5}개 더
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 시간순 뷰 */}
      {view === "timeline" ? (
        <div className="space-y-3">
          {(["OVERDUE", "TODAY", "TOMORROW", "THIS_WEEK", "THIS_MONTH", "LATER", "NO_DUE"] as TimeBucket[]).map((bucket) => {
            const items = timelineGroups[bucket];
            if (items.length === 0) return null;
            const meta = BUCKET_META[bucket];
            return (
              <div key={bucket} className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] ring-1 ${meta.ring}`}>
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-2">
                  <p className={`flex items-center gap-2 text-sm font-bold ${meta.tone}`}>
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </p>
                  <span className="text-[0.65rem] tabular-nums text-zinc-500">{items.length}개</span>
                </div>
                <ul>
                  {items.map((task) => {
                    const due = dueDateInfo(task.dueDate);
                    const isCompleted =
                      task.status === "DONE" || task.status === "SKIPPED" || task.status === "OUTSOURCED";
                    const assignee = members.find((m) => m.id === task.assigneeId);
                    return (
                      <li
                        key={task.id}
                        className="group flex items-start gap-3 border-t border-white/[0.04] px-4 py-2.5 hover:bg-white/[0.02] first:border-t-0"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            patchTask(task.id, { status: task.status === "DONE" ? "PENDING" : "DONE" })
                          }
                          disabled={saving}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            task.status === "DONE"
                              ? "border-white/25 bg-white/[0.15] text-zinc-200"
                              : "border-white/15 hover:border-white/20 hover:bg-white/[0.06]"
                          }`}
                        >
                          {task.status === "DONE" ? "✓" : ""}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${isCompleted ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                            {task.content}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.65rem] text-zinc-500">
                            <span>0{task.stage.stageNumber}. {task.stage.stageName}</span>
                            {assignee ? (
                              <span className="inline-flex items-center gap-1 text-zinc-200">
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] text-[0.5rem] font-bold text-white">
                                  {memberInitial(assignee)}
                                </span>
                                {assignee.name ?? assignee.email.split("@")[0]}
                              </span>
                            ) : null}
                            <span className={due.className}>📅 {due.text}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {Object.values(timelineGroups).every((arr) => arr.length === 0) ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-zinc-500">
              표시할 작업이 없습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 단계별 그룹 (기존) */}
      {view === "stages" && (
      <div className="space-y-3">
        {stages.map((stage) => {
          const isCollapsed = collapsed.has(stage.id);
          const allTasks = stage.tasks;
          const visibleTasks = allTasks.filter(passesFilter);
          const total = allTasks.length;
          const done = allTasks.filter(
            (t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED",
          ).length;
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);
          const overdueInStage = allTasks.some(
            (t) => t.dueDate && new Date(t.dueDate) < today && t.status === "PENDING",
          );

          // 필터로 모두 가려진 단계는 회색 처리
          const allHidden = visibleTasks.length === 0 && total > 0 && filter !== "all";

          return (
            <div
              key={stage.id}
              className={`overflow-hidden rounded-2xl border bg-white/[0.02] transition-opacity ${
                allHidden ? "border-white/5 opacity-40" : "border-white/10"
              }`}
            >
              {/* 단계 헤더 */}
              <button
                type="button"
                onClick={() => toggleCollapse(stage.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-xs font-black text-zinc-200 ring-1 ring-white/15">
                  {String(stage.stageNumber).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="truncate text-sm font-bold text-white">{stage.name}</h3>
                    {overdueInStage ? (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[0.6rem] font-semibold text-rose-300">
                        기한 초과
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-white/[0.06] to-white/30 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[0.65rem] tabular-nums text-zinc-500">
                      {done}/{total}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-zinc-500">{isCollapsed ? "▶" : "▼"}</span>
              </button>

              {/* 태스크 카드 리스트 */}
              {!isCollapsed && !allHidden ? (
                <div className="border-t border-white/5">
                  {visibleTasks.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-zinc-600">
                      이 단계에 표시할 작업이 없습니다.
                    </p>
                  ) : (
                    <ul>
                      {visibleTasks.map((task) => {
                        const due = dueDateInfo(task.dueDate);
                        const isCompleted =
                          task.status === "DONE" ||
                          task.status === "SKIPPED" ||
                          task.status === "OUTSOURCED";
                        const assignee = members.find((m) => m.id === task.assigneeId);
                        const editingDueHere = editingDue === task.id;
                        const editingAssigneeHere = editingAssignee === task.id;
                        return (
                          <li
                            key={task.id}
                            className="group flex items-start gap-3 border-t border-white/[0.04] px-4 py-3 hover:bg-white/[0.02] first:border-t-0"
                          >
                            {/* 상태 토글 — 체크박스 모양 */}
                            <button
                              type="button"
                              onClick={() =>
                                patchTask(task.id, {
                                  status: task.status === "DONE" ? "PENDING" : "DONE",
                                })
                              }
                              disabled={saving}
                              title="완료 토글"
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                task.status === "DONE"
                                  ? "border-white/25 bg-white/[0.15] text-zinc-200"
                                  : task.status === "OUTSOURCED"
                                    ? "border-white/20 bg-white/[0.10] text-zinc-200"
                                    : task.status === "SKIPPED"
                                      ? "border-zinc-600 bg-zinc-800 text-zinc-500"
                                      : "border-white/15 hover:border-white/20 hover:bg-white/[0.06]"
                              }`}
                            >
                              {task.status === "DONE"
                                ? "✓"
                                : task.status === "OUTSOURCED"
                                  ? "🤝"
                                  : task.status === "SKIPPED"
                                    ? "—"
                                    : ""}
                            </button>

                            {/* 본문 */}
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <p
                                className={`text-sm leading-snug ${
                                  isCompleted ? "text-zinc-500 line-through" : "text-zinc-100"
                                }`}
                              >
                                {task.content}
                              </p>

                              <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
                                {/* 담당자 chip / 편집 */}
                                {editingAssigneeHere ? (
                                  <select
                                    autoFocus
                                    value={task.assigneeId ?? ""}
                                    onChange={(e) => {
                                      patchTask(task.id, { assigneeId: e.target.value || null });
                                      setEditingAssignee(null);
                                    }}
                                    onBlur={() => setEditingAssignee(null)}
                                    disabled={saving}
                                    className="h-6 rounded border border-white/20 bg-zinc-900 px-1.5 text-[0.7rem] text-zinc-200"
                                  >
                                    <option value="">담당자 없음</option>
                                    {members.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name ?? m.email.split("@")[0]}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingAssignee(task.id)}
                                    className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.65rem] transition-colors ${
                                      assignee
                                        ? "border-white/15 bg-white/[0.06] text-zinc-100 hover:border-white/25"
                                        : "border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                                    }`}
                                  >
                                    {assignee ? (
                                      <>
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] text-[0.55rem] font-bold text-white">
                                          {memberInitial(assignee)}
                                        </span>
                                        <span>{assignee.name ?? assignee.email.split("@")[0]}</span>
                                      </>
                                    ) : (
                                      <span>+ 담당자</span>
                                    )}
                                  </button>
                                )}

                                {/* 마감일 chip / 편집 */}
                                {editingDueHere ? (
                                  <input
                                    autoFocus
                                    type="date"
                                    defaultValue={
                                      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
                                    }
                                    onBlur={(e) => {
                                      patchTask(task.id, { dueDate: e.target.value || null });
                                      setEditingDue(null);
                                    }}
                                    disabled={saving}
                                    className="h-6 rounded border border-white/20 bg-zinc-900 px-1.5 text-[0.7rem] text-zinc-200"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingDue(task.id)}
                                    className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[0.65rem] hover:border-white/20 ${due.className}`}
                                  >
                                    📅 {due.text}
                                  </button>
                                )}

                                {/* 상태 chip */}
                                <select
                                  value={task.status}
                                  onChange={(e) =>
                                    patchTask(task.id, {
                                      status: e.target.value as WorkspaceTask["status"],
                                    })
                                  }
                                  disabled={saving}
                                  className={`rounded-full border-0 px-1.5 py-0.5 text-[0.65rem] font-semibold ring-1 focus:outline-none focus:ring-white/20 ${
                                    STATUS_BADGE[task.status]
                                  }`}
                                >
                                  {STATUS_OPTS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {STATUS_LABEL[o.value]}
                                    </option>
                                  ))}
                                </select>

                                {/* 외주 게시된 글 링크 */}
                                {task.status === "OUTSOURCED" && task.communityPostId ? (
                                  <a
                                    href={`/community/${task.communityPostId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[0.65rem] text-zinc-200 hover:bg-white/[0.10]"
                                  >
                                    🔗 외주 글
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* 새 작업 입력 */}
                  {adding?.stageId === stage.id ? (
                    <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.10]/[0.04] px-4 py-2">
                      <input
                        autoFocus
                        className="flex-1 rounded-lg border border-white/15 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
                        placeholder="새 작업 내용 (Enter 추가, Esc 취소)"
                        value={adding.value}
                        onChange={(e) => setAdding({ stageId: stage.id, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addTask(stage.id, adding.value);
                          if (e.key === "Escape") setAdding(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addTask(stage.id, adding.value)}
                        disabled={saving || !adding.value.trim()}
                        className="rounded-lg bg-white/[0.10] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.15] disabled:opacity-40"
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdding(null)}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding({ stageId: stage.id, value: "" })}
                      className="flex w-full items-center gap-1.5 border-t border-white/[0.04] px-4 py-2 text-left text-xs text-zinc-500 transition-colors hover:bg-white/[0.10]/[0.04] hover:text-zinc-200"
                    >
                      <span className="text-base leading-none">+</span> 작업 추가
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      )}

      {saving ? (
        <p className="text-right text-[0.65rem] text-zinc-500">저장 중...</p>
      ) : null}
    </section>
  );
}
