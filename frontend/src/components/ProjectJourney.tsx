"use client";

import Link from "next/link";
import { Badge, SectionHeader, Surface } from "@/components/ProductUI";
import { cx, type ProjectWorkflowState } from "@/lib/product";

export default function ProjectJourney({
  workflow,
  compact = false,
}: {
  workflow: ProjectWorkflowState;
  compact?: boolean;
}) {
  const currentStep =
    workflow.steps.find((step) => step.status === "current") ??
    workflow.steps[workflow.steps.length - 1];

  return (
    <Surface className="space-y-5">
      <SectionHeader
        eyebrow="워크플로우 진행도"
        title="이 프로젝트 현재 위치"
        description={workflow.summary}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{workflow.stageLabel}</Badge>
            <Badge>{workflow.completionPercent}% 완료</Badge>
          </div>
        }
      />

      {/* 현재 진행 카드 */}
      <div
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        role="progressbar"
        aria-label="프로젝트 워크플로우 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={workflow.completionPercent}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-500">
              현재 집중할 단계
            </p>
            <p className="mt-1.5 text-base font-semibold text-white">
              {currentStep.title}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-zinc-300">
              {currentStep.description}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-zinc-300">
            {workflow.completedCount} / {workflow.steps.length} 완료
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${workflow.completionPercent}%`,
              background: "linear-gradient(90deg, #5D5DFF, #A855F7)",
            }}
          />
        </div>
      </div>

      {/* 단계 목록 */}
      <ol className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 xl:grid-cols-4"}>
        {workflow.steps.map((step, index) => {
          const statusLabel =
            step.status === "done"
              ? "완료"
              : step.status === "current"
                ? "진행 중"
                : "예정";

          return (
            <li
              key={step.key}
              aria-current={step.status === "current" ? "step" : undefined}
              className={cx(
                "rounded-2xl border p-4 transition-colors",
                step.status === "done" && "border-emerald-500/30 bg-white/[0.10]/[0.06]",
                step.status === "current" && "border-amber-500/40 bg-white/[0.10]/[0.08] shadow-[0_0_24px_rgba(251,191,36,0.12)]",
                step.status === "upcoming" && "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  Step {index + 1}
                </p>
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider",
                    step.status === "done" && "bg-white/[0.08] text-zinc-200",
                    step.status === "current" && "bg-white/[0.08] text-zinc-200",
                    step.status === "upcoming" && "bg-white/10 text-zinc-400",
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="mt-3 text-base font-semibold text-white">
                {step.title}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-zinc-300">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>

      {/* 다음 액션 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.10]/[0.08] p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-300">
            다음 액션
          </p>
          <p className="mt-1.5 text-base font-semibold text-white">
            {workflow.nextAction.label}
          </p>
          <p id="project-next-action-description" className="mt-1.5 text-sm leading-6 text-zinc-300">
            {workflow.nextAction.description}
          </p>
        </div>
        <Link
          href={workflow.nextAction.href}
          className="btn-primary px-5"
          aria-describedby="project-next-action-description"
        >
          {workflow.nextAction.label}
        </Link>
      </div>
    </Surface>
  );
}
