"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import OutsourceModal from "@/components/workspace/OutsourceModal";
import { getTaskHint } from "@/data/taskHints";
import { STAGE_RESOURCES } from "@/data/stageResources";
import type { WorkspaceStage, WorkspaceTask } from "@/app/workspace/[ideaId]/page";

type Props = {
  ideaTitle: string;
  ideaId: string;
  stages: WorkspaceStage[];
  onChanged: () => void;
  onSwitchToGrid: () => void;
};

export default function FocusMode({
  ideaTitle,
  ideaId,
  stages,
  onChanged,
  onSwitchToGrid,
}: Props) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outsourceTask, setOutsourceTask] = useState<WorkspaceTask | null>(null);

  // 가장 먼저 처리할 task 찾기 (stage 순서 → task orderIndex 순서)
  // 필수(orderIndex < 100) 우선, 모두 끝나면 선택(>= 100) 진행
  const sortedStages = [...stages].sort((a, b) => a.stageNumber - b.stageNumber);
  let currentTask: WorkspaceTask | null = null;
  let currentStage: WorkspaceStage | null = null;
  const findPending = (filterFn: (t: WorkspaceTask) => boolean) => {
    for (const stage of sortedStages) {
      const pending = [...stage.tasks]
        .filter(filterFn)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .find((t) => t.status === "PENDING");
      if (pending) return { task: pending, stage };
    }
    return null;
  };
  const corePick = findPending((t) => t.orderIndex < 100);
  const optionalPick = corePick ? null : findPending((t) => t.orderIndex >= 100);
  const picked = corePick ?? optionalPick;
  if (picked) {
    currentTask = picked.task;
    currentStage = picked.stage;
  }

  // 힌트(왜/어떻게) — default task만 매핑됨
  const hint =
    currentStage && currentTask && !currentTask.isCustom
      ? getTaskHint(currentStage.stageNumber, currentTask.orderIndex)
      : null;

  // 추천 리소스 — 현재 stage 리소스 중 task에 가장 가까운 것 2~3개
  const recommendedResources = (() => {
    if (!currentStage) return [];
    const stageRes = STAGE_RESOURCES[currentStage.stageNumber];
    if (!stageRes) return [];
    const allItems = stageRes.groups.flatMap((g) => g.items);
    if (!currentTask) return [];
    // 1) outsourceRole 토큰과 일치하는 것
    // 2) task content 단어와 일치하는 것
    const taskContent = currentTask.content.toLowerCase();
    const role = (currentTask.outsourceRole ?? "").toLowerCase();
    const scored = allItems.map((item) => {
      const lbl = item.label.toLowerCase();
      const out = (item.outcome ?? "").toLowerCase();
      let score = 0;
      // 단어 매칭
      for (const w of taskContent.split(/[\s·,()]/).filter((s) => s.length >= 2)) {
        if (lbl.includes(w) || out.includes(w)) score += 2;
      }
      for (const w of role.split(/[\s·]/).filter((s) => s.length >= 2)) {
        if (lbl.includes(w) || out.includes(w)) score += 1;
      }
      // 추천 배지면 가산
      if (item.badge === "추천") score += 1;
      return { item, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored
      .filter((s) => s.score > 0)
      .slice(0, 3)
      .map((s) => s.item);
  })();

  // 필수 task만 진척에 카운트 (선택은 보너스)
  const coreTasks = stages.flatMap((s) => s.tasks.filter((t) => t.orderIndex < 100));
  const totalTasks = coreTasks.length;
  const doneTasks = coreTasks.filter((t) => t.status !== "PENDING").length;
  const overallPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // 모든 task 완료 — 축하 화면
  if (!currentTask || !currentStage) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="text-7xl">🎉</div>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          모든 단계 완료
        </h2>
        <p className="max-w-md text-base leading-7 text-zinc-400">
          {ideaTitle} — 6단계 {totalTasks}개 작업을 모두 처리했습니다.<br/>
          이제 진짜 시작이에요.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/show/${ideaId}`} className="btn-primary px-5 py-2">
            🌐 사업 페이지 공유하기
          </Link>
          <button type="button" onClick={onSwitchToGrid} className="btn-ghost px-4 py-2 text-sm">
            전체 보기
          </button>
        </div>
      </div>
    );
  }

  async function action(next: WorkspaceTask["status"]) {
    if (!token || !currentTask) return;
    setBusy(true);
    setError("");
    try {
      await api(
        "PATCH",
        `/api/workspace/tasks/${currentTask.id}`,
        { status: next },
        token,
      );
      onChanged();
    } catch (caught) {
      setError(readError(caught, "변경 실패."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-10 fade-up py-4">
        {/* 상단: 6단계 stepper + 현재 단계 + 진척 (박스 없이) */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold text-zinc-400">
              0{currentStage.stageNumber}. <span className="text-zinc-200">{currentStage.name}</span>
            </p>
            <p className="text-xs text-zinc-500">
              <span className="font-bold text-zinc-200">{overallPct}%</span>
              <span className="ml-1.5">· {doneTasks}/{totalTasks}</span>
            </p>
          </div>
          <ol className="grid grid-cols-6 gap-1.5">
            {sortedStages.map((s) => {
              const stageCoreTasks = s.tasks.filter((t) => t.orderIndex < 100);
              const stageDone = stageCoreTasks.filter((t) => t.status !== "PENDING").length;
              const stageTotal = stageCoreTasks.length;
              const pct = stageTotal === 0 ? 0 : (stageDone / stageTotal) * 100;
              const isComplete = stageTotal > 0 && stageDone === stageTotal;
              const isCurrent = s.id === currentStage?.id;
              return (
                <li key={s.id} className="space-y-1">
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={`h-full rounded-full ${
                        isComplete
                          ? "bg-emerald-400"
                          : isCurrent
                            ? "bg-white/30"
                            : "bg-zinc-700"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p
                    className={`text-center text-[0.65rem] font-bold tabular-nums ${
                      isComplete
                        ? "text-zinc-300"
                        : isCurrent
                          ? "text-zinc-400"
                          : "text-zinc-600"
                    }`}
                  >
                    {isComplete ? "✓" : `0${s.stageNumber}`}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* HERO: 지금 할 일 */}
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-zinc-200">
              지금 할 일{hint?.time ? ` · ${hint.time}` : ""}
            </p>
            {currentTask.orderIndex >= 100 ? (
              <span className="rounded-md bg-zinc-700/40 px-1.5 py-0.5 text-[0.65rem] font-bold text-zinc-300">
                선택
              </span>
            ) : null}
          </div>
          <h1 className="text-balance text-3xl font-black leading-[1.2] tracking-tight text-white sm:text-4xl">
            {currentTask.content}
          </h1>
          {currentTask.outsourceRole ? (
            <p className="text-xs text-zinc-500">
              외주 가능 — {currentTask.outsourceRole}
            </p>
          ) : null}
        </div>

        {/* 가이드 (왜·어떻게·도구) — 한 카드로 통합 */}
        {(hint || recommendedResources.length > 0) ? (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
            {hint ? (
              <>
                <div className="p-5">
                  <p className="text-xs font-semibold text-zinc-400">왜 중요한가</p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-zinc-200">{hint.why}</p>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-zinc-400">어떻게 시작하나</p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-zinc-100">{hint.how}</p>
                </div>
              </>
            ) : null}
            {recommendedResources.length > 0 ? (
              <div className="p-5">
                <p className="text-xs font-semibold text-zinc-400">도움되는 도구</p>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {recommendedResources.map((r, i) => (
                    <a
                      key={`${r.url}-${i}`}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg border border-white/5 px-3 py-2.5 transition-colors hover:border-white/15 hover:bg-white/[0.10]/[0.06]"
                    >
                      <p className="text-sm font-semibold text-zinc-100 group-hover:text-zinc-100">
                        {r.label} ↗
                      </p>
                      {r.outcome ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{r.outcome}</p>
                      ) : null}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 액션 버튼들 — 명확한 위계: 1차(완료) / 2차(외주) / 3차(건너뛰기) */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => action("DONE")}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-400 px-6 py-5 text-lg font-extrabold tracking-tight text-zinc-950 shadow-[0_8px_32px_-8px_rgba(52,211,153,0.5)] transition-all hover:bg-emerald-300 hover:shadow-[0_12px_40px_-8px_rgba(52,211,153,0.6)] disabled:opacity-60"
          >
            ✓ 이거 다 했어요
          </button>

          {currentTask.outsourceRole ? (
            <button
              type="button"
              onClick={() => setOutsourceTask(currentTask)}
              disabled={busy}
              className="w-full rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3.5 text-sm font-bold text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/[0.10] disabled:opacity-60"
            >
              🤝 도움받기 — 외주·AC 컨설팅·팀 모집 자동 작성
            </button>
          ) : null}

          <div className="text-center">
            <button
              type="button"
              onClick={() => action("SKIPPED")}
              disabled={busy}
              className="text-xs font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline disabled:opacity-60"
            >
              이번엔 건너뛰기
            </button>
          </div>

          {error ? <p className="text-center text-sm text-rose-300">{error}</p> : null}
        </div>

      </div>

      {/* 외주 모달 */}
      {outsourceTask ? (
        <OutsourceModal
          task={outsourceTask}
          onClose={() => setOutsourceTask(null)}
          onPosted={() => {
            setOutsourceTask(null);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}
