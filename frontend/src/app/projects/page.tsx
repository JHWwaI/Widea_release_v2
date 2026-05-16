"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, LoadingState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatCurrency, getProjectWorkflowState, readError } from "@/lib/product";
import type { ProjectListResponse, ProjectSummary } from "@/lib/types";

// ── 설문 옵션 데이터 ──────────────────────────────────────────────

const BUDGET_RANGE_OPTIONS = [
  { value: "UNDER_5M", label: "500만원 미만" },
  { value: "FIVE_TO_10M", label: "500만 ~ 1,000만원" },
  { value: "TEN_TO_30M", label: "1,000만 ~ 3,000만원" },
  { value: "THIRTY_TO_50M", label: "3,000만 ~ 5,000만원" },
  { value: "FIFTY_TO_100M", label: "5,000만 ~ 1억원" },
  { value: "OVER_100M", label: "1억원 이상" },
];

const COMMITMENT_OPTIONS = [
  { value: "FULL_TIME", label: "풀타임 (하루 8시간+)" },
  { value: "PART_TIME", label: "파트타임 (하루 4시간 내외)" },
  { value: "SIDE_PROJECT", label: "사이드 (퇴근 후 / 주말)" },
];

const TEAM_SIZE_OPTIONS = [
  { value: "SOLO", label: "혼자" },
  { value: "TWO_TO_THREE", label: "2~3명" },
  { value: "FOUR_TO_TEN", label: "4~10명" },
  { value: "OVER_TEN", label: "10명 이상" },
];

const TARGET_MARKET_OPTIONS = [
  { value: "B2C", label: "B2C — 일반 소비자" },
  { value: "B2B", label: "B2B — 기업/사업자" },
  { value: "B2B2C", label: "B2B2C — 기업 통해 소비자" },
];

const INDUSTRY_OPTIONS = [
  "FinTech", "HealthTech", "EdTech", "AgTech", "LegalTech",
  "PropTech", "HRTech", "LogisticsTech", "FoodTech", "RetailTech",
  "TravelTech", "Marketplace", "AI/ML", "SaaS", "Manufacturing",
  "PetTech", "BeautyTech", "FitnessTech", "CreatorEconomy", "CleanTech",
];

const TECHNICAL_SKILL_OPTIONS = [
  "개발 (웹/앱)", "AI/ML 개발", "데이터 분석", "디자인/UX",
  "마케팅/광고", "영업/BD", "재무/회계", "법무/특허",
  "제조/생산", "물류/운영", "의료/바이오", "교육",
];

const RISK_TOLERANCE_OPTIONS = [
  { value: "CONSERVATIVE", label: "안정적 — 검증된 모델 선호" },
  { value: "BALANCED", label: "균형 — 적당한 도전 OK" },
  { value: "AGGRESSIVE", label: "공격적 — 큰 리스크 감수 가능" },
];

// ── 타입 ──────────────────────────────────────────────────────────

type WizardForm = {
  // Step 1 — 내가 뭘 잘하나?
  currentJob: string;
  technicalSkills: string[];
  // Step 2 — 자원
  budgetRange: string;
  commitment: string;
  teamSize: string;
  // Step 3 — 방향
  targetMarket: string;
  industries: string[];
  // Step 4 — 어떤 문제?
  problemKeywords: string;
  // Step 5 — 리스크 / 기간
  riskTolerance: string;
  launchTimeline: string;
  // Step 6 — 프로젝트 이름
  title: string;
};

const INITIAL_FORM: WizardForm = {
  currentJob: "",
  technicalSkills: [],
  budgetRange: "",
  commitment: "",
  teamSize: "",
  targetMarket: "B2C",
  industries: [],
  problemKeywords: "",
  riskTolerance: "BALANCED",
  launchTimeline: "SIX_MONTHS",
  title: "",
};

const STEPS = [
  { key: "skills", label: "내 강점" },
  { key: "resources", label: "자원" },
  { key: "direction", label: "방향" },
  { key: "problem", label: "문제" },
  { key: "risk", label: "리스크" },
  { key: "confirm", label: "완료" },
];

// ── 헬퍼 ──────────────────────────────────────────────────────────

function toggleArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function ChipButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/15 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

function RadioCard({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-white/15 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    api<ProjectListResponse>("GET", "/api/projects", undefined, token)
      .then((data) => { if (!cancelled) setProjects(data.projects); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "프로젝트 목록을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  function set<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canNext(): boolean {
    if (step === 0) return form.currentJob.trim().length > 0;
    if (step === 1) return Boolean(form.budgetRange && form.commitment && form.teamSize);
    if (step === 2) return Boolean(form.targetMarket && form.industries.length > 0);
    if (step === 3) return form.problemKeywords.trim().length > 10;
    if (step === 4) return Boolean(form.riskTolerance && form.launchTimeline);
    if (step === 5) return form.title.trim().length > 0;
    return true;
  }

  async function handleSubmit() {
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await api<ProjectSummary>("POST", "/api/projects", {
        title: form.title.trim(),
        targetMarket: form.targetMarket,
        currentJob: form.currentJob,
        technicalSkills: form.technicalSkills,
        budgetRange: form.budgetRange,
        commitment: form.commitment,
        teamSize: form.teamSize,
        industries: form.industries,
        problemKeywords: form.problemKeywords,
        riskTolerance: form.riskTolerance,
        launchTimeline: form.launchTimeline,
      }, token);
      setProjects((prev) => [created, ...prev]);
      setShowWizard(false);
      setStep(0);
      setForm(INITIAL_FORM);
    } catch (caught) {
      setError(readError(caught, "프로젝트 생성에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(projectId: string) {
    if (!token) return;
    const confirmed = window.confirm("이 프로젝트를 삭제할까요?");
    if (!confirmed) return;
    try {
      await api("DELETE", `/api/projects/${projectId}`, undefined, token);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (caught) {
      setError(readError(caught, "프로젝트 삭제에 실패했습니다."));
    }
  }

  // ── 마법사 렌더 ────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 1 — 내 강점</p>
              <h2 className="text-xl font-bold text-white">현재 직업이 뭔가요?</h2>
              <p className="mt-1 text-sm text-zinc-400">AI가 나에게 맞는 아이디어를 찾는 데 가장 중요한 정보입니다.</p>
            </div>
            <input
              className="input"
              placeholder="예: 개발자, 간호사, 마케터, 자영업자, 프리랜서 디자이너..."
              value={form.currentJob}
              onChange={(e) => set("currentJob", e.target.value)}
            />
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">보유 역량 (복수 선택)</p>
              <div className="flex flex-wrap gap-2">
                {TECHNICAL_SKILL_OPTIONS.map((skill) => (
                  <ChipButton
                    key={skill}
                    label={skill}
                    active={form.technicalSkills.includes(skill)}
                    onClick={() => set("technicalSkills", toggleArray(form.technicalSkills, skill))}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 2 — 자원</p>
              <h2 className="text-xl font-bold text-white">얼마나 쏟을 수 있어요?</h2>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">투자 가능 예산</p>
              <div className="grid gap-2">
                {BUDGET_RANGE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.budgetRange === opt.value}
                    onClick={() => set("budgetRange", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">시간 투자 수준</p>
              <div className="grid gap-2">
                {COMMITMENT_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.commitment === opt.value}
                    onClick={() => set("commitment", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">팀 규모</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {TEAM_SIZE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.teamSize === opt.value}
                    onClick={() => set("teamSize", opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 3 — 방향</p>
              <h2 className="text-xl font-bold text-white">누구한테 팔고 싶어요?</h2>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">타겟 고객</p>
              <div className="grid gap-2">
                {TARGET_MARKET_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.targetMarket === opt.value}
                    onClick={() => set("targetMarket", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">관심 산업 (복수 선택, 최소 1개)</p>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map((ind) => (
                  <ChipButton
                    key={ind}
                    label={ind}
                    active={form.industries.includes(ind)}
                    onClick={() => set("industries", toggleArray(form.industries, ind))}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 4 — 문제</p>
              <h2 className="text-xl font-bold text-white">어떤 문제를 해결하고 싶어요?</h2>
              <p className="mt-1 text-sm text-zinc-400">직접 겪었거나, 주변에서 자주 보이는 불편함이면 더 좋아요.</p>
            </div>
            <textarea
              className="textarea min-h-[140px]"
              placeholder="예: 소규모 식당 사장님들이 재고 관리를 아직도 엑셀로 하고 있어요. 실수가 잦고 시간도 너무 많이 들고..."
              value={form.problemKeywords}
              onChange={(e) => set("problemKeywords", e.target.value)}
            />
            <p className="text-xs text-zinc-500">{form.problemKeywords.length}자 (최소 10자)</p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 5 — 리스크 & 기간</p>
              <h2 className="text-xl font-bold text-white">어느 정도 도전할 수 있어요?</h2>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">리스크 성향</p>
              <div className="grid gap-2">
                {RISK_TOLERANCE_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.riskTolerance === opt.value}
                    onClick={() => set("riskTolerance", opt.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-200">목표 런칭 타임라인</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "ONE_MONTH", label: "1개월 이내" },
                  { value: "THREE_MONTHS", label: "3개월 이내" },
                  { value: "SIX_MONTHS", label: "6개월 이내" },
                  { value: "ONE_YEAR", label: "1년 이내" },
                  { value: "OVER_ONE_YEAR", label: "1년 이상" },
                ].map((opt) => (
                  <RadioCard
                    key={opt.value}
                    label={opt.label}
                    active={form.launchTimeline === opt.value}
                    onClick={() => set("launchTimeline", opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 6 — 완료</p>
              <h2 className="text-xl font-bold text-white">이 프로젝트 이름을 지어주세요</h2>
              <p className="mt-1 text-sm text-zinc-400">나중에 여러 프로젝트를 구분하는 데 쓰입니다.</p>
            </div>
            <input
              className="input"
              placeholder="예: 소상공인 재고관리 SaaS, 반려동물 원격진료 앱..."
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.06] p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">입력 요약</p>
              <p className="text-sm text-zinc-200"><span className="text-zinc-500">직업</span> {form.currentJob}</p>
              <p className="text-sm text-zinc-200"><span className="text-zinc-500">예산</span> {BUDGET_RANGE_OPTIONS.find(o => o.value === form.budgetRange)?.label}</p>
              <p className="text-sm text-zinc-200"><span className="text-zinc-500">시간</span> {COMMITMENT_OPTIONS.find(o => o.value === form.commitment)?.label}</p>
              <p className="text-sm text-zinc-200"><span className="text-zinc-500">팀</span> {TEAM_SIZE_OPTIONS.find(o => o.value === form.teamSize)?.label}</p>
              <p className="text-sm text-zinc-200"><span className="text-zinc-500">타겟</span> {form.targetMarket}</p>
              <p className="text-sm text-zinc-200"><span className="text-zinc-500">산업</span> {form.industries.join(", ")}</p>
              <p className="text-sm text-zinc-200 line-clamp-2"><span className="text-zinc-500">문제</span> {form.problemKeywords}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="프로젝트 워크스페이스"
          title="프로젝트"
          description="설문을 작성하면 AI가 나에게 맞는 창업 아이디어를 찾아드립니다."
        />

        {error ? (
          <Surface className="border-red-100 bg-red-50 text-red-700">{error}</Surface>
        ) : null}

        {/* 새 프로젝트 버튼 */}
        {!showWizard ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setShowWizard(true); setStep(0); setForm(INITIAL_FORM); }}
              className="btn-primary"
            >
              + 새 프로젝트 만들기
            </button>
          </div>
        ) : null}

        {/* 설문 마법사 */}
        {showWizard ? (
          <Surface className="space-y-6">
            {/* 진행 바 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                {STEPS.map((s, i) => (
                  <span key={s.key} className={i === step ? "font-semibold text-blue-600" : ""}>{s.label}</span>
                ))}
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.08]">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {renderStep()}

            {/* 네비게이션 */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
              <button
                type="button"
                onClick={() => step === 0 ? (setShowWizard(false)) : setStep((s) => s - 1)}
                className="btn-ghost px-4 py-2 text-sm"
              >
                {step === 0 ? "취소" : "이전"}
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => s + 1)}
                  className="btn-primary disabled:opacity-40"
                >
                  다음
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canNext() || submitting}
                  onClick={handleSubmit}
                  className="btn-primary disabled:opacity-40"
                >
                  {submitting ? "생성 중..." : "아이디어 찾기 시작"}
                </button>
              )}
            </div>
          </Surface>
        ) : null}

        {/* 프로젝트 목록 */}
        {loading ? (
          <LoadingState label="프로젝트 목록을 준비하는 중입니다..." />
        ) : projects.length === 0 && !showWizard ? (
          <EmptyState
            title="아직 프로젝트가 없습니다"
            description="설문을 작성하면 AI가 나에게 맞는 창업 아이디어를 찾아드립니다."
            action={
              <button type="button" className="btn-primary" onClick={() => setShowWizard(true)}>
                첫 프로젝트 만들기
              </button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {projects.map((project) => {
              const workflow = getProjectWorkflowState({
                projectId: project.id,
                blueprintCount: project.blueprintCount,
                ideaSessionCount: project.ideaSessionCount,
              });
              return (
                <div key={project.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-white">{project.title}</h3>
                        <span className="badge badge-accent">{workflow.stageLabel}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {project.targetMarket} · {formatCurrency(project.budgetLimit)}
                      </p>
                    </div>
                    <ProjectMenu
                      project={project}
                      onRenamed={(newTitle) =>
                        setProjects((ps) => ps.map((p) => (p.id === project.id ? { ...p, title: newTitle } : p)))
                      }
                      onDelete={() => handleDelete(project.id)}
                    />
                  </div>
                  <div className="mt-4">
                    <Link href={`/projects/${project.id}`} className="btn-primary px-4 py-2 text-sm">
                      워크스페이스 열기
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

function ProjectMenu({
  project,
  onRenamed,
  onDelete,
}: {
  project: ProjectSummary;
  onRenamed: (newTitle: string) => void;
  onDelete: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function save() {
    if (!token || !title.trim() || title.trim() === project.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      await api("PUT", `/api/projects/${project.id}`, { title: title.trim() }, token);
      onRenamed(title.trim());
      setEditing(false);
    } catch (caught) {
      setEditError(readError(caught, "수정에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="프로젝트 옵션"
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setTitle(project.title);
                setEditError("");
                setEditing(true);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-white/[0.06]"
            >
              정보 편집
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="block w-full border-t border-white/[0.06] px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10"
            >
              삭제
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !saving && setEditing(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-semibold text-white">프로젝트 정보 편집</h4>
            <label className="mt-4 block text-xs font-medium text-zinc-400">프로젝트 이름</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
              placeholder="프로젝트 이름"
              maxLength={80}
            />
            {editError ? <p className="mt-2 text-xs text-rose-300">{editError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
              >
                취소
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !title.trim()}
                className="rounded-md border border-white/20 bg-white/[0.08] px-3 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
