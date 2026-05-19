/**
 * 회의록 템플릿 — 프론트 렌더링용. 백엔드 src/lib/meetingTemplates.ts 와 키·라벨 동기화 필수.
 */

export type MeetingTemplateKey =
  | "DEFAULT"
  | "STANDUP"
  | "INVESTOR"
  | "USER_INTERVIEW"
  | "RETRO";

export type SectionKind = "stringList" | "actionList" | "qaList";

export type TemplateSection = {
  field: string;
  label: string;
  kind: SectionKind;
  tone?: "default" | "amber" | "rose" | "emerald" | "sky";
  emoji?: string;
};

export type TemplateCategory = "일반" | "팀 내부" | "외부 미팅";

export type MeetingTemplateMeta = {
  key: MeetingTemplateKey;
  label: string;
  description: string;
  emoji: string;
  category: TemplateCategory;
  sections: TemplateSection[];
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["일반", "팀 내부", "외부 미팅"];

export const MEETING_TEMPLATES: Record<MeetingTemplateKey, MeetingTemplateMeta> = {
  DEFAULT: {
    key: "DEFAULT",
    label: "팀 정기 회의",
    emoji: "📝",
    description: "핵심 요약 · 결정 사항 · 액션 아이템 · 다음 단계",
    category: "일반",
    sections: [
      { field: "keyPoints",  label: "핵심 요약",      kind: "stringList", tone: "default" },
      { field: "decisions",  label: "결정 사항",      kind: "stringList", tone: "amber",   emoji: "✅" },
      { field: "actions",    label: "액션 아이템",    kind: "actionList", tone: "rose",    emoji: "📋" },
      { field: "nextSteps",  label: "다음 단계",      kind: "stringList", tone: "emerald", emoji: "🔜" },
    ],
  },

  STANDUP: {
    key: "STANDUP",
    label: "데일리 스탠드업",
    emoji: "☀️",
    description: "어제 한 일 / 오늘 할 일 / 블로커",
    category: "팀 내부",
    sections: [
      { field: "yesterday", label: "어제 한 일", kind: "actionList", tone: "default" },
      { field: "today",     label: "오늘 할 일", kind: "actionList", tone: "default"  },
      { field: "blockers",  label: "블로커",     kind: "actionList", tone: "rose",   emoji: "🚧" },
    ],
  },

  INVESTOR: {
    key: "INVESTOR",
    label: "투자자 · 파트너 미팅",
    emoji: "💰",
    description: "Q&A · 우려 사항 · 요청 자료 · 다음 단계",
    category: "외부 미팅",
    sections: [
      { field: "qa",         label: "Q & A",           kind: "qaList",     tone: "default", emoji: "💬" },
      { field: "concerns",   label: "우려 사항",       kind: "stringList", tone: "amber",   emoji: "⚠" },
      { field: "followUps",  label: "요청 자료 · FU",  kind: "stringList", tone: "rose",    emoji: "📎" },
      { field: "nextSteps",  label: "다음 단계",       kind: "stringList", tone: "emerald", emoji: "🔜" },
    ],
  },

  USER_INTERVIEW: {
    key: "USER_INTERVIEW",
    label: "고객 · 유저 인터뷰",
    emoji: "🎤",
    description: "페인포인트 · 인사이트 · 가설 검증 · 직접 인용",
    category: "외부 미팅",
    sections: [
      { field: "painPoints",           label: "페인포인트",    kind: "stringList", tone: "rose",    emoji: "🩹" },
      { field: "insights",             label: "인사이트",      kind: "stringList", tone: "default",  emoji: "💡" },
      { field: "hypothesesValidated",  label: "검증된 가설",   kind: "stringList", tone: "emerald", emoji: "✅" },
      { field: "hypothesesRejected",   label: "반증된 가설",   kind: "stringList", tone: "amber",   emoji: "❌" },
      { field: "openQuestions",        label: "추가 검증 필요", kind: "stringList", tone: "sky",     emoji: "❓" },
      { field: "quotes",               label: "직접 인용",     kind: "stringList", tone: "default", emoji: "❝" },
    ],
  },

  RETRO: {
    key: "RETRO",
    label: "스프린트 회고 (KPT)",
    emoji: "🔄",
    description: "Keep — 유지 · Problem — 문제 · Try — 시도",
    category: "팀 내부",
    sections: [
      { field: "keep",    label: "Keep — 유지",    kind: "stringList", tone: "emerald" },
      { field: "problem", label: "Problem — 문제", kind: "stringList", tone: "rose"    },
      { field: "try",     label: "Try — 시도",     kind: "stringList", tone: "default"  },
    ],
  },
};

export const TEMPLATE_LIST: MeetingTemplateMeta[] = [
  MEETING_TEMPLATES.DEFAULT,
  MEETING_TEMPLATES.STANDUP,
  MEETING_TEMPLATES.INVESTOR,
  MEETING_TEMPLATES.USER_INTERVIEW,
  MEETING_TEMPLATES.RETRO,
];

export const TONE_TEXT: Record<NonNullable<TemplateSection["tone"]>, string> = {
  default: "text-zinc-300",
  amber:   "text-amber-300",
  rose:    "text-rose-300",
  emerald: "text-emerald-300",
  sky:     "text-sky-300",
};

/** 템플릿별 데모용 raw transcript 샘플 */
export const TEMPLATE_SAMPLES: Record<MeetingTemplateKey, string> = {
  DEFAULT: `지수: 다들 모이셨네요. 오늘 안건은 두 가지입니다. 결제 모듈 마이그레이션 일정이랑 신규 채용 건이에요.
민호: 결제 쪽은 지난주에 토스 PG 연동 끝났고, 다음 주 화요일에 스테이징 배포 예정입니다.
지수: 좋네요. 그럼 결제 모듈은 다음 주 화요일 스테이징, 그 다음 주 월요일 프로덕션 배포로 결정하죠.
민호: 네, 그렇게 가겠습니다. 한 가지 우려는 환불 플로우 테스트가 아직 안 끝났어요.
지수: 환불은 수민님이 이번 주 금요일까지 QA 시나리오 작성하고 다음 주 월요일 같이 점검하시죠.
수민: 네, 알겠습니다.
지수: 채용은 백엔드 시니어 한 명 충원하기로 결정. 민호님이 잡디 초안 작성, 다음 회의 때 검토하겠습니다.`,

  STANDUP: `현우: 어제는 회원가입 API 테스트 케이스 작성했고요, 오늘은 그거 PR 리뷰 받고 머지할 예정입니다. 블로커는 없습니다.
지영: 어제 디자인 시스템 토큰 정리 마무리했고, 오늘은 신규 페이지 와이어프레임 그릴 거예요. 블로커는 폰트 라이센스 확인이 아직 안 됐다는 거.
민호: 어제 결제 PG 연동 디버깅 했는데, 오늘 마저 끝낼 예정입니다. 블로커는 토스 샌드박스가 간헐적으로 끊겨서 테스트가 느려요.
현우: 그건 어제도 비슷했는데 토스 측에 이미 문의 넣어둔 상태입니다.`,

  INVESTOR: `투자자: 우선 핵심 지표가 어떻게 되시는지 궁금합니다. MAU랑 retention 위주로요.
대표: 현재 MAU는 1.2만이고, 8주차 retention이 32%입니다. 지난 분기 대비 두 배 가까이 늘었어요.
투자자: retention은 좋네요. 그런데 MAU 절대값이 아직 작은데, 어떤 채널로 성장하고 있나요?
대표: 90%가 오가닉이고 SEO랑 커뮤니티 추천입니다. 유료 광고는 아직 안 돌리고 있어요.
투자자: 알겠습니다. 한 가지 우려는 결국 paid acquisition을 시작했을 때 CAC가 어떻게 나올지 모른다는 점이에요.
대표: 맞습니다. 그래서 시드 라운드 자금의 30%를 그 검증에 쓸 계획입니다.
투자자: 좋습니다. 그럼 paid 채널 테스트 결과랑 코호트 retention 데이터를 자료로 보내주세요. 그리고 팀 백그라운드 한 페이지로 정리한 자료도 함께요.
대표: 네, 다음 주 월요일까지 보내드리겠습니다.
투자자: 그 자료 보고 나면 파트너 미팅 잡겠습니다.`,

  USER_INTERVIEW: `진행자: 평소에 소규모 모임 운영할 때 어떤 앱을 쓰세요?
사용자: 주로 카카오톡 오픈채팅인데요, 솔직히 불편해요. 광고가 너무 많이 들어와서 진짜 대화가 다 묻혀요.
진행자: 어떤 점이 제일 답답하세요?
사용자: 모임 멤버가 아닌 사람들이 들어오는 게 제일 문제예요. 오픈채팅은 막을 방법이 없거든요. 그래서 분위기가 깨져요.
진행자: 만약 초대받은 멤버만 들어오고 광고가 없는 공간이 있다면 쓰시겠어요?
사용자: 당연하죠. 근데 앱을 새로 설치해야 하면 멤버들한테 설득하기 힘들어요. 카카오톡이 워낙 익숙해서.
진행자: 비용은요? 한 달에 얼마 정도면 괜찮을 것 같으세요?
사용자: 제가 방장이니까 제가 내는 거면 월 5천원 이하면 괜찮아요. 커피 한 잔 아끼면 되니까요.`,

  RETRO: `진행자: 이번 스프린트 회고 시작하겠습니다. Keep부터 갈게요.
멤버1: 매일 스탠드업이 15분 안쪽으로 끝나서 좋았어요. 이거 유지하면 좋겠습니다.
멤버2: PR 리뷰가 평균 4시간 안에 돌고 있어요. 이것도 계속 가면 좋겠습니다.
진행자: Problem은요?
멤버1: 스프린트 막판에 QA 병목이 또 생겼어요. 매번 같은 문제예요.
멤버2: 디자인 핸드오프가 늦어서 개발 시작이 미뤄졌습니다.
멤버3: 회고 자체가 너무 길어요. 1시간 30분은 과한 것 같아요.
진행자: Try는 어떻게 가져갈까요?
멤버1: QA 자동화 시나리오를 스프린트 초반에 같이 짜는 걸 시도해보면 어떨까요.
멤버2: 디자인이 50% 정도 됐을 때 미리 개발 사이드에 공유하는 걸 시도해보겠습니다.
멤버3: 회고는 다음번에 60분 타임박스로 끊어보죠.`,
};
