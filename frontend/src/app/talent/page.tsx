"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, EmptyState } from "@/components/ProductUI";
import { api, buildQuery } from "@/lib/api";
import { readError } from "@/lib/product";

type ExpertCategory =
  | "DEVELOPER"
  | "FRONTEND_DEV"
  | "BACKEND_DEV"
  | "FULLSTACK_DEV"
  | "MOBILE_DEV"
  | "AI_DEV"
  | "DEVOPS"
  | "DATA_ENGINEER"
  | "DESIGNER"
  | "UI_UX_DESIGNER"
  | "GRAPHIC_DESIGNER"
  | "MARKETER"
  | "GROWTH_MARKETER"
  | "CONTENT_MARKETER"
  | "AC_MENTOR"
  | "PLANNER"
  | "PM"
  | "BUSINESS_DEV"
  | "LAWYER"
  | "ACCOUNTANT"
  | "OTHER";

type Expert = {
  id: string;
  userId: string;
  category: ExpertCategory;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  links: Array<{ label: string; url: string }>;
  location: string | null;
  available: boolean;
  yearsOfExperience?: number | null;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE" | null;
  industries?: string[];
  user: { id: string; name: string | null; email: string } | null;
};

const WORK_MODE_LABEL: Record<string, string> = {
  REMOTE: "원격",
  HYBRID: "하이브리드",
  ONSITE: "오피스",
};

const CATEGORY_LABEL: Record<ExpertCategory, string> = {
  DEVELOPER: "개발자(일반)",
  FRONTEND_DEV: "프론트엔드 개발자",
  BACKEND_DEV: "백엔드 개발자",
  FULLSTACK_DEV: "풀스택 개발자",
  MOBILE_DEV: "모바일 개발자",
  AI_DEV: "AI/ML 개발자",
  DEVOPS: "DevOps·인프라",
  DATA_ENGINEER: "데이터 엔지니어",
  DESIGNER: "디자이너(일반)",
  UI_UX_DESIGNER: "UI/UX 디자이너",
  GRAPHIC_DESIGNER: "그래픽·브랜드 디자이너",
  MARKETER: "마케터(일반)",
  GROWTH_MARKETER: "그로스 마케터",
  CONTENT_MARKETER: "콘텐츠 마케터",
  AC_MENTOR: "AC·멘토",
  PLANNER: "기획자",
  PM: "PM",
  BUSINESS_DEV: "사업개발",
  LAWYER: "법무·변호사",
  ACCOUNTANT: "세무·회계",
  OTHER: "기타",
};

const DEV_COLOR = "text-zinc-200 bg-white/[0.06] ring-white/15";
const DESIGN_COLOR = "text-zinc-400 bg-white/[0.06] ring-white/15";
const MARKETING_COLOR = "text-zinc-200 bg-white/[0.06] ring-white/15";

const CATEGORY_COLOR: Record<ExpertCategory, string> = {
  DEVELOPER: DEV_COLOR,
  FRONTEND_DEV: DEV_COLOR,
  BACKEND_DEV: DEV_COLOR,
  FULLSTACK_DEV: DEV_COLOR,
  MOBILE_DEV: DEV_COLOR,
  AI_DEV: DEV_COLOR,
  DEVOPS: DEV_COLOR,
  DATA_ENGINEER: DEV_COLOR,
  DESIGNER: DESIGN_COLOR,
  UI_UX_DESIGNER: DESIGN_COLOR,
  GRAPHIC_DESIGNER: DESIGN_COLOR,
  MARKETER: MARKETING_COLOR,
  GROWTH_MARKETER: MARKETING_COLOR,
  CONTENT_MARKETER: MARKETING_COLOR,
  AC_MENTOR: "text-zinc-300 bg-white/[0.06] ring-white/15",
  PLANNER: "text-rose-300 bg-rose-500/10 ring-rose-400/30",
  PM: "text-sky-300 bg-sky-500/10 ring-sky-400/30",
  BUSINESS_DEV: "text-cyan-300 bg-cyan-500/10 ring-cyan-400/30",
  LAWYER: "text-stone-300 bg-stone-500/10 ring-stone-400/30",
  ACCOUNTANT: "text-stone-300 bg-stone-500/10 ring-stone-400/30",
  OTHER: "text-zinc-400 bg-white/[0.04] ring-white/10",
};

const CATEGORIES: Array<{ value: "" | ExpertCategory; label: string }> = [
  { value: "", label: "전체" },
  { value: "FRONTEND_DEV", label: "프론트엔드" },
  { value: "BACKEND_DEV", label: "백엔드" },
  { value: "FULLSTACK_DEV", label: "풀스택" },
  { value: "MOBILE_DEV", label: "모바일" },
  { value: "AI_DEV", label: "AI/ML" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "DATA_ENGINEER", label: "데이터" },
  { value: "UI_UX_DESIGNER", label: "UI/UX" },
  { value: "GRAPHIC_DESIGNER", label: "그래픽" },
  { value: "GROWTH_MARKETER", label: "그로스" },
  { value: "CONTENT_MARKETER", label: "콘텐츠" },
  { value: "PLANNER", label: "기획자" },
  { value: "PM", label: "PM" },
  { value: "BUSINESS_DEV", label: "사업개발" },
  { value: "AC_MENTOR", label: "AC·멘토" },
  { value: "LAWYER", label: "법무" },
  { value: "ACCOUNTANT", label: "세무" },
  { value: "OTHER", label: "기타" },
];

function formatRate(min: number | null, max: number | null) {
  if (min == null && max == null) return "협의";
  const fmt = (n: number) => `${(n / 10000).toLocaleString()}만`;
  if (min != null && max != null) return `${fmt(min)} ~ ${fmt(max)}원/시간`;
  if (min != null) return `${fmt(min)}원~/시간`;
  return `~${fmt(max!)}원/시간`;
}

export default function TalentPage() {
  const [category, setCategory] = useState<"" | ExpertCategory>("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ experts: Expert[] }>(
      "GET",
      buildQuery("/api/experts", { category, q, limit: 50 }),
    )
      .then((res) => {
        if (!cancelled) setExperts(res.experts);
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "전문가 목록 불러오기 실패"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, q]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput.trim());
  }

  const totalLabel = useMemo(() => {
    if (loading) return "불러오는 중";
    return `${experts.length}명`;
  }, [loading, experts.length]);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-8 fade-up pb-12">
        {/* 헤더 */}
        <header className="space-y-3">
          <p className="eyebrow">전문가 디렉토리</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="editorial-h1">전문가 찾기</h1>
              <p className="mt-1 text-sm text-zinc-400">
                개발자·디자이너·기획자·AC 멘토 등 등록된 전문가를 직접 컨택하세요.
              </p>
            </div>
            <Link
              href="/mypage/expert"
              className="rounded-md border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.10]"
            >
              내 프로필 등록·수정
            </Link>
          </div>
        </header>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="search"
            placeholder="이름·소개·스킬 검색 (예: React, 핀테크)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input flex-1"
          />
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            검색
          </button>
          {q ? (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setQ(""); }}
              className="btn-ghost px-3 py-2 text-sm"
            >
              초기화
            </button>
          ) : null}
        </form>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === c.value
                  ? "bg-white/[0.10] text-zinc-200 ring-1 ring-white/20"
                  : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
              }`}
            >
              {c.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-500">총 {totalLabel}</span>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingState label="전문가 불러오는 중..." />
        ) : experts.length === 0 ? (
          <EmptyState
            title="등록된 전문가가 아직 없습니다"
            description="첫 번째 전문가가 되어보세요."
            action={
              <Link href="/mypage/expert" className="btn-primary text-sm">
                내 프로필 등록 →
              </Link>
            }
          />
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((e) => (
              <Link
                key={e.id}
                href={`/u/${e.userId}`}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.04]"
              >
                {/* 헤더: 카테고리 + 이름 */}
                <header>
                  <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">
                    {CATEGORY_LABEL[e.category]}
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold tracking-tight text-white">
                    {e.user?.name || "익명 전문가"}
                  </p>
                </header>

                {/* 구조화된 메타 정보 — 한 줄씩 좌(라벨)-우(값) */}
                <dl className="space-y-1.5 text-sm">
                  {typeof e.yearsOfExperience === "number" ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[0.7rem] text-zinc-500">경력</dt>
                      <dd className="text-right text-zinc-100">{e.yearsOfExperience}년차</dd>
                    </div>
                  ) : null}
                  {e.location ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[0.7rem] text-zinc-500">지역</dt>
                      <dd className="truncate text-right text-zinc-100">{e.location}</dd>
                    </div>
                  ) : null}
                  {e.workMode ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[0.7rem] text-zinc-500">근무 형태</dt>
                      <dd className="text-right text-zinc-100">{WORK_MODE_LABEL[e.workMode] ?? e.workMode}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[0.7rem] text-zinc-500">희망 보수</dt>
                    <dd className="text-right font-medium text-white">{formatRate(e.hourlyRateMin, e.hourlyRateMax)}</dd>
                  </div>
                  {e.industries && e.industries.length > 0 ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 text-[0.7rem] text-zinc-500">도메인</dt>
                      <dd className="truncate text-right text-zinc-100" title={e.industries.join(", ")}>
                        {e.industries.slice(0, 2).join(" · ")}
                        {e.industries.length > 2 ? ` +${e.industries.length - 2}` : ""}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {/* 핵심 역량 */}
                {e.skills.length > 0 ? (
                  <div className="border-t border-white/[0.06] pt-3">
                    <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-zinc-500">핵심 역량</p>
                    <div className="flex flex-wrap gap-1">
                      {e.skills.slice(0, 5).map((s) => (
                        <span
                          key={s}
                          className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[0.7rem] text-zinc-200"
                        >
                          {s}
                        </span>
                      ))}
                      {e.skills.length > 5 ? (
                        <span className="text-[0.7rem] text-zinc-500">+{e.skills.length - 5}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ring-1 ${e.available ? "bg-white/[0.06] text-zinc-100 ring-white/15" : "bg-white/[0.03] text-zinc-500 ring-white/10"}`}>
                    {e.available ? "영입 가능" : "비활성"}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-200">
                    프로필 보기 →
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </AuthGuard>
  );
}
