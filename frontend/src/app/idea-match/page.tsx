"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { getCreditErrorDetails, readError, splitTags } from "@/lib/product";
import type {
  IdeaMatchResponse,
  IdeaMatchSessionListResponse,
} from "@/lib/types";

const IDEA_MATCH_CREDIT_COST = 10;

const INDUSTRY_CATEGORIES = [
  { group: "AI · 데이터", items: ["AI", "음성 AI", "디자인 AI", "MLOps", "데이터 분석"], count: 85 },
  { group: "SaaS · B2B", items: ["SaaS", "버티컬 SaaS", "HR Tech", "리걸테크", "규제 기술"], count: 142 },
  { group: "핀테크 · 보험", items: ["핀테크", "인슈어테크", "자산관리", "결제", "대출"], count: 98 },
  { group: "헬스케어 · 바이오", items: ["헬스테크", "메드테크", "바이오", "여성 건강", "정신 건강"], count: 76 },
  { group: "에듀테크 · HR", items: ["에듀테크", "스킬 학습", "HR Tech", "채용", "기업 교육"], count: 64 },
  { group: "커머스 · D2C", items: ["이커머스", "마켓플레이스", "D2C", "리테일테크", "소셜 커머스"], count: 72 },
  { group: "푸드 · 농업", items: ["푸드테크", "애그테크", "외식", "레스토랑 기술", "배달"], count: 89 },
  { group: "물류 · 모빌리티", items: ["물류 기술", "모빌리티", "배송", "공급망"], count: 45 },
  { group: "부동산 · 건설", items: ["프롭테크", "건설 기술", "AEC", "부동산"], count: 38 },
  { group: "친환경 · 에너지", items: ["클린테크", "에너지", "ESG", "폐기물 관리", "농업"], count: 62 },
  { group: "콘텐츠 · 크리에이터", items: ["크리에이터 이코노미", "미디어", "게임", "엔터테인먼트"], count: 43 },
  { group: "여행 · 호스피탈리티", items: ["트래블테크", "호스피탈리티", "관광", "이벤트"], count: 35 },
];

const REVENUE_MODELS = [
  { value: "SaaS", label: "SaaS 구독", desc: "월/연 단위 소프트웨어 구독", dbCount: 187 },
  { value: "Marketplace", label: "마켓플레이스", desc: "거래 수수료 기반", dbCount: 124 },
  { value: "Transaction Fee", label: "거래 수수료", desc: "건당 수수료 과금", dbCount: 156 },
  { value: "Freemium", label: "프리미엄", desc: "무료 + 유료 전환", dbCount: 89 },
  { value: "Product Sales", label: "제품 판매", desc: "직접 제품/하드웨어 판매", dbCount: 112 },
  { value: "Subscription", label: "구독 서비스", desc: "정기 결제 기반", dbCount: 203 },
  { value: "Commission", label: "커미션/중개", desc: "중개 수수료", dbCount: 98 },
  { value: "Ad-based", label: "광고 기반", desc: "광고 수익", dbCount: 34 },
];

const TARGET_MARKETS = [
  { value: "B2C", label: "B2C", desc: "일반 소비자" },
  { value: "B2B", label: "B2B", desc: "기업 고객" },
  { value: "B2B2C", label: "B2B2C", desc: "파트너 경유" },
];

const FUNDING_STAGES = [
  { value: "Pre-Seed", label: "Pre-Seed", desc: "초기 아이디어 단계" },
  { value: "Seed", label: "Seed", desc: "제품 검증 단계" },
  { value: "Series A", label: "Series A", desc: "PMF 달성 후 성장" },
  { value: "Series B", label: "Series B+", desc: "스케일업 단계" },
];

const BUDGET_OPTIONS = [
  { value: "ZERO", label: "무자본" },
  { value: "UNDER_5M", label: "500만원 이하" },
  { value: "FIVE_TO_10M", label: "500~1,000만원" },
  { value: "TEN_TO_30M", label: "1,000~3,000만원" },
  { value: "THIRTY_TO_50M", label: "3,000~5,000만원" },
  { value: "FIFTY_TO_100M", label: "5,000만~1억" },
  { value: "OVER_100M", label: "1억원 이상" },
];

const TEAM_OPTIONS = [
  { value: "SOLO", label: "1인" },
  { value: "TWO_TO_THREE", label: "2~3인" },
  { value: "FOUR_TO_TEN", label: "4~10인" },
  { value: "OVER_TEN", label: "10인+" },
];

const STEPS = [
  { id: 1, label: "산업 분야", desc: "어떤 산업에 관심 있나요?", hint: "DB에서 관련 해외 사례를 우선 검색합니다 (복수 선택 가능)" },
  { id: 2, label: "수익 모델", desc: "선호하는 수익 모델", hint: "DB에서 해당 모델의 검증된 사례를 필터링합니다 (선택 안 해도 됩니다)" },
  { id: 3, label: "타깃 시장", desc: "벤치마크 & 타깃 시장", hint: "어떤 단계의 해외 사례를 참고하고, 누구에게 팔 건가요?" },
  { id: 4, label: "해결할 문제", desc: "해결하고 싶은 문제", hint: "AI가 이 문제에 맞는 해외 솔루션을 매칭합니다 (선택 사항)" },
  { id: 5, label: "실행 역량", desc: "실행 역량", hint: "팀 규모와 예산에 맞는 현실적인 아이디어를 제안합니다" },
  { id: 6, label: "최종 확인", desc: "아이디어 생성 준비 완료", hint: "선택한 조건으로 AI가 한국 맞춤 아이디어 5개를 생성합니다" },
];

/* ── Card selector ── */
function CardSelect({ selected, onClick, label, desc }: {
  selected: boolean; onClick: () => void; label: string; desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-white/60 bg-white/[0.08]"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <p className={`text-sm font-semibold ${selected ? "text-white" : "text-zinc-200"}`}>
        {label}
      </p>
      {desc ? (
        <p className={`mt-0.5 text-xs ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
          {desc}
        </p>
      ) : null}
    </button>
  );
}

export default function IdeaMatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsLatest = searchParams.get("projectId") !== null || searchParams.get("latest") === "1";
  const { token, user, updateCredit } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState("");
  const [creditShortfall, setCreditShortfall] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [targetMarket, setTargetMarket] = useState("B2C");
  const [refStage, setRefStage] = useState("Seed");
  const [problemDesc, setProblemDesc] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [budget, setBudget] = useState("TEN_TO_30M");
  const [teamSize, setTeamSize] = useState("SOLO");
  const [skills, setSkills] = useState("");

  const creditBalance = user?.creditBalance ?? null;
  const hasCredits = creditBalance === null || creditBalance >= IDEA_MATCH_CREDIT_COST;

  const matchEstimate = selectedCategories.reduce((sum, cat) => {
    const found = INDUSTRY_CATEGORIES.find((c) => c.group === cat);
    return sum + (found?.count ?? 0);
  }, 0);

  useEffect(() => {
    if (!token || !wantsLatest) return;
    let cancelled = false;
    api<IdeaMatchSessionListResponse>("GET", buildQuery("/api/idea-match/sessions", { limit: 1 }), undefined, token)
      .then((s) => {
        if (cancelled) return;
        if (s.sessions.length > 0) {
          router.replace(`/idea-match/results?sessionId=${s.sessions[0].id}`);
        }
      })
      .catch(() => { /* ignore — funnel will continue */ });
    return () => { cancelled = true; };
  }, [token, wantsLatest, router]);

  function toggle(arr: string[], set: (v: string[]) => void, item: string) {
    set(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  function canProceed(): boolean {
    if (step === 1) return selectedCategories.length > 0;
    return true;
  }

  // 분석 진행 단계 메시지 — UI 인식용 (실제 API 단계와 매칭)
  const PROGRESS_STEPS = [
    "조건을 분석하고 있습니다",
    "해외 스타트업 사례를 검색하고 있습니다",
    "한국 시장 맥락으로 변환하고 있습니다",
    "아이디어를 생성하고 있습니다",
    "결과를 정리하고 있습니다",
  ];

  useEffect(() => {
    if (!submitting) {
      setProgressStep(0);
      return;
    }
    const t = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 4500);
    return () => clearInterval(t);
  }, [submitting]);

  async function handleSubmit() {
    if (!token || !hasCredits) return;
    setSubmitting(true);
    setProgressStep(0);
    setError("");

    const industries = selectedCategories.flatMap(
      (cat) => INDUSTRY_CATEGORIES.find((c) => c.group === cat)?.items ?? [],
    );
    const keywords = [
      ...industries,
      ...selectedModels.map((m) => REVENUE_MODELS.find((r) => r.value === m)?.label ?? m),
      problemDesc,
      targetCustomer,
    ].filter(Boolean).join(", ");

    try {
      const response = await api<IdeaMatchResponse>("POST", "/api/idea-match", {
        industries,
        problemKeywords: keywords,
        budgetRange: budget,
        teamSize,
        targetMarket,
        riskTolerance: "BALANCED",
        commitment: "FULL_TIME",
        launchTimeline: "SIX_MONTHS",
        technicalSkills: splitTags(skills),
        revenueModelPref: selectedModels,
        topK: 5,
      }, token);

      updateCredit(response.creditBalance);
      router.push(`/idea-match/results?sessionId=${response.sessionId}`);
    } catch (caught) {
      if (getCreditErrorDetails(caught)) {
        setCreditShortfall(true);
      } else {
        setError(readError(caught, "아이디어 생성에 실패했습니다."));
      }
      setStep(6);
    } finally {
      setSubmitting(false);
    }
  }

  function renderStep() {
    switch (step) {
      /* ── STEP 1: 산업 분야 ── */
      case 1:
        return (
          <div className="space-y-6">
            {matchEstimate > 0 && (
              <p className="text-xs text-zinc-400">
                매칭 예상 사례 <span className="font-medium tabular-nums text-white">{matchEstimate}</span>건
              </p>
            )}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {INDUSTRY_CATEGORIES.map((cat) => {
                const sel = selectedCategories.includes(cat.group);
                return (
                  <button
                    key={cat.group}
                    type="button"
                    onClick={() => toggle(selectedCategories, setSelectedCategories, cat.group)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      sel
                        ? "border-white/60 bg-white/[0.08]"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${sel ? "text-white" : "text-zinc-200"}`}>
                      {cat.group}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {cat.items.slice(0, 3).join(" · ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      /* ── STEP 2: 수익 모델 ── */
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {REVENUE_MODELS.map((model) => {
                const sel = selectedModels.includes(model.value);
                return (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => toggle(selectedModels, setSelectedModels, model.value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      sel
                        ? "border-white/60 bg-white/[0.08]"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${sel ? "text-white" : "text-zinc-200"}`}>
                      {model.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{model.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      /* ── STEP 3: 타깃 시장 ── */
      case 3:
        return (
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A1A1AA" }}>참고할 해외 사례의 성장 단계</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FUNDING_STAGES.map((s) => (
                  <CardSelect key={s.value} selected={refStage === s.value} onClick={() => setRefStage(s.value)} label={s.label} desc={s.desc} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A1A1AA" }}>한국 내 타깃 시장</p>
              <div className="grid grid-cols-3 gap-3">
                {TARGET_MARKETS.map((m) => (
                  <CardSelect key={m.value} selected={targetMarket === m.value} onClick={() => setTargetMarket(m.value)} label={m.label} desc={m.desc} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="targetCustomer" className="block text-sm font-semibold" style={{ color: "#A1A1AA" }}>
                구체적인 타깃 고객
              </label>
              <input
                id="targetCustomer"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                className="input"
                placeholder="예: 직원 50명 이하 중소기업 HR 담당자, 20~30대 1인 가구"
              />
            </div>
          </div>
        );

      /* ── STEP 4: 해결할 문제 ── */
      case 4:
        return (
          <div className="space-y-6">
            <textarea
              value={problemDesc}
              onChange={(e) => setProblemDesc(e.target.value)}
              className="input min-h-[160px]"
              placeholder="해결하려는 문제를 구체적으로 적어주세요&#10;&#10;예: 소상공인이 재고 관리를 수기로 해서 폐기율이 15% 이상이다."
            />
            <p className="text-xs" style={{ color: "var(--ink-4)" }}>구체적일수록 더 정확한 아이디어가 생성됩니다</p>
          </div>
        );

      /* ── STEP 5: 실행 역량 ── */
      case 5:
        return (
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A1A1AA" }}>팀 규모</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TEAM_OPTIONS.map((t) => (
                  <CardSelect key={t.value} selected={teamSize === t.value} onClick={() => setTeamSize(t.value)} label={t.label} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#A1A1AA" }}>초기 투자 예산</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudget(b.value)}
                    className="rounded-xl px-4 py-3 text-sm font-medium transition-all"
                    style={
                      budget === b.value
                        ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.6)", color: "#ffffff" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--ink-3)" }
                    }
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="skills" className="block text-sm font-semibold" style={{ color: "#A1A1AA" }}>
                보유 기술/역량{" "}
                <span style={{ color: "var(--ink-4)" }}>(선택)</span>
              </label>
              <input
                id="skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="input"
                placeholder="예: React, Python, AI/ML, 마케팅, 도메인 전문지식"
              />
            </div>
          </div>
        );

      /* ── STEP 6: 최종 확인 ── */
      case 6: {
        const disabled = submitting || !hasCredits || selectedCategories.length === 0;
        return (
          <div className="space-y-8">
            {/* Review list */}
            <dl className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              <ReviewRow label="산업 분야">
                {selectedCategories.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {selectedCategories.map((c) => (
                      <span
                        key={c}
                        className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-zinc-100"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-500">선택 없음</span>
                )}
              </ReviewRow>
              <ReviewRow label="수익 모델">
                {selectedModels.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {selectedModels.map((m) => (
                      <span
                        key={m}
                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-300"
                      >
                        {REVENUE_MODELS.find((r) => r.value === m)?.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-500">미선택 (전체)</span>
                )}
              </ReviewRow>
              <ReviewRow label="타깃 시장">
                <span className="text-sm text-zinc-200">{targetMarket} · {refStage}</span>
              </ReviewRow>
              <ReviewRow label="팀 · 예산">
                <span className="text-sm text-zinc-200">
                  {TEAM_OPTIONS.find((t) => t.value === teamSize)?.label} · {BUDGET_OPTIONS.find((b) => b.value === budget)?.label}
                </span>
              </ReviewRow>
              {problemDesc ? (
                <ReviewRow label="문제 정의">
                  <p className="line-clamp-2 max-w-md text-sm text-zinc-300">{problemDesc}</p>
                </ReviewRow>
              ) : null}
            </dl>

            {error ? (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {!hasCredits || creditShortfall ? (
              <div className="flex items-center justify-between gap-3 py-3">
                <p className="text-sm text-zinc-300">
                  크레딧 부족 — 현재 <span className="tabular-nums text-white">{creditBalance}cr</span> · 필요 <span className="tabular-nums text-white">{IDEA_MATCH_CREDIT_COST}cr</span>
                </p>
                <Link
                  href="/billing"
                  className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[0.10]"
                >
                  충전
                </Link>
              </div>
            ) : null}

            {/* Action area (flat) */}
            <div className="pt-2">
              <div className="mb-4 flex items-baseline justify-between">
                <p className="text-sm text-zinc-400">
                  분석 비용 <span className="ml-1 font-semibold tabular-nums text-white">{IDEA_MATCH_CREDIT_COST}</span> 크레딧
                </p>
                <p className="text-xs text-zinc-500">
                  잔여 <span className="tabular-nums text-zinc-300">{user?.isAdmin ? "무제한" : (creditBalance ?? 0)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-6 py-3.5 text-sm font-semibold transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-white/[0.06] bg-transparent text-zinc-600"
                    : "border-white/20 bg-white/[0.10] text-white hover:border-white/35 hover:bg-white/[0.15]"
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    분석 중…
                  </>
                ) : (
                  <>아이디어 분석 시작</>
                )}
              </button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  const pct = (step / STEPS.length) * 100;

  return (
    <AuthGuard>
      <div className="fade-up pb-6">
        {/* Step header */}
        <div className="mb-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            <span className="tabular-nums text-zinc-300">{step}</span>
            <span className="mx-1.5 text-zinc-600">/</span>
            <span className="tabular-nums">{STEPS.length}</span>
            <span className="mx-2 text-zinc-700">·</span>
            <span>{STEPS[step - 1].label}</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
            {STEPS[step - 1].desc}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{STEPS[step - 1].hint}</p>
        </div>
        <div className="mb-6 h-px w-full bg-white/[0.06]">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        {/* Step content */}
        <div>{renderStep()}</div>

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setStep((s) => Math.max(1, s - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-lg border border-white/10 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
            >
              이전
            </button>
          ) : (
            <span />
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => {
                if (!canProceed()) return;
                setStep((s) => s + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={!canProceed()}
              className="rounded-lg border border-white/15 bg-white/[0.08] px-6 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-transparent disabled:text-zinc-600"
            >
              다음
            </button>
          ) : null}
        </div>

      </div>

      {/* 분석 진행 오버레이 */}
      {submitting ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="아이디어 분석 진행 중"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-7 shadow-2xl">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 animate-spin text-zinc-300" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-white">분석을 진행 중입니다</p>
            </div>
            <ol className="mt-5 space-y-2.5">
              {PROGRESS_STEPS.map((label, i) => {
                const done = i < progressStep;
                const active = i === progressStep;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] tabular-nums ${
                        done
                          ? "border-white/40 bg-white text-zinc-900"
                          : active
                            ? "border-white/40 bg-white/[0.08] text-white"
                            : "border-white/10 text-zinc-500"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        done ? "text-zinc-500 line-through" : active ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 text-center text-xs text-zinc-500">
              평균 20~40초가 소요됩니다. 창을 닫지 마세요.
            </p>
          </div>
        </div>
      ) : null}
    </AuthGuard>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-right">{children}</dd>
    </div>
  );
}
