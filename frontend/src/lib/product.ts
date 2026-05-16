export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export const targetMarketOptions: SelectOption[] = [
  { value: "B2C", label: "B2C", hint: "소비자 대상 서비스" },
  { value: "B2B", label: "B2B", hint: "기업용 SaaS와 업무 툴" },
  { value: "B2B2C", label: "B2B2C", hint: "파트너를 통한 확장" },
];

export const budgetRangeOptions: SelectOption[] = [
  { value: "ZERO", label: "무자본" },
  { value: "UNDER_5M", label: "500만원 이하" },
  { value: "FIVE_TO_10M", label: "500만 ~ 1,000만원" },
  { value: "TEN_TO_30M", label: "1,000만 ~ 3,000만원" },
  { value: "THIRTY_TO_50M", label: "3,000만 ~ 5,000만원" },
  { value: "FIFTY_TO_100M", label: "5,000만 ~ 1억원" },
  { value: "OVER_100M", label: "1억원 이상" },
];

export const teamSizeOptions: SelectOption[] = [
  { value: "SOLO", label: "1인" },
  { value: "TWO_TO_THREE", label: "2~3인" },
  { value: "FOUR_TO_TEN", label: "4~10인" },
  { value: "OVER_TEN", label: "10인 이상" },
];

export const commitmentOptions: SelectOption[] = [
  { value: "FULL_TIME", label: "풀타임" },
  { value: "PART_TIME", label: "파트타임" },
  { value: "SIDE_PROJECT", label: "사이드 프로젝트" },
];

export const launchTimelineOptions: SelectOption[] = [
  { value: "ONE_MONTH", label: "1개월 이내" },
  { value: "THREE_MONTHS", label: "1~3개월" },
  { value: "SIX_MONTHS", label: "3~6개월" },
  { value: "ONE_YEAR", label: "6개월~1년" },
  { value: "OVER_ONE_YEAR", label: "1년 이상" },
];

export const riskToleranceOptions: SelectOption[] = [
  { value: "CONSERVATIVE", label: "보수적" },
  { value: "BALANCED", label: "균형형" },
  { value: "AGGRESSIVE", label: "공격형" },
];

export const teamMemberRoleLabels: Record<string, string> = {
  OWNER: "오너",
  DEVELOPER: "개발자",
  DESIGNER: "디자이너",
  MARKETER: "마케터",
  ADVISOR: "어드바이저",
  MEMBER: "팀원",
};

export const teamMemberRoleOptions: SelectOption[] = Object.entries(teamMemberRoleLabels).map(
  ([value, label]) => ({ value, label }),
);

export const communityCategoryOptions: SelectOption[] = [
  { value: "IDEA_SHARE", label: "아이디어 공유" },
  { value: "QUESTION", label: "질문" },
  { value: "CASE_STUDY", label: "케이스 스터디" },
  { value: "TEAM_RECRUIT", label: "팀 모집" },
  { value: "OUTSOURCE_REQUEST", label: "외주 구인" },
  { value: "AC_REQUEST", label: "AC 컨설팅 요청" },
  { value: "FREE_TALK", label: "자유 토크" },
];

export const userTypeOptions: Array<SelectOption & { icon: string }> = [
  {
    value: "FOUNDER",
    label: "창업가",
    hint: "아이디어를 검증하고 실행으로 옮기고 싶을 때",
    icon: "Founder",
  },
  {
    value: "EXPERT",
    label: "전문가",
    hint: "개발·디자인·마케팅·AC·투자 등 창업가에게 도움을 주는 역할",
    icon: "Expert",
  },
];

export const userTypeLabels: Record<string, string> = Object.fromEntries(
  userTypeOptions.map((option) => [option.value, option.label]),
);

export const planLabels: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
  TEAM: "Team",
  ENTERPRISE: "Enterprise",
};

export const marketingStats = [
  { value: "12", label: "데이터 모델", hint: "스키마와 관계형 구조 설계 완료" },
  { value: "3", label: "핵심 AI 툴", hint: "Discovery, Blueprint, Idea Match" },
  { value: "50", label: "무료 크레딧", hint: "가입 즉시 첫 탐색을 바로 시작" },
  { value: "1", label: "운영 콘솔", hint: "투자자와 창업가가 함께 쓰는 하나의 워크스페이스" },
];

export const featurePillars = [
  {
    title: "Discovery",
    eyebrow: "Benchmark intelligence",
    description: "전 세계 사례를 검색해 어떤 모델이 시장에서 통했는지 빠르게 파악합니다.",
    bullet: "유사도 기반 사례 검색과 구조화된 메타데이터를 함께 확인",
  },
  {
    title: "Blueprint",
    eyebrow: "Localized execution",
    description: "선택한 글로벌 케이스를 한국 시장에서 어떻게 풀지 실행 전략으로 바꿔줍니다.",
    bullet: "규제, 로컬라이징, 대안 설계까지 한 번에 정리",
  },
  {
    title: "Idea Match",
    eyebrow: "Founder fit",
    description: "팀 역량과 예산, 시장 선호를 바탕으로 현실적인 아이디어를 추천합니다.",
    bullet: "내 상황에 맞는 창업 옵션을 우선순위까지 포함해 제안",
  },
];

export const workflowSteps = [
  {
    title: "시장 탐색",
    description: "관심 키워드와 타깃 마켓을 넣고 글로벌 사례를 찾습니다.",
  },
  {
    title: "실행 설계",
    description: "벤치마크할 회사를 골라 한국형 실행 청사진을 생성합니다.",
  },
  {
    title: "아이디어 구체화",
    description: "팀 역량과 자원에 맞는 사업 아이디어를 구체적인 카드로 정리합니다.",
  },
];

export const personaHighlights = [
  {
    title: "Founder workflow",
    description: "문제 정의부터 아이디어 검증, MVP 기획까지 한 흐름으로 이어집니다.",
  },
  {
    title: "Investor scouting",
    description: "새로운 패턴을 탐색하고 비교 가능한 케이스를 빠르게 읽어낼 수 있습니다.",
  },
  {
    title: "Accelerator pipeline",
    description: "커뮤니티와 북마크를 통해 유망 팀을 발굴하고 후속 액션을 설계할 수 있습니다.",
  },
];

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(value: number | string | bigint | null | undefined) {
  if (value === null || value === undefined || value === "") return "미설정";
  const numeric =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "string"
        ? Number(value)
        : value;

  if (!Number.isFinite(numeric)) return String(value);

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("ko-KR").format(numeric);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("ko-KR", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  return formatter.format(diffMonths, "month");
}

export function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getOptionLabel(options: SelectOption[], value: string | null | undefined) {
  return options.find((option) => option.value === value)?.label ?? value ?? "-";
}

export function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseJsonArray(value: unknown) {
  if (!value) return [] as string[];
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return splitTags(value);
  }
  return [] as string[];
}

export function clampText(value: string, maxLength = 180) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function readError(error: unknown, fallback = "문제가 발생했습니다.") {
  const creditError = getCreditErrorDetails(error);
  if (creditError) {
    return creditError.creditBalance === null
      ? `크레딧이 부족합니다. 필요 ${creditError.required}.`
      : `크레딧이 부족합니다. 필요 ${creditError.required}, 현재 ${creditError.creditBalance}.`;
  }

  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if ("error" in error && typeof (error as { error?: unknown }).error === "string") {
      return (error as { error: string }).error;
    }
    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return fallback;
}

export type CreditErrorDetails = {
  required: number;
  creditBalance: number | null;
  feature?: string;
  hint?: string;
};

export function getCreditErrorDetails(error: unknown): CreditErrorDetails | null {
  if (!error || typeof error !== "object") return null;

  const details = error as {
    errorCode?: unknown;
    required?: unknown;
    creditBalance?: unknown;
    feature?: unknown;
    hint?: unknown;
  };

  if (details.errorCode !== "INSUFFICIENT_CREDITS") return null;

  return {
    required: typeof details.required === "number" ? details.required : 0,
    creditBalance: typeof details.creditBalance === "number" ? details.creditBalance : null,
    feature: typeof details.feature === "string" ? details.feature : undefined,
    hint: typeof details.hint === "string" ? details.hint : undefined,
  };
}

export type WorkflowStepKey = "brief" | "blueprint" | "ideaMatch";
export type WorkflowStepStatus = "done" | "current" | "upcoming";

export type WorkflowAction = {
  href: string;
  label: string;
  description: string;
};

export type ProjectWorkflowStep = {
  key: WorkflowStepKey;
  title: string;
  description: string;
  status: WorkflowStepStatus;
};

export type ProjectWorkflowState = {
  steps: ProjectWorkflowStep[];
  completedCount: number;
  completionPercent: number;
  stageLabel: string;
  summary: string;
  nextAction: WorkflowAction;
};

const projectWorkflowSteps: { key: WorkflowStepKey; title: string; description: string }[] = [
  {
    key: "brief",
    title: "Project brief",
    description: "Define the market, budget, and the problem shape for this project.",
  },
  {
    key: "ideaMatch",
    title: "Idea Match",
    description: "Generate startup options that fit the team's real constraints.",
  },
];

export function getProjectWorkflowState(input: {
  projectId: string;
  blueprintCount?: number | null;
  ideaSessionCount?: number | null;
}): ProjectWorkflowState {
  const ideaSessionCount = Math.max(0, input.ideaSessionCount ?? 0);

  const completionByKey: Record<WorkflowStepKey, boolean> = {
    brief: true,
    blueprint: true,
    ideaMatch: ideaSessionCount > 0,
  };

  const firstPendingStep =
    projectWorkflowSteps.find((step) => !completionByKey[step.key])?.key ?? null;

  const steps = projectWorkflowSteps.map((step) => ({
    ...step,
    status: completionByKey[step.key]
      ? ("done" as const)
      : firstPendingStep === step.key
        ? ("current" as const)
        : ("upcoming" as const),
  }));

  const completedCount = steps.filter((step) => step.status === "done").length;
  const completionPercent = Math.round((completedCount / steps.length) * 100);

  if (ideaSessionCount === 0) {
    return {
      steps,
      completedCount,
      completionPercent,
      stageLabel: "아이디어 매칭 대기",
      summary:
        "프로젝트 조건이 준비됐습니다. 본인 조건에 맞는 한국 시장 아이디어를 생성해보세요.",
      nextAction: {
        href: `/idea-match?projectId=${input.projectId}`,
        label: "아이디어 매칭 시작",
        description: "예산·팀·관심 분야에 맞는 한국형 아이디어 5개를 받아봅니다.",
      },
    };
  }

  return {
    steps,
    completedCount,
    completionPercent,
    stageLabel: "진행 중",
    summary:
      "아이디어 매칭 세션이 진행 중입니다. 새 세션을 돌려 옵션을 비교하거나 기존 방향을 정교화하세요.",
    nextAction: {
      href: `/idea-match?projectId=${input.projectId}`,
      label: "새 매칭 실행",
      description: "다른 조건으로 아이디어를 추가 탐색합니다.",
    },
  };
}
