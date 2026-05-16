"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { Badge, EmptyState, LoadingState, PageHeader, Surface } from "@/components/ProductUI";
import GovProgramMatcher from "@/components/GovProgramMatcher";
import DeepReportTab from "@/components/DeepReportTab";
import OverviewTeaser from "@/components/OverviewTeaser";
import ArtifactsPanel from "@/components/ArtifactsPanel";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError, teamMemberRoleLabels, teamMemberRoleOptions } from "@/lib/product";
import type {
  IdeaDetailResponse, MeetingListResponse, ProjectBlueprintSummary, ProjectDetailResponse,
  ProjectMeeting, TeamListResponse, TeamMember, UpdateGeneratedIdeaStatusResponse,
  ValidationLedgerEntry, ValidationLedgerListResponse,
} from "@/lib/types";

/* ── helpers ─────────────────────────────────────────── */

function isRec(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
function str(src: unknown, ...keys: string[]): string | null {
  if (typeof src === "string" && src.trim()) return src.trim();
  if (!isRec(src)) return null;
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
function statusMeta(s: string) {
  if (s === "SELECTED")   return { text: "대표 아이디어", tone: "accent"   as const };
  if (s === "SHORTLISTED") return { text: "Shortlist",   tone: "success"  as const };
  if (s === "ARCHIVED")   return { text: "보관됨",        tone: "warning"  as const };
  return                         { text: "초안",          tone: "neutral"  as const };
}

/* ── 서류 체크리스트 ──────────────────────────────────── */

const DOC_GROUPS = [
  {
    label: "법인 설립",
    items: ["사업자등록증 발급", "법인등기부등본 발급", "사업용 계좌 개설"],
  },
  {
    label: "공동창업자 계약",
    items: ["공동창업자 계약서 (Co-founder Agreement)", "주주간 계약서 (SHA)", "비밀유지계약서 (NDA)"],
  },
  {
    label: "IR 자료",
    items: ["사업계획서 초안", "피치덱 (Pitch Deck)", "재무 계획서 / 유닛 이코노믹스"],
  },
  {
    label: "채용 · 외주",
    items: ["근로계약서 템플릿 확보", "외주 계약서 (Outsourcing Agreement)", "프리랜서 NDA"],
  },
  {
    label: "지식재산",
    items: ["상표 출원 여부 확인", "특허 선행기술 조사", "도메인 / 브랜드명 확보"],
  },
];

/* ── 기획 설계 필드 ──────────────────────────────────── */

const PLAN_FIELDS = [
  { key: "problem",    label: "해결하려는 문제",      placeholder: "어떤 문제를 왜 지금 해결해야 하는가?" },
  { key: "solution",   label: "솔루션 / 핵심 기능",   placeholder: "어떤 방식으로 문제를 해결하는가?" },
  { key: "customer",   label: "타겟 고객",            placeholder: "누구의 문제인가? 얼마나 많은가?" },
  { key: "revenue",    label: "수익 모델",            placeholder: "어떻게 돈을 버는가? 가격은?" },
  { key: "milestone",  label: "초기 마일스톤 (3개월)", placeholder: "3개월 안에 무엇을 증명해야 하는가?" },
  { key: "resource",   label: "현재 보유 자원",        placeholder: "팀, 예산, 시간, 기술, 네트워크 등" },
  { key: "hypothesis", label: "핵심 가설",            placeholder: "가장 먼저 검증해야 할 가설은?" },
];

/* ── 인라인 편집 컴포넌트 (Slack 스타일) ─────────────── */

interface InlineEditProps {
  label: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  onDelete?: () => void;
  multiline?: boolean;
}

function InlineEdit({ label, value, placeholder, onSave, onDelete, multiline = true }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    onSave(draft);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
    if (!multiline && e.key === "Enter") { e.preventDefault(); commit(); }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/[0.08] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{label}</p>
          <div className="flex gap-2">
            <button type="button" onClick={commit} className="rounded-md bg-white/[0.10] px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/[0.15]">저장</button>
            <button type="button" onClick={() => { setDraft(value); setEditing(false); }} className="rounded-md bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-zinc-400 border border-white/15 hover:bg-white/[0.05]">취소</button>
          </div>
        </div>
        <textarea
          autoFocus
          className="w-full resize-none rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400 min-h-[80px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className="group w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left hover:border-white/20 hover:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300">{label}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="rounded px-1.5 py-0.5 text-[0.65rem] text-zinc-300 bg-white/[0.08]">편집</span>
          {onDelete ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onDelete?.())}
              className="rounded px-1.5 py-0.5 text-[0.65rem] text-rose-400 bg-rose-500/15 hover:bg-rose-500/25"
            >
              삭제
            </span>
          ) : null}
        </div>
      </div>
      {value ? (
        <p className="mt-1.5 text-sm text-zinc-200 whitespace-pre-wrap leading-6">{value}</p>
      ) : (
        <p className="mt-1.5 text-sm text-zinc-600 italic">{placeholder}</p>
      )}
    </button>
  );
}

/* ── 커스텀 섹션 컴포넌트 ────────────────────────────── */

function InlineEditCustom({
  title, content, onSaveTitle, onSaveContent, onDelete,
}: {
  title: string;
  content: string;
  onSaveTitle: (v: string) => void;
  onSaveContent: (v: string) => void;
  onDelete: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftContent, setDraftContent] = useState(content);

  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-2 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between gap-2">
        {editingTitle ? (
          <input
            autoFocus
            className="flex-1 rounded-lg border border-white/20 bg-white/[0.08] px-2 py-1 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-400"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={() => { onSaveTitle(draftTitle); setEditingTitle(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                onSaveTitle(draftTitle);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDraftTitle(title); setEditingTitle(true); }}
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
          >
            {title}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[0.65rem] text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 transition-opacity"
        >
          삭제
        </button>
      </div>

      {editingContent ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            className="w-full resize-none rounded-lg border border-white/20 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400 min-h-[80px]"
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { onSaveContent(draftContent); setEditingContent(false); } }}
            placeholder="내용을 입력하세요..."
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { onSaveContent(draftContent); setEditingContent(false); }} className="rounded-md bg-white/[0.10] px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/[0.15]">저장</button>
            <button type="button" onClick={() => { setDraftContent(content); setEditingContent(false); }} className="rounded-md bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-zinc-400 border border-white/15 hover:bg-white/[0.05]">취소</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setDraftContent(content); setEditingContent(true); }}
          className="w-full text-left"
        >
          {content ? (
            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-6">{content}</p>
          ) : (
            <p className="text-sm text-zinc-600 italic">클릭해서 내용 입력...</p>
          )}
        </button>
      )}
    </div>
  );
}

/* ── 탭 ─────────────────────────────────────────────── */

type Tab = "overview" | "deep" | "launch" | "plan" | "docs" | "team" | "outsource" | "validation";

// 3개 탭: 개요 (잠금) → 심층 리포트 (분석) → 실행 (도구 + 워크스페이스)
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "개요" },
  { id: "deep",     label: "심층 리포트" },
  { id: "launch",   label: "실행" },
];

/* ── 한국 외주 평균 시세 (출처: 크몽/위시켓 2024 공개 데이터) ── */
const OUTSOURCE_RATES = [
  { item: "MVP 웹 개발 (페이지 5–10개)", range: "8,000,000 – 25,000,000원", source: "크몽/위시켓 평균" },
  { item: "iOS/Android 앱 (네이티브)",   range: "20,000,000 – 60,000,000원", source: "위시켓 평균" },
  { item: "UI/UX 풀 디자인 (앱+웹)",     range: "3,000,000 – 12,000,000원", source: "크몽 평균" },
  { item: "랜딩 페이지 + 카피",          range: "500,000 – 2,500,000원", source: "크몽 평균" },
  { item: "퍼포먼스 마케팅 셋업",        range: "1,500,000 – 5,000,000원/월", source: "위시켓 평균" },
  { item: "법인 설립 대행",              range: "300,000 – 700,000원", source: "법무사 평균" },
];

/* (정적 정부지원사업 리스트는 GovProgramMatcher 컴포넌트가 동적 매칭으로 대체) */
const _GOVERNMENT_PROGRAMS_DEPRECATED = [
  { name: "예비창업패키지", agency: "중소벤처기업부", amount: "최대 1억원", url: "https://www.k-startup.go.kr/main.do", note: "창업 3년 이내 예비창업자" },
  { name: "초기창업패키지", agency: "중소벤처기업부", amount: "최대 1억원", url: "https://www.k-startup.go.kr/main.do", note: "창업 3년 이상 7년 이내" },
  { name: "TIPS 프로그램",  agency: "중소벤처기업부", amount: "최대 5억원", url: "https://www.jointips.or.kr/", note: "민간 투자 매칭형 R&D" },
  { name: "사업화 자금",    agency: "창업진흥원",     amount: "최대 7천만원", url: "https://www.k-startup.go.kr/main.do", note: "기술 기반 창업기업 대상" },
  { name: "청년창업사관학교", agency: "중소벤처기업부", amount: "최대 1억원", url: "https://start.kosmes.or.kr/", note: "만 39세 이하 창업 3년 이내" },
];

const DECISION_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "검증 중",  cls: "bg-white/[0.06] text-zinc-200 border-amber-500/30" },
  GO:      { label: "GO ✓",    cls: "bg-white/[0.06] text-zinc-200 border-emerald-500/30" },
  PIVOT:   { label: "PIVOT ↻", cls: "bg-white/[0.08] text-zinc-300 border-white/20" },
  HOLD:    { label: "HOLD ✗",  cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

/* ── page ────────────────────────────────────────────── */

export default function IdeaWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [idea, setIdea]         = useState<IdeaDetailResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [tab, setTab]           = useState<Tab>("overview");

  /* 기획 설계 */
  const [plan, setPlan] = useState<Record<string, string>>({});
  const [customSections, setCustomSections] = useState<Array<{ id: string; title: string; content: string }>>([]);

  /* 서류 체크리스트 */
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  /* DB 동기화용 debounce ref */
  const planSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 팀 · 회의 */
  const [teamMembers, setTeamMembers]   = useState<TeamMember[]>([]);
  const [meetings, setMeetings]         = useState<ProjectMeeting[]>([]);
  const [webhooks, setWebhooks]         = useState<{ slackWebhookUrl: string | null; discordWebhookUrl: string | null }>({ slackWebhookUrl: null, discordWebhookUrl: null });
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState("MEMBER");
  const [inviting, setInviting]         = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState("");
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [slackUrl, setSlackUrl]         = useState("");
  const [discordUrl, setDiscordUrl]     = useState("");
  const [savingWebhooks, setSavingWebhooks] = useState(false);
  const [collabError, setCollabError]   = useState("");

  /* 가설 검증 */
  const [vlBlueprints, setVlBlueprints]         = useState<ProjectBlueprintSummary[]>([]);
  const [vlBlueprintId, setVlBlueprintId]       = useState<string>("");
  const [validations, setValidations]           = useState<ValidationLedgerEntry[]>([]);
  const [vlLoading, setVlLoading]               = useState(false);
  const [vlError, setVlError]                   = useState("");
  const [vlHypothesis, setVlHypothesis]         = useState("");
  const [vlActionItem, setVlActionItem]         = useState("");
  const [vlAdding, setVlAdding]                 = useState(false);
  const [vlEditId, setVlEditId]                 = useState<string | null>(null);
  const [vlEditResult, setVlEditResult]         = useState("");
  const vlFetched = useRef(false);

  /* 데이터 로드 */
  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;
    setLoading(true);

    api<IdeaDetailResponse>("GET", `/api/ideas/${id}`, undefined, token)
      .then((data) => {
        if (cancelled) return;
        setIdea(data);
        // DB 데이터 우선, 없으면 localStorage 폴백
        if (data.planData) {
          if (data.planData.plan)           setPlan(data.planData.plan);
          if (data.planData.checked)        setChecked(data.planData.checked);
          if (data.planData.customSections) setCustomSections(data.planData.customSections);
        } else {
          const savedPlan    = localStorage.getItem(`idea-plan-${id}`);
          const savedChecked = localStorage.getItem(`idea-docs-${id}`);
          const savedCustom  = localStorage.getItem(`idea-custom-${id}`);
          if (savedPlan)    setPlan(JSON.parse(savedPlan));
          if (savedChecked) setChecked(JSON.parse(savedChecked));
          if (savedCustom)  setCustomSections(JSON.parse(savedCustom));
        }
        // 협업 데이터
        const pid = data.projectPolicy.id;
        Promise.all([
          api<TeamListResponse>("GET", `/api/projects/${pid}/team`, undefined, token),
          api<MeetingListResponse>("GET", `/api/projects/${pid}/meetings`, undefined, token),
          api<{ slackWebhookUrl: string | null; discordWebhookUrl: string | null }>("GET", `/api/projects/${pid}/webhooks`, undefined, token),
        ]).then(([t, m, w]) => {
          if (cancelled) return;
          setTeamMembers(t.members);
          setMeetings(m.meetings);
          setWebhooks(w);
          setSlackUrl(w.slackWebhookUrl || "");
          setDiscordUrl(w.discordWebhookUrl || "");
        }).catch(() => {});
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "아이디어를 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, token]);

  const schedulePlanSave = useCallback((
    nextPlan: Record<string, string>,
    nextCustom: Array<{ id: string; title: string; content: string }>,
    nextChecked: Record<string, boolean>,
  ) => {
    if (planSaveTimer.current) clearTimeout(planSaveTimer.current);
    planSaveTimer.current = setTimeout(() => {
      if (!token || !id) return;
      api("PATCH", `/api/ideas/${id}/plan`, {
        plan: nextPlan,
        customSections: nextCustom,
        checked: nextChecked,
      }, token).catch(() => {});
    }, 800);
  }, [id, token]);

  function updatePlan(key: string, value: string) {
    const next = { ...plan, [key]: value };
    setPlan(next);
    localStorage.setItem(`idea-plan-${id}`, JSON.stringify(next));
    schedulePlanSave(next, customSections, checked);
  }

  function addCustomSection() {
    const next = [...customSections, { id: crypto.randomUUID(), title: "새 섹션", content: "" }];
    setCustomSections(next);
    localStorage.setItem(`idea-custom-${id}`, JSON.stringify(next));
    schedulePlanSave(plan, next, checked);
  }

  function updateCustomSection(sid: string, patch: Partial<{ title: string; content: string }>) {
    const next = customSections.map((s) => s.id === sid ? { ...s, ...patch } : s);
    setCustomSections(next);
    localStorage.setItem(`idea-custom-${id}`, JSON.stringify(next));
    schedulePlanSave(plan, next, checked);
  }

  function deleteCustomSection(sid: string) {
    const next = customSections.filter((s) => s.id !== sid);
    setCustomSections(next);
    localStorage.setItem(`idea-custom-${id}`, JSON.stringify(next));
    schedulePlanSave(plan, next, checked);
  }

  function toggleDoc(item: string) {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    localStorage.setItem(`idea-docs-${id}`, JSON.stringify(next));
    schedulePlanSave(plan, customSections, next);
  }

  async function handleStatus(status: "SELECTED" | "SHORTLISTED" | "ARCHIVED") {
    if (!token || !idea) return;
    setSaving(true); setSaveMsg("");
    try {
      const res = await api<UpdateGeneratedIdeaStatusResponse>(
        "PATCH", `/api/idea-match/ideas/${idea.id}/status`, { status }, token,
      );
      setIdea((p) => p ? { ...p, status: res.idea.status } : p);
      setSaveMsg({ SELECTED: "대표 아이디어로 저장됐습니다.", SHORTLISTED: "Shortlist에 저장됐습니다.", ARCHIVED: "보관 처리됐습니다." }[status]);
    } catch (caught) { setError(readError(caught, "상태 변경 실패")); }
    finally { setSaving(false); }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !idea) return;
    setInviting(true); setCollabError("");
    try {
      const member = await api<TeamMember>("POST", `/api/projects/${idea.projectPolicy.id}/team`, { email: inviteEmail, role: inviteRole }, token);
      setTeamMembers((p) => [...p, member]);
      setInviteEmail("");
    } catch (caught) { setCollabError(readError(caught, "팀원 초대 실패")); }
    finally { setInviting(false); }
  }

  async function handleRemoveMember(memberId: string) {
    if (!token || !idea) return;
    try {
      await api("DELETE", `/api/projects/${idea.projectPolicy.id}/team/${memberId}`, undefined, token);
      setTeamMembers((p) => p.filter((m) => m.id !== memberId));
    } catch (caught) { setCollabError(readError(caught, "팀원 제거 실패")); }
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !idea) return;
    setCreatingMeeting(true); setCollabError("");
    try {
      const meeting = await api<ProjectMeeting>("POST", `/api/projects/${idea.projectPolicy.id}/meetings`, {
        title: meetingTitle, agenda: meetingAgenda || undefined, scheduledAt: meetingSchedule || undefined,
      }, token);
      setMeetings((p) => [meeting, ...p]);
      setMeetingTitle(""); setMeetingAgenda(""); setMeetingSchedule("");
    } catch (caught) { setCollabError(readError(caught, "회의 생성 실패")); }
    finally { setCreatingMeeting(false); }
  }

  async function handleDeleteMeeting(meetingId: string) {
    if (!token || !idea) return;
    try {
      await api("DELETE", `/api/projects/${idea.projectPolicy.id}/meetings/${meetingId}`, undefined, token);
      setMeetings((p) => p.filter((m) => m.id !== meetingId));
    } catch (caught) { setCollabError(readError(caught, "회의 삭제 실패")); }
  }

  async function handleSaveWebhooks(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !idea) return;
    setSavingWebhooks(true); setCollabError("");
    try {
      const updated = await api<{ slackWebhookUrl: string | null; discordWebhookUrl: string | null }>(
        "PATCH", `/api/projects/${idea.projectPolicy.id}/webhooks`,
        { slackWebhookUrl: slackUrl || null, discordWebhookUrl: discordUrl || null }, token,
      );
      setWebhooks(updated);
    } catch (caught) { setCollabError(readError(caught, "웹훅 저장 실패")); }
    finally { setSavingWebhooks(false); }
  }

  /* 가설 검증 로드 (탭 첫 진입 시 1회) */
  async function loadValidationTab() {
    if (!token || !idea || vlFetched.current) return;
    vlFetched.current = true;
    setVlLoading(true); setVlError("");
    try {
      const project = await api<ProjectDetailResponse>("GET", `/api/projects/${idea.projectPolicy.id}`, undefined, token);
      const bps = project.blueprints ?? [];
      setVlBlueprints(bps);
      if (bps.length > 0) {
        const firstId = bps[0].id;
        setVlBlueprintId(firstId);
        const res = await api<ValidationLedgerListResponse>("GET", `/api/blueprints/${firstId}/validations`, undefined, token);
        setValidations(res.validations);
      }
    } catch (caught) {
      setVlError(readError(caught, "가설 검증 데이터를 불러오지 못했습니다."));
    } finally {
      setVlLoading(false);
    }
  }

  async function loadValidations(blueprintId: string) {
    if (!token) return;
    setVlLoading(true); setVlError("");
    try {
      const res = await api<ValidationLedgerListResponse>("GET", `/api/blueprints/${blueprintId}/validations`, undefined, token);
      setValidations(res.validations);
    } catch (caught) {
      setVlError(readError(caught, "가설 목록을 불러오지 못했습니다."));
    } finally {
      setVlLoading(false);
    }
  }

  async function handleVlAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !vlBlueprintId || !vlHypothesis.trim()) return;
    setVlAdding(true); setVlError("");
    try {
      const entry = await api<ValidationLedgerEntry>(
        "POST", `/api/blueprints/${vlBlueprintId}/validations`,
        { hypothesis: vlHypothesis.trim(), actionItem: vlActionItem.trim() || null },
        token,
      );
      setValidations((p) => [...p, entry]);
      setVlHypothesis(""); setVlActionItem("");
    } catch (caught) {
      setVlError(readError(caught, "가설 추가에 실패했습니다."));
    } finally {
      setVlAdding(false);
    }
  }

  async function handleVlStatus(id: string, decisionStatus: string) {
    if (!token) return;
    try {
      const updated = await api<ValidationLedgerEntry>("PATCH", `/api/validations/${id}`, { decisionStatus }, token);
      setValidations((p) => p.map((v) => v.id === id ? updated : v));
    } catch (caught) {
      setVlError(readError(caught, "상태 변경에 실패했습니다."));
    }
  }

  async function handleVlSaveResult(id: string) {
    if (!token) return;
    try {
      const updated = await api<ValidationLedgerEntry>(
        "PATCH", `/api/validations/${id}`,
        { resultData: { note: vlEditResult } },
        token,
      );
      setValidations((p) => p.map((v) => v.id === id ? updated : v));
      setVlEditId(null); setVlEditResult("");
    } catch (caught) {
      setVlError(readError(caught, "결과 저장에 실패했습니다."));
    }
  }

  async function handleVlDelete(id: string) {
    if (!token) return;
    try {
      await api("DELETE", `/api/validations/${id}`, undefined, token);
      setValidations((p) => p.filter((v) => v.id !== id));
    } catch (caught) {
      setVlError(readError(caught, "삭제에 실패했습니다."));
    }
  }

  /* ── 렌더 ────────────────────────────────────────── */

  if (loading) return (
    <AuthGuard>
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState label="워크스페이스 로딩 중..." />
      </div>
    </AuthGuard>
  );

  if (error || !idea) return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <EmptyState
          title="아이디어를 찾을 수 없습니다"
          description={error || "삭제됐거나 접근 권한이 없습니다."}
          action={<Link href="/mypage" className="btn-primary">마이페이지로</Link>}
        />
      </div>
    </AuthGuard>
  );

  const sl = statusMeta(idea.status);

  // 출처 카드용: sourceBenchmarks(이유 포함) × matchedCases(메타데이터) 조인
  const matchedCaseList: Array<{
    companyName?: string;
    industry?: string | null;
    foundedYear?: number | null;
    fundingStage?: string | null;
    revenueModel?: string | null;
    score?: number;
  }> = Array.isArray(idea.matchedCases) ? (idea.matchedCases as Array<Record<string, unknown>>).map((c) => ({
    companyName: typeof c.companyName === "string" ? c.companyName : undefined,
    industry: typeof c.industry === "string" ? c.industry : null,
    foundedYear: typeof c.foundedYear === "number" ? c.foundedYear : null,
    fundingStage: typeof c.fundingStage === "string" ? c.fundingStage : null,
    revenueModel: typeof c.revenueModel === "string" ? c.revenueModel : null,
    score: typeof c.score === "number" ? c.score : undefined,
  })) : [];

  const sourceCards: Array<{
    companyName: string;
    why?: string;
    industry?: string | null;
    foundedYear?: number | null;
    fundingStage?: string | null;
    revenueModel?: string | null;
    score?: number;
  }> = Array.isArray(idea.sourceBenchmarks)
    ? idea.sourceBenchmarks.flatMap((b) => {
        const name = typeof b === "string" ? b : (isRec(b) && typeof b.companyName === "string" ? b.companyName : "");
        if (!name) return [];
        const why = isRec(b) && typeof b.whyReferencedKo === "string" ? b.whyReferencedKo : undefined;
        const meta = matchedCaseList.find((c) => c.companyName === name);
        return [{
          companyName: name,
          why,
          industry: meta?.industry ?? null,
          foundedYear: meta?.foundedYear ?? null,
          fundingStage: meta?.fundingStage ?? null,
          revenueModel: meta?.revenueModel ?? null,
          score: meta?.score,
        }];
      })
    : [];

  // 출처 회사명 리스트 (현재 미사용, 향후 메타데이터/공유에 사용)
  void sourceCards.map((s) => s.companyName);

  // Confidence 점수 분해 (시연용 휴리스틱: 출처 풍부도 + 매칭 점수 평균)
  const avgMatchScore = matchedCaseList.length > 0
    ? matchedCaseList.reduce((s, c) => s + (typeof c.score === "number" ? c.score : 0), 0) / matchedCaseList.length
    : 0;
  const confidenceBreakdown = {
    sourceCount: sourceCards.length,
    matchAvg: Math.round(avgMatchScore * 100),
    riskCount: Array.isArray(idea.risks) ? idea.risks.length : 0,
    hasExecution: Array.isArray(idea.executionPlan) && idea.executionPlan.length > 0,
  };

  const blueprintCases: { id: string; name: string }[] = Array.isArray(idea.sourceBenchmarks)
    ? idea.sourceBenchmarks.reduce<{ id: string; name: string }[]>((acc, b) => {
        if (isRec(b) && typeof b.globalCaseId === "string") {
          acc.push({ id: b.globalCaseId, name: typeof b.companyName === "string" ? b.companyName : b.globalCaseId });
        }
        return acc;
      }, [])
    : [];

  const blueprintUrl = (() => {
    const params = new URLSearchParams({ projectId: idea.projectPolicy.id });
    if (blueprintCases.length > 0) {
      params.set("caseIds", blueprintCases.map((c) => c.id).join(","));
      params.set("caseNames", blueprintCases.map((c) => c.name).join(","));
      params.set("caseId", blueprintCases[0].id);
    }
    return `/blueprint?${params.toString()}`;
  })();

  const execSteps = Array.isArray(idea.executionPlan) ? idea.executionPlan : [];
  const risks = Array.isArray(idea.risks) ? idea.risks : [];

  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalDocs = DOC_GROUPS.reduce((s, g) => s + g.items.length, 0);
  const planFilled = PLAN_FIELDS.filter((f) => plan[f.key]?.trim()).length;

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/mypage" className="hover:text-zinc-300">My Page</Link>
          <span>/</span>
          <Link href={`/projects/${idea.projectPolicy.id}`} className="hover:text-zinc-300">{idea.projectPolicy.title}</Link>
          <span>/</span>
          <span className="text-zinc-300 truncate max-w-[200px]">{idea.titleKo}</span>
        </div>

        <PageHeader
          eyebrow="프로젝트 분석"
          title={idea.titleKo}
          description={idea.oneLinerKo || idea.summaryKo || ""}
          badge={<Badge tone={sl.tone}>{sl.text}</Badge>}
          actions={
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving || idea.status === "SELECTED"} onClick={() => handleStatus("SELECTED")} className="btn-primary px-4 py-2 text-sm">
                {idea.status === "SELECTED" ? "대표 아이디어 ✓" : "대표 아이디어로 선정"}
              </button>
              <button type="button" disabled={saving || idea.status === "SHORTLISTED"} onClick={() => handleStatus("SHORTLISTED")} className="btn-secondary px-4 py-2 text-sm">
                Shortlist
              </button>
              <button type="button" disabled={saving} onClick={() => handleStatus("ARCHIVED")} className="btn-ghost px-4 py-2 text-sm">
                보관
              </button>
            </div>
          }
        />

        {saveMsg ? <Surface className="border-emerald-500/30 bg-white/[0.06] text-zinc-200 py-3">{saveMsg}</Surface> : null}

        {/* 워크스페이스 진입 CTA — SELECTED 일 때 가장 prominent */}
        {idea.status === "SELECTED" ? (
          <Link
            href={`/workspace/${idea.id}`}
            className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-gradient-to-br from-violet-500/[0.10] to-violet-500/[0.02] px-5 py-4 transition-all hover:border-white/30"
          >
            <div>
              <p className="text-xs font-semibold text-zinc-400">실행 시작</p>
              <p className="mt-0.5 text-base font-bold text-white">워크스페이스 열기 — 6단계 33개 작업으로 창업 진행</p>
            </div>
            <span className="rounded-xl bg-white/[0.10] px-4 py-2 text-sm font-bold text-white shadow-[0_4px_24px_-4px_rgba(124,58,237,0.5)] group-hover:bg-white/[0.15]">
              열기 →
            </span>
          </Link>
        ) : null}

        {/* 탭 */}
        <div className="border-b border-white/15" data-print="hide">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "border-indigo-400 text-zinc-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 탭: 개요 (야무진 요약 + 심층 리포트 진입) ──────── */}
        {tab === "overview" && (
          <OverviewTeaser
            idea={idea}
            sourceCards={sourceCards}
            confidenceBreakdown={confidenceBreakdown}
            onOpenDeep={() => setTab("deep")}
          />
        )}


        {/* ── 탭: 기획 · 설계 ───────────────────────────── */}
        {tab === "plan" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">기획 · 설계</p>
                <h2 className="text-lg font-semibold text-white">사업 기획서</h2>
              </div>
              <p className="text-xs text-zinc-500">클릭해서 편집 · 자동 저장</p>
            </div>

            {/* AI 참고 자료 요약 */}
            <details className="group rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-300 group-open:text-white">
                AI 분석 참고 자료 펼치기 →
              </summary>
              <div className="mt-3 grid gap-2 text-xs text-zinc-400">
                {idea.oneLinerKo ? <p><span className="font-semibold text-zinc-200">One-liner: </span>{idea.oneLinerKo}</p> : null}
                {idea.whyNowInKoreaKo ? <p><span className="font-semibold text-zinc-200">지금 해야 하는 이유: </span>{idea.whyNowInKoreaKo}</p> : null}
                {str(idea.targetCustomer, "personaKo", "persona") ? <p><span className="font-semibold text-zinc-200">고객: </span>{str(idea.targetCustomer, "personaKo", "persona")}</p> : null}
                {str(idea.businessModel, "modelKo", "type") ? <p><span className="font-semibold text-zinc-200">수익: </span>{str(idea.businessModel, "modelKo", "type")}</p> : null}
              </div>
            </details>

            {/* 기본 필드 — 인라인 편집 */}
            <div className="grid gap-2">
              {PLAN_FIELDS.map((field) => (
                <InlineEdit
                  key={field.key}
                  label={field.label}
                  value={plan[field.key] || ""}
                  placeholder={field.placeholder}
                  onSave={(v) => updatePlan(field.key, v)}
                />
              ))}
            </div>

            {/* 커스텀 섹션 */}
            {customSections.map((section) => (
              <InlineEditCustom
                key={section.id}
                title={section.title}
                content={section.content}
                onSaveTitle={(t) => updateCustomSection(section.id, { title: t })}
                onSaveContent={(c) => updateCustomSection(section.id, { content: c })}
                onDelete={() => deleteCustomSection(section.id)}
              />
            ))}

            {/* 섹션 추가 버튼 */}
            <button
              type="button"
              onClick={addCustomSection}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-zinc-500 hover:border-indigo-400/60 hover:text-zinc-300 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              섹션 추가
            </button>

            <div className="flex justify-end pt-1">
              <button type="button" onClick={() => setTab("docs")} className="btn-primary px-5 py-2.5">
                다음: 서류 체크리스트 →
              </button>
            </div>
          </div>
        )}

        {/* ── 탭: 서류 체크리스트 ───────────────────────── */}
        {tab === "docs" && (
          <div className="space-y-4">
            <Surface className="space-y-2">
              <p className="eyebrow">서류 체크리스트</p>
              <h2 className="text-lg font-semibold text-white">필요 서류 준비 현황</h2>
              <p className="text-sm text-zinc-400">
                창업에 필요한 서류를 단계별로 확인하세요. 체크 상태는 브라우저에 저장됩니다.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-2 flex-1 rounded-full bg-white/[0.05]">
                  <div
                    className="h-2 rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${(doneCount / totalDocs) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-zinc-200">{doneCount} / {totalDocs}</span>
              </div>
            </Surface>

            {DOC_GROUPS.map((group) => (
              <Surface key={group.label} className="space-y-3">
                <p className="text-sm font-bold text-zinc-200">{group.label}</p>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={!!checked[item]}
                          onChange={() => toggleDoc(item)}
                          className="h-4 w-4 rounded accent-indigo-500"
                        />
                        <span className={`text-sm ${checked[item] ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                          {item}
                        </span>
                        {checked[item] ? (
                          <span className="ml-auto text-xs font-semibold text-zinc-200">완료</span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              </Surface>
            ))}

            <div className="flex justify-end">
              <button type="button" onClick={() => setTab("team")} className="btn-primary px-5 py-2.5">
                다음: 팀 모집 →
              </button>
            </div>
          </div>
        )}

        {/* ── 탭: 팀 · 회의 ─────────────────────────────── */}
        {tab === "team" && (
          <div className="space-y-4">
            {collabError ? (
              <Surface className="border-rose-500/30 bg-rose-500/15 py-3 text-rose-300">{collabError}</Surface>
            ) : null}

            {/* 팀원 목록 */}
            <Surface className="space-y-4">
              <div>
                <p className="eyebrow">팀 관리</p>
                <h2 className="text-lg font-semibold text-white">팀원 관리</h2>
              </div>

              {teamMembers.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{member.user?.name || member.email}</p>
                        <p className="text-xs text-zinc-500">
                          {member.email} · {teamMemberRoleLabels[member.role] || member.role}
                          {member.status === "INVITED" ? " · 초대 대기 중" : " · 합류됨"}
                        </p>
                        {member.bio ? <p className="text-xs text-zinc-400">{member.bio}</p> : null}
                      </div>
                      <button type="button" onClick={() => handleRemoveMember(member.id)} className="btn-ghost px-3 py-1 text-xs text-rose-400">제거</button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="팀원이 없습니다"
                  description="아래에서 이메일로 팀원을 초대하세요."
                />
              )}

              <form onSubmit={handleInvite} className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">팀원 초대</p>
                <div className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="input flex-1" placeholder="이메일" required />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="select w-32">
                    {teamMemberRoleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button type="submit" disabled={inviting} className="btn-primary shrink-0 px-4 text-sm">
                    {inviting ? "..." : "초대"}
                  </button>
                </div>
              </form>
            </Surface>

            {/* 회의실 */}
            <Surface className="space-y-4">
              <div>
                <p className="eyebrow">회의·미팅</p>
                <h2 className="text-lg font-semibold text-white">회의실 · 미팅 링크</h2>
                <p className="mt-1 text-sm text-zinc-500">Jitsi 기반 — 링크를 공유하면 누구든 바로 입장할 수 있습니다.</p>
              </div>

              {meetings.length > 0 ? (
                <div className="space-y-2">
                  {meetings.map((meeting) => (
                    <div key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{meeting.title}</p>
                        {meeting.agenda ? <p className="text-xs text-zinc-400">{meeting.agenda}</p> : null}
                        {meeting.scheduledAt ? (
                          <p className="text-xs text-zinc-500">예정: {new Date(meeting.scheduledAt).toLocaleString("ko-KR")}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <a href={meeting.roomUrl} target="_blank" rel="noopener noreferrer" className="btn-primary px-4 py-1.5 text-sm">입장</a>
                        <button type="button" onClick={() => navigator.clipboard.writeText(meeting.roomUrl)} className="btn-secondary px-4 py-1.5 text-sm">링크 복사</button>
                        <button type="button" onClick={() => handleDeleteMeeting(meeting.id)} className="btn-ghost px-3 py-1.5 text-sm text-rose-400">삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <form onSubmit={handleCreateMeeting} className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">새 회의 개설</p>
                <input value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} className="input" placeholder="회의 제목" required />
                <textarea value={meetingAgenda} onChange={(e) => setMeetingAgenda(e.target.value)} className="textarea" placeholder="아젠다 (선택)" rows={2} />
                <input type="datetime-local" value={meetingSchedule} onChange={(e) => setMeetingSchedule(e.target.value)} className="input" />
                <button type="submit" disabled={creatingMeeting} className="btn-primary w-full">
                  {creatingMeeting ? "생성 중..." : "회의실 생성"}
                </button>
              </form>
            </Surface>

            {/* Slack/Discord */}
            <Surface className="space-y-4">
              <div>
                <p className="eyebrow">알림 연동</p>
                <h2 className="text-lg font-semibold text-white">Slack / Discord 알림</h2>
              </div>
              <form onSubmit={handleSaveWebhooks} className="space-y-3">
                <div>
                  <label className="field-label">Slack Webhook URL</label>
                  <input value={slackUrl} onChange={(e) => setSlackUrl(e.target.value)} className="input" placeholder="https://hooks.slack.com/services/..." type="url" />
                </div>
                <div>
                  <label className="field-label">Discord Webhook URL</label>
                  <input value={discordUrl} onChange={(e) => setDiscordUrl(e.target.value)} className="input" placeholder="https://discord.com/api/webhooks/..." type="url" />
                </div>
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={savingWebhooks} className="btn-primary px-5 py-2.5">{savingWebhooks ? "저장 중..." : "저장"}</button>
                  {(webhooks.slackWebhookUrl || webhooks.discordWebhookUrl) ? <span className="text-xs text-zinc-200">연동 설정됨 ✓</span> : null}
                </div>
              </form>
            </Surface>
          </div>
        )}

        {/* ── 탭: 심층 리포트 ─────────────────────────────── */}
        {tab === "deep" && (
          <DeepReportTab ideaId={idea.id} onLaunch={() => setTab("launch")} />
        )}

        {/* ── 탭: 실행 (도구 3종 + 워크스페이스 배포) ───── */}
        {tab === "launch" && (
          <div className="mx-auto max-w-3xl py-4">
            <ArtifactsPanel ideaId={idea.id} />
          </div>
        )}

        {/* ── 탭: 외주 · 컨설팅 ────────────────────────── */}
        {/* ── 탭: 가설 검증 ─────────────────────────────── */}
        {tab === "validation" && (
          <div className="space-y-4" ref={(el) => { if (el) loadValidationTab(); }}>
            <Surface className="space-y-2">
              <p className="eyebrow">가설 검증 트래커</p>
              <h2 className="text-lg font-semibold text-white">가설 검증 트래커</h2>
              <p className="text-sm text-zinc-400">블루프린트별 핵심 가설을 스프린트 단위로 검증하고 GO / PIVOT / HOLD를 기록합니다.</p>
            </Surface>

            {vlError ? (
              <Surface className="border-rose-500/30 bg-rose-500/15 text-sm text-rose-300">{vlError}</Surface>
            ) : null}

            {vlBlueprints.length === 0 && !vlLoading ? (
              <Surface>
                <EmptyState
                  title="연결된 블루프린트가 없습니다"
                  description="먼저 이 아이디어로 Blueprint를 생성하면 가설 검증을 시작할 수 있습니다."
                />
                <div className="mt-4 text-center">
                  <Link href={`/projects/${idea.projectPolicy.id}`} className="btn-primary px-5 py-2.5 text-sm">
                    Blueprint 만들러 가기
                  </Link>
                </div>
              </Surface>
            ) : (
              <>
                {/* 블루프린트 선택 */}
                {vlBlueprints.length > 1 && (
                  <Surface className="space-y-2">
                    <p className="text-sm font-medium text-zinc-200">블루프린트 선택</p>
                    <div className="flex flex-wrap gap-2">
                      {vlBlueprints.map((bp) => (
                        <button
                          key={bp.id}
                          type="button"
                          onClick={() => {
                            setVlBlueprintId(bp.id);
                            loadValidations(bp.id);
                          }}
                          className={vlBlueprintId === bp.id ? "btn-secondary text-sm px-3 py-1.5" : "btn-ghost text-sm px-3 py-1.5"}
                        >
                          {bp.globalCase.companyName} ({bp.globalCase.industry ?? "—"})
                        </button>
                      ))}
                    </div>
                  </Surface>
                )}

                {/* 가설 추가 폼 */}
                <Surface className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-100">새 가설 추가</p>
                  <form onSubmit={handleVlAdd} className="grid gap-3">
                    <div>
                      <label className="field-label">가설 (Hypothesis)</label>
                      <textarea
                        className="textarea"
                        rows={2}
                        placeholder="예: 타겟 고객은 월 3만원 이상 결제 의향이 있다"
                        value={vlHypothesis}
                        onChange={(e) => setVlHypothesis(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="field-label">검증 액션 (선택)</label>
                      <input
                        className="input"
                        placeholder="예: 인터뷰 30명, 랜딩페이지 전환율 측정"
                        value={vlActionItem}
                        onChange={(e) => setVlActionItem(e.target.value)}
                      />
                    </div>
                    <button type="submit" disabled={vlAdding || !vlHypothesis.trim()} className="btn-primary w-full">
                      {vlAdding ? "추가 중..." : "+ 가설 추가"}
                    </button>
                  </form>
                </Surface>

                {/* 가설 목록 */}
                {vlLoading ? (
                  <Surface><EmptyState title="불러오는 중..." description="" /></Surface>
                ) : validations.length === 0 ? (
                  <Surface><EmptyState title="등록된 가설이 없습니다" description="위 폼으로 첫 가설을 추가해보세요." /></Surface>
                ) : (
                  <Surface className="space-y-3">
                    <p className="text-sm font-semibold text-zinc-100">검증 목록 ({validations.length}건)</p>
                    <div className="divide-y divide-gray-100">
                      {validations.map((v) => {
                        const meta = DECISION_META[v.decisionStatus] ?? DECISION_META.PENDING;
                        const isEditing = vlEditId === v.id;
                        return (
                          <div key={v.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-zinc-500">Sprint {v.sprintRound}</span>
                                  <span className={`rounded border px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                                </div>
                                <p className="text-sm font-medium text-white">{v.hypothesis}</p>
                                {v.actionItem && (
                                  <p className="text-xs text-zinc-400">액션: {v.actionItem}</p>
                                )}
                                {v.resultData && typeof (v.resultData as Record<string, unknown>).note === "string" && (
                                  <p className="text-xs text-zinc-300 bg-white/[0.05] rounded p-2 mt-1">
                                    결과: {String((v.resultData as Record<string, unknown>).note)}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleVlDelete(v.id)}
                                className="shrink-0 text-xs text-zinc-600 hover:text-rose-400"
                              >
                                삭제
                              </button>
                            </div>

                            {/* 상태 변경 버튼 */}
                            <div className="flex flex-wrap gap-1.5">
                              {(["GO", "PIVOT", "HOLD", "PENDING"] as const).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleVlStatus(v.id, s)}
                                  disabled={v.decisionStatus === s}
                                  className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity
                                    ${v.decisionStatus === s ? "opacity-40 cursor-default " + DECISION_META[s].cls : "btn-ghost"}`}
                                >
                                  {DECISION_META[s].label}
                                </button>
                              ))}
                            </div>

                            {/* 결과 메모 */}
                            {isEditing ? (
                              <div className="flex gap-2">
                                <input
                                  className="input flex-1 text-sm"
                                  placeholder="검증 결과 메모"
                                  value={vlEditResult}
                                  onChange={(e) => setVlEditResult(e.target.value)}
                                  autoFocus
                                />
                                <button type="button" onClick={() => handleVlSaveResult(v.id)} className="btn-primary text-sm px-3">저장</button>
                                <button type="button" onClick={() => { setVlEditId(null); setVlEditResult(""); }} className="btn-ghost text-sm px-3">취소</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setVlEditId(v.id);
                                  setVlEditResult(String((v.resultData as Record<string, unknown> | null)?.note ?? ""));
                                }}
                                className="text-xs text-zinc-300 hover:underline"
                              >
                                {v.resultData ? "결과 수정" : "+ 결과 메모 추가"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Surface>
                )}
              </>
            )}
          </div>
        )}

        {tab === "outsource" && (
          <div className="space-y-4">
            <Surface className="space-y-2">
              <p className="eyebrow">실행 지원</p>
              <h2 className="text-lg font-semibold text-white">서류 · 외주 시세 · 정부지원 · 컨설팅</h2>
              <p className="text-sm text-zinc-400">
                MVP 출시까지 필요한 비용 견적, 매칭 가능한 정부지원사업, 외주·AC 매칭 채널을 한 화면에서 확인합니다.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  📄 창업 설계서 PDF 다운로드
                </button>
                <Link
                  href={`/community/new?category=OUTSOURCE_REQUEST&ref=${idea.id}&title=${encodeURIComponent(`[외주구인] ${idea.titleKo}`)}`}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  외주 구인 글 작성
                </Link>
                <Link
                  href={`/community/new?category=AC_REQUEST&ref=${idea.id}&title=${encodeURIComponent(`[AC컨설팅] ${idea.titleKo}`)}`}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  AC 컨설팅 요청
                </Link>
              </div>
            </Surface>

            {/* AI 추정 예산 (idea.estimatedCost) */}
            {idea.estimatedCost && isRec(idea.estimatedCost) ? (
              <Surface className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">AI 추정 예산</p>
                  <Badge tone="accent">근거: 글로벌 벤치마크 + 한국 외주 시세</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {str(idea.estimatedCost, "buildKo") ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">초기 구축 비용</p>
                      <p className="mt-1.5 text-sm text-zinc-200 leading-6">{str(idea.estimatedCost, "buildKo")}</p>
                    </div>
                  ) : null}
                  {str(idea.estimatedCost, "opsKo") ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">월 운영 비용</p>
                      <p className="mt-1.5 text-sm text-zinc-200 leading-6">{str(idea.estimatedCost, "opsKo")}</p>
                    </div>
                  ) : null}
                </div>
                {str(idea.estimatedCost, "notesKo") ? (
                  <p className="text-xs leading-relaxed text-zinc-500">
                    ⓘ {str(idea.estimatedCost, "notesKo")}
                  </p>
                ) : null}
              </Surface>
            ) : null}

            {/* 한국 외주 평균 시세 (출처 명시) */}
            <Surface className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">한국 외주 평균 시세</p>
                  <p className="mt-0.5 text-xs text-zinc-500">크몽 · 위시켓 · 법무사 공개 데이터 기반 (2024년 평균)</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-2.5 font-medium">항목</th>
                      <th className="px-4 py-2.5 font-medium">시세 범위</th>
                      <th className="px-4 py-2.5 font-medium">출처</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {OUTSOURCE_RATES.map((row) => (
                      <tr key={row.item} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3 text-zinc-200">{row.item}</td>
                        <td className="px-4 py-3 font-semibold text-zinc-200">{row.range}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{row.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://kmong.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-zinc-300 hover:text-zinc-200"
                >
                  크몽에서 견적 받기 →
                </a>
                <a
                  href="https://www.wishket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-zinc-300 hover:text-zinc-200"
                >
                  위시켓에서 견적 받기 →
                </a>
              </div>
            </Surface>

            {/* 🆕 정부지원사업 자동 매칭 + AI 신청서 작성 */}
            <GovProgramMatcher ideaId={idea.id} />

            {/* 외주 구인 + AC 컨설팅 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Surface className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08]">
                    <svg className="h-5 w-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">외주 구인</h3>
                    <p className="text-sm text-zinc-400">커뮤니티에 글을 올려 프리랜서·외주 업체를 찾습니다.</p>
                  </div>
                </div>
                <Link
                  href={`/community/new?category=OUTSOURCE_REQUEST&ref=${idea.id}&title=${encodeURIComponent(`[외주구인] ${idea.titleKo}`)}`}
                  className="btn-primary w-full text-center"
                >
                  외주 구인 글 작성
                </Link>
                <Link href="/community?category=OUTSOURCE_REQUEST" className="btn-ghost w-full text-center text-sm">
                  외주 구인 게시판 보기
                </Link>
              </Surface>

              <Surface className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08]">
                    <svg className="h-5 w-5 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">AC 컨설팅 요청</h3>
                    <p className="text-sm text-zinc-400">액셀러레이터·멘토에게 피드백과 투자 연결을 요청합니다.</p>
                  </div>
                </div>
                <Link
                  href={`/community/new?category=AC_REQUEST&ref=${idea.id}&title=${encodeURIComponent(`[AC컨설팅] ${idea.titleKo}`)}`}
                  className="btn-primary w-full text-center"
                >
                  컨설팅 요청 글 작성
                </Link>
                <Link href="/community?category=AC_REQUEST" className="btn-ghost w-full text-center text-sm">
                  AC 컨설팅 게시판 보기
                </Link>
              </Surface>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
