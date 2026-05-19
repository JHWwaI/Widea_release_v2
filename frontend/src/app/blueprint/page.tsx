"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, PageHeader, StructuredData, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  formatCurrency,
  getCreditErrorDetails,
  readError,
  targetMarketOptions,
} from "@/lib/product";
import type { BlueprintResponse, DiscoveryCase, ProjectListResponse, ProjectSummary } from "@/lib/types";

const BLUEPRINT_CREDIT_COST = 5;

function BlueprintContent() {
  const searchParams = useSearchParams();
  const { token, user, updateCredit } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [recentCases, setRecentCases] = useState<DiscoveryCase[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState("");
  const [creditError, setCreditError] = useState<ReturnType<typeof getCreditErrorDetails>>(null);
  const [result, setResult] = useState<BlueprintResponse | null>(null);
  const [form, setForm] = useState({
    projectPolicyId: searchParams.get("projectId") || "",
    globalCaseId: searchParams.get("caseId") || "",
    budget: "20000000",
    targetMarket: "B2C",
  });

  const linkedCases: { id: string; name: string }[] = (() => {
    const ids = searchParams.get("caseIds")?.split(",").filter(Boolean) ?? [];
    const names = searchParams.get("caseNames")?.split(",").filter(Boolean) ?? [];
    return ids.map((id, i) => ({ id, name: names[i] || id }));
  })();

  const currentCreditBalance = user?.creditBalance ?? null;
  const hasEnoughCredits =
    currentCreditBalance === null || currentCreditBalance >= BLUEPRINT_CREDIT_COST;
  const activeCreditError =
    creditError ??
    (currentCreditBalance !== null && currentCreditBalance < BLUEPRINT_CREDIT_COST
      ? {
          required: BLUEPRINT_CREDIT_COST,
          creditBalance: currentCreditBalance,
        }
      : null);

  useEffect(() => {
    const stored = localStorage.getItem("widea_recent_discovery");
    if (stored) {
      try {
        setRecentCases(JSON.parse(stored) as DiscoveryCase[]);
      } catch {
        setRecentCases([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoadingProjects(true);

    api<ProjectListResponse>("GET", "/api/projects", undefined, token)
      .then((data) => {
        if (cancelled) return;
        setProjects(data.projects);

        if (!form.projectPolicyId && data.projects[0]) {
          setForm((current) => ({ ...current, projectPolicyId: data.projects[0].id }));
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "프로젝트 목록을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.projectPolicyId, token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (!hasEnoughCredits) {
      setCreditError(
        currentCreditBalance === null
          ? { required: BLUEPRINT_CREDIT_COST, creditBalance: null }
          : { required: BLUEPRINT_CREDIT_COST, creditBalance: currentCreditBalance },
      );
      setError(
        readError({
          errorCode: "INSUFFICIENT_CREDITS",
          required: BLUEPRINT_CREDIT_COST,
          creditBalance: currentCreditBalance,
        }),
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setCreditError(null);

    try {
      const response = await api<BlueprintResponse>(
        "POST",
        "/api/blueprint",
        {
          globalCaseId: form.globalCaseId,
          projectPolicyId: form.projectPolicyId,
          budget: Number(form.budget),
          targetMarket: form.targetMarket,
        },
        token,
      );

      setResult(response);
      updateCredit(response.creditBalance);
    } catch (caught) {
      setCreditError(getCreditErrorDetails(caught));
      setError(readError(caught, "Blueprint 생성에 실패했습니다. case id와 project를 다시 확인해 주세요."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="한국형 실행 전략"
          title="Blueprint"
          description="Discovery에서 찾은 글로벌 사례를 한국 시장에 맞는 실행 계획으로 바꿉니다. 최근 결과를 바로 이어서 사용할 수 있습니다."
        />

        <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <Surface className="space-y-5">
            <div>
              <p className="eyebrow">블루프린트 설정</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-900">
                벤치마크 사례와 프로젝트 연결
              </h2>
            </div>

            {activeCreditError ? (
              <div
                role="alert"
                className="space-y-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4 text-sm text-zinc-200"
              >
                <div className="space-y-1">
                  <p className="font-semibold">크레딧이 부족합니다</p>
                  <p>
                    Blueprint는 1회 실행에 {activeCreditError.required} 크레딧이 필요합니다.
                    {activeCreditError.creditBalance !== null
                      ? ` 현재 잔액은 ${activeCreditError.creditBalance} 크레딧입니다.`
                      : ""}
                  </p>
                </div>
                <Link href="/pricing" className="btn-secondary">
                  크레딧 충전하러 가기
                </Link>
              </div>
            ) : null}

            {error && !activeCreditError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div>
                <label htmlFor="projectPolicyId" className="field-label">
                  연결할 프로젝트
                </label>
                <select
                  id="projectPolicyId"
                  value={form.projectPolicyId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, projectPolicyId: event.target.value }))
                  }
                  className="select"
                  required
                >
                  <option value="">프로젝트 선택</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  {loadingProjects
                    ? "프로젝트를 불러오는 중입니다."
                    : "프로젝트 컨텍스트와 함께 Blueprint가 저장됩니다."}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="globalCaseId" className="field-label">
                  벤치마크 case id
                </label>
                {linkedCases.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500">아이디어 연결 벤치마크 — 클릭하면 자동 입력됩니다</p>
                    <div className="flex flex-wrap gap-2">
                      {linkedCases.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setForm((cur) => ({ ...cur, globalCaseId: c.id }))}
                          className={`rounded-lg border px-3 py-1.5 text-sm transition
                            ${form.globalCaseId === c.id
                              ? "border-blue-300 bg-blue-50 font-medium text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50"}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <input
                  id="globalCaseId"
                  value={form.globalCaseId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, globalCaseId: event.target.value }))
                  }
                  className="input"
                  placeholder="Discovery 결과의 case id"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="budget" className="field-label">
                    예산
                  </label>
                  <input
                    id="budget"
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="targetMarket" className="field-label">
                    타깃 마켓
                  </label>
                  <select
                    id="targetMarket"
                    value={form.targetMarket}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetMarket: event.target.value }))
                    }
                    className="select"
                  >
                    {targetMarketOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4"
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Credit status
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Blueprint 1회 실행 시 {BLUEPRINT_CREDIT_COST} 크레딧이 차감됩니다.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Current balance
                    </p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {user?.isAdmin ? "Unlimited" : `${currentCreditBalance ?? "-"} credits`}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !hasEnoughCredits}
                className="btn-primary w-full"
              >
                {submitting
                  ? "Blueprint 생성 중..."
                  : hasEnoughCredits
                    ? "실행 Blueprint 생성"
                    : "크레딧 충전 후 이용 가능"}
              </button>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="eyebrow">최근 탐색</p>
                <span className="badge badge-neutral">{recentCases.length} cases</span>
              </div>
              {recentCases.length === 0 ? (
                <EmptyState
                  title="최근 Discovery 결과가 없습니다"
                  description="먼저 Discovery에서 글로벌 사례를 찾으면 case id를 눌러 바로 Blueprint로 이어갈 수 있습니다."
                />
              ) : (
                <div className="grid gap-3">
                  {recentCases.map((caseItem) => (
                    <button
                      key={`${caseItem.companyName}-${caseItem.rank}`}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          globalCaseId: caseItem.caseId || current.globalCaseId,
                        }))
                      }
                      className="rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[rgba(29,42,36,0.22)] hover:bg-gray-50"
                    >
                      <p className="text-sm font-semibold text-gray-900">{caseItem.companyName}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {caseItem.industry || "업종 미상"} · {caseItem.businessModel}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        case id {caseItem.caseId || "없음"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Surface>

          <Surface className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">생성된 전략</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-900">
                  한국형 실행 Blueprint
                </h2>
              </div>
              {result ? (
                <span className="badge badge-accent">
                  feasibility {result.feasibilityScore}/100
                </span>
              ) : null}
            </div>

            {!result ? (
              <EmptyState
                title="아직 생성된 전략이 없습니다"
                description="Discovery에서 고른 사례를 기준으로 규제, 로컬라이징, 실행 단계를 묶은 계획이 여기에 나타납니다."
              />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Benchmark</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {result.benchmarkCase.companyName}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {result.benchmarkCase.industry || "업종 미상"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400">수익 모델</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {result.benchmarkCase.revenueModel || "미상"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400">Budget</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatCurrency(form.budget)}
                    </p>
                  </div>
                </div>

                <StructuredData data={result.analysis} />
              </div>
            )}
          </Surface>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function BlueprintPage() {
  return (
    <Suspense fallback={null}>
      <BlueprintContent />
    </Suspense>
  );
}
