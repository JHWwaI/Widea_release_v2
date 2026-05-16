"use client";

import { useMemo, useState } from "react";
import {
  MEETING_TEMPLATES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LIST,
  TONE_TEXT,
  type MeetingTemplateKey,
  type MeetingTemplateMeta,
  type TemplateCategory,
  type TemplateSection,
} from "@/lib/meetingTemplates";

type SummaryShape = Record<string, unknown> | null;

export default function MeetingSummaryView({
  templateKey,
  summary,
  compact,
}: {
  templateKey?: string | null;
  summary: SummaryShape;
  compact?: boolean;
}) {
  const tpl: MeetingTemplateMeta =
    (templateKey && MEETING_TEMPLATES[templateKey as MeetingTemplateKey]) ||
    MEETING_TEMPLATES.DEFAULT;

  if (!summary) {
    return (
      <p className="text-xs text-zinc-500">
        AI 요약이 생성되지 않았습니다 (모델 한도 또는 transcript 부족).
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
          AI 요약 · {tpl.label}
        </p>
        {!compact ? (
          <span className="text-[0.65rem] text-zinc-500">{tpl.description}</span>
        ) : null}
      </div>
      {tpl.sections.map((sec) => (
        <SectionView key={sec.field} section={sec} value={(summary as Record<string, unknown>)[sec.field]} />
      ))}
    </div>
  );
}

function SectionView({ section, value }: { section: TemplateSection; value: unknown }) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const toneCls = TONE_TEXT[section.tone ?? "default"];

  return (
    <div>
      <p className={`text-xs font-semibold ${toneCls}`}>
        {section.label}
      </p>
      <div className="mt-1.5 space-y-1 text-sm text-zinc-200">
        {value.map((item, i) => (
          <ItemView key={i} kind={section.kind} item={item} />
        ))}
      </div>
    </div>
  );
}

function ItemView({ kind, item }: { kind: TemplateSection["kind"]; item: unknown }) {
  if (kind === "stringList") {
    if (typeof item === "string") return <p>• {item}</p>;
    return null;
  }
  if (kind === "actionList") {
    if (typeof item === "string") return <p>• {item}</p>;
    if (item && typeof item === "object") {
      const obj = item as { owner?: string; content?: string };
      return (
        <p>
          {obj.owner ? <span className="text-zinc-400">{obj.owner}: </span> : "• "}
          {obj.content ?? ""}
        </p>
      );
    }
    return null;
  }
  if (kind === "qaList") {
    if (item && typeof item === "object") {
      const obj = item as { question?: string; answer?: string };
      return (
        <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
          {obj.question ? (
            <p className="text-sm text-zinc-100">
              <span className="text-zinc-400">Q. </span>
              {obj.question}
            </p>
          ) : null}
          {obj.answer ? (
            <p className="mt-1 text-sm text-zinc-300">
              <span className="text-zinc-200">A. </span>
              {obj.answer}
            </p>
          ) : null}
        </div>
      );
    }
    return null;
  }
  return null;
}

type CategoryFilter = "전체" | TemplateCategory;
const CATEGORY_FILTERS: CategoryFilter[] = ["전체", ...TEMPLATE_CATEGORIES];

export function TemplatePicker({
  value,
  onChange,
  disabled,
}: {
  value: MeetingTemplateKey;
  onChange: (key: MeetingTemplateKey) => void;
  disabled?: boolean;
}) {
  // 현재 선택된 템플릿이 속한 카테고리를 기본 탭으로
  const initialCategory: CategoryFilter = useMemo(() => {
    return MEETING_TEMPLATES[value]?.category ?? "전체";
  }, [value]);
  const [filter, setFilter] = useState<CategoryFilter>(initialCategory);

  const visible = useMemo(() => {
    if (filter === "전체") return TEMPLATE_LIST;
    return TEMPLATE_LIST.filter((t) => t.category === filter);
  }, [filter]);

  return (
    <div>
      <label className="field-label">템플릿</label>

      {/* 카테고리 탭 */}
      <div className="mt-1 mb-2 flex flex-wrap gap-1.5">
        {CATEGORY_FILTERS.map((c) => {
          const active = filter === c;
          return (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                active
                  ? "bg-white/[0.10] text-zinc-100 ring-1 ring-white/20"
                  : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* 카드 */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(t.key)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                active
                  ? "border-white/30 bg-white/[0.10]/[0.12] ring-1 ring-white/15"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <p className={`text-sm font-bold ${active ? "text-zinc-100" : "text-white"}`}>
                {t.label}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
