"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import StageDetail from "@/components/workspace/StageDetail";
import FocusMode from "@/components/workspace/FocusMode";
import WorkspaceMeetings from "@/components/workspace/WorkspaceMeetings";
import WorkspaceMembers from "@/components/workspace/WorkspaceMembers";

type TaskStatus = "PENDING" | "DONE" | "SKIPPED" | "OUTSOURCED";
type StageStatus = "PENDING" | "ACTIVE" | "DONE";

export type WorkspaceTask = {
  id: string;
  stageId: string;
  content: string;
  status: TaskStatus;
  outsourceRole: string | null;
  communityPostId: string | null;
  isCustom: boolean;
  orderIndex: number;
  assigneeId: string | null;
  assignee: { id: string; name: string | null; email: string; userCode: string | null } | null;
  dueDate: string | null;
  notes: string | null;
};

export type WorkspaceStage = {
  id: string;
  ideaId: string;
  stageNumber: number;
  name: string;
  status: StageStatus;
  tasks: WorkspaceTask[];
};

type WorkspaceResponse = {
  idea: { id: string; titleKo: string; oneLinerKo: string | null; status: string };
  isOwner: boolean;
  stages: WorkspaceStage[];
};

export default function WorkspacePage() {
  const { ideaId: rawId } = useParams<{ ideaId: string }>();
  const ideaId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { token } = useAuth();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openStageId, setOpenStageId] = useState<string | null>(null);
  const [view, setView] = useState<"focus" | "grid">("grid");
  const searchParams = useSearchParams();
  const initialTab = (() => {
    const t = searchParams?.get("tab");
    if (t === "meetings" || t === "members" || t === "stages") return t;
    return "stages" as const;
  })();
  const [tab, setTab] = useState<"stages" | "meetings" | "members">(initialTab);

  // URL ?tab= 쿼리가 변하면 동기화
  useEffect(() => {
    const t = searchParams?.get("tab");
    if (t === "meetings" || t === "members" || t === "stages") setTab(t);
  }, [searchParams]);
  const [isOwner, setIsOwner] = useState(false);

  async function refresh() {
    if (!token || !ideaId) return;
    try {
      const res = await api<WorkspaceResponse>(
        "GET",
        `/api/workspace/${ideaId}`,
        undefined,
        token,
      );
      setData(res);
      setIsOwner(res.isOwner);
    } catch (caught) {
      setError(readError(caught, "워크스페이스를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, token]);

  async function handleRename() {
    if (!token || !ideaId || !newTitle.trim()) return;
    setBusy(true); setActionError("");
    try {
      const updated = await api<{ titleKo: string }>(
        "PATCH", `/api/ideas/${ideaId}`, { titleKo: newTitle.trim() }, token,
      );
      setData((prev) => prev ? { ...prev, idea: { ...prev.idea, titleKo: updated.titleKo } } : prev);
      setRenaming(false); setMenuOpen(false);
    } catch (caught) {
      setActionError(readError(caught, "이름 변경 실패"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!token || !ideaId) return;
    if (!window.confirm("이 워크스페이스를 삭제할까요? 아이디어는 보관 처리되고 사이드바에서 사라집니다.")) return;
    setBusy(true); setActionError("");
    try {
      await api("PATCH", `/api/idea-match/ideas/${ideaId}/status`, { status: "ARCHIVED" }, token);
      router.push("/idea-match");
    } catch (caught) {
      setActionError(readError(caught, "삭제 실패"));
      setBusy(false);
    }
  }

  async function ensureWorkspace() {
    if (!token || !ideaId) return;
    setLoading(true);
    setError("");
    try {
      await api("POST", `/api/workspace/${ideaId}/ensure`, {}, token);
      await refresh();
    } catch (caught) {
      setError(readError(caught, "워크스페이스 생성에 실패했습니다."));
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingState label="워크스페이스 불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  if (error || !data) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <p className="text-sm text-rose-300">{error || "워크스페이스를 찾을 수 없습니다."}</p>
          <Link href="/mypage" className="btn-primary">내 아이디어로</Link>
        </div>
      </AuthGuard>
    );
  }

  const { idea, stages } = data;
  const openStage = stages.find((s) => s.id === openStageId) ?? null;

  // 단계 셸이 없으면 (대표 선정 안 했을 가능성) 생성 버튼
  if (stages.length === 0) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-2xl space-y-6 py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            워크스페이스
          </p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {idea.titleKo}
          </h1>
          <p className="text-sm leading-7 text-zinc-400">
            아직 워크스페이스가 만들어지지 않았습니다.<br/>
            대표 아이디어로 선정하거나, 지금 바로 6단계 작업 보드를 생성하세요.
          </p>
          <button type="button" onClick={ensureWorkspace} className="btn-primary px-6 py-3">
            워크스페이스 만들기
          </button>
        </div>
      </AuthGuard>
    );
  }

  // 진척 통계 — 필수 task만 카운트 (orderIndex < 100)
  const isCore = (t: WorkspaceTask) => t.orderIndex < 100;
  const coreTasksAll = stages.flatMap((s) => s.tasks.filter(isCore));
  const total = coreTasksAll.length;
  const done = coreTasksAll.filter(
    (t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED",
  ).length;
  const overallPct = total === 0 ? 0 : Math.round((done / total) * 100);

  // 다음 할 일 task (Hero CTA용) — 필수만, 그 다음 선택
  const sortedStages = [...stages].sort((a, b) => a.stageNumber - b.stageNumber);
  let nextTask: typeof stages[number]["tasks"][number] | null = null;
  let nextStage: typeof stages[number] | null = null;
  for (const stage of sortedStages) {
    const pending = [...stage.tasks]
      .filter(isCore)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .find((t) => t.status === "PENDING");
    if (pending) {
      nextTask = pending;
      nextStage = stage;
      break;
    }
  }
  const allDone = !nextTask;

  // Focus mode: 1 task에 집중 (default)
  if (view === "focus") {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-5xl px-4 pb-12">
          <Link href={`/ideas/${idea.id}`} className="inline-flex items-center gap-1 py-4 text-xs text-zinc-500 hover:text-zinc-300">
            ← 아이디어 상세
          </Link>
          <FocusMode
            ideaTitle={idea.titleKo}
            ideaId={idea.id}
            stages={stages}
            onChanged={refresh}
            onSwitchToGrid={() => setView("grid")}
          />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="widea-fade-up space-y-10 py-4 pb-12">
        {/* 헤더 */}
        <header className="space-y-3">
          <Link href={`/ideas/${idea.id}`} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            ← 아이디어 상세
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="widea-eyebrow">워크스페이스</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{idea.titleKo}</h1>
              {idea.oneLinerKo ? (
                <p className="text-sm text-zinc-400">{idea.oneLinerKo}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="display-num text-4xl text-zinc-200 sm:text-5xl">{overallPct}%</p>
                <p className="mt-1 text-xs text-zinc-500">전체 진척 ({done}/{total})</p>
              </div>
              {/* 케밥 메뉴 — 이름 변경 / 삭제 */}
              <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="워크스페이스 옵션"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>
                  {menuOpen ? (
                    <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-lg">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setNewTitle(idea.titleKo); setRenaming(true); setMenuOpen(false); }}
                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-white/[0.06]"
                      >
                        이름 변경
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleDelete}
                        className="block w-full border-t border-white/[0.06] px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10"
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
            </div>
          </div>
          {actionError ? (
            <p className="text-xs text-rose-300">{actionError}</p>
          ) : null}
        </header>

        {/* 이름 변경 모달 */}
        {renaming ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !busy && setRenaming(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-white">워크스페이스 이름 변경</h3>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                placeholder="새 이름"
                className="mt-4 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  disabled={busy}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/[0.05] disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={busy || !newTitle.trim()}
                  className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
                >
                  {busy ? "저장 중…" : "저장"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* 탭 바 — 단계 ↔ 회의록 토글 */}
        <div
          className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1"
          role="tablist"
          aria-label="워크스페이스 뷰"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "stages"}
            onClick={() => setTab("stages")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "stages"
                ? "bg-white text-zinc-900 text-zinc-100 ring-1 ring-white/15"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            단계 진행 (01~06)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "meetings"}
            onClick={() => setTab("meetings")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "meetings"
                ? "bg-white text-zinc-900 text-zinc-100 ring-1 ring-white/15"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            회의록
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "members"}
            onClick={() => setTab("members")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "members"
                ? "bg-white text-zinc-900 text-zinc-100 ring-1 ring-white/15"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
            }`}
          >
            공동 작업
          </button>
        </div>

        {/* 다음 할 일 Hero — 가장 큰 CTA (단계 탭에서만) */}
        {tab === "stages" ? (
          <>

        {allDone ? (
          <section className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 text-center">
            <p className="text-3xl">🎉</p>
            <h2 className="mt-2 text-xl font-bold text-zinc-200">모든 단계 완료!</h2>
            <p className="mt-1 text-sm text-zinc-400">{total}개 작업을 모두 처리했어요.</p>
            <Link
              href={`/show/${idea.id}`}
              className="widea-btn-primary mt-4 inline-flex"
            >
              🌐 사업 페이지 공유하기
            </Link>
          </section>
        ) : nextTask && nextStage ? (
          <section className="space-y-4 rounded-2xl border border-white/15 bg-white/[0.04] p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold text-zinc-400">
                지금 할 일 · 0{nextStage.stageNumber} {nextStage.name}
              </p>
              <p className="text-xs text-zinc-500">{done}/{total} 진행</p>
            </div>
            <h2 className="text-balance text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              {nextTask.content}
            </h2>
            <button
              type="button"
              onClick={() => setView("focus")}
              className="inline-flex rounded-xl bg-white/[0.10] px-5 py-2.5 text-sm font-bold text-white  transition-all hover:bg-white/[0.15]"
            >
              이 작업 시작하기 →
            </button>
          </section>
        ) : null}

        {/* 3-허브: 외주·AC 컨설팅·팀 모집 — 도움받기 진입 */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-white">도움이 필요하면</h2>
            <span className="text-xs text-zinc-500">커뮤니티에 게시 → 응답 받기</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={`/community/new?category=OUTSOURCE_REQUEST&ideaId=${idea.id}&ideaTitle=${encodeURIComponent(idea.titleKo)}&title=${encodeURIComponent(`[${idea.titleKo}] 외주 의뢰`)}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.10]/[0.05]"
            >
              <p className="text-2xl">🛠</p>
              <h3 className="mt-2 text-sm font-bold text-white group-hover:text-zinc-200">외주 의뢰</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                디자이너·개발자·마케터에게 작업 요청
              </p>
              <p className="mt-3 text-xs font-semibold text-zinc-200">글 작성하기 →</p>
            </Link>

            <Link
              href={`/community/new?category=AC_REQUEST&ideaId=${idea.id}&ideaTitle=${encodeURIComponent(idea.titleKo)}&title=${encodeURIComponent(`[${idea.titleKo}] 전문 컨설팅 요청`)}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.10]/[0.05]"
            >
              <p className="text-2xl">🎓</p>
              <h3 className="mt-2 text-sm font-bold text-white group-hover:text-zinc-200">전문 컨설팅</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                엑셀러레이터·멘토 매칭으로 검증
              </p>
              <p className="mt-3 text-xs font-semibold text-zinc-400">글 작성하기 →</p>
            </Link>

            <Link
              href={`/community/new?category=TEAM_RECRUIT&ideaId=${idea.id}&ideaTitle=${encodeURIComponent(idea.titleKo)}&title=${encodeURIComponent(`[${idea.titleKo}] 팀원 모집`)}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/20 hover:bg-white/[0.10]/[0.05]"
            >
              <p className="text-2xl">🤝</p>
              <h3 className="mt-2 text-sm font-bold text-white group-hover:text-zinc-200">팀원 모집</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                공동창업자·개발자·기획자 영입
              </p>
              <p className="mt-3 text-xs font-semibold text-zinc-200">글 작성하기 →</p>
            </Link>
          </div>
        </section>

        {/* 6단계 카드 그리드 */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((s) => {
            const stageTotal = s.tasks.length;
            const stageDone = s.tasks.filter(
              (t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED",
            ).length;
            const stagePct = stageTotal === 0 ? 0 : Math.round((stageDone / stageTotal) * 100);
            const statusBadge =
              s.status === "DONE"
                ? { label: "완료", color: "text-zinc-200", bg: "bg-white/[0.06]", ring: "ring-white/15" }
                : s.status === "ACTIVE"
                  ? { label: "진행 중", color: "text-zinc-400", bg: "bg-white/[0.10]/10", ring: "ring-white/15" }
                  : { label: "대기", color: "text-zinc-500", bg: "bg-white/[0.03]", ring: "ring-white/10" };

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenStageId(s.id)}
                className={`group relative overflow-hidden rounded-2xl border bg-white/[0.02] p-5 text-left transition-all hover:bg-white/[0.05] ${
                  s.status === "ACTIVE" ? "border-white/20" : "border-white/10"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black tabular-nums text-white/[0.15]">
                    0{s.stageNumber}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ring-1 ${statusBadge.bg} ${statusBadge.color} ${statusBadge.ring}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-white">{s.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {stageDone}/{stageTotal} 완료
                </p>

                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.status === "DONE"
                        ? "bg-white"
                        : s.status === "ACTIVE"
                          ? "bg-white"
                          : "bg-zinc-600"
                    }`}
                    style={{ width: `${stagePct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </section>

        {/* 안내 */}
        <p className="text-xs text-zinc-500">
          단계 카드를 클릭하면 체크리스트가 열립니다. 각 항목 옆 [🤝 도움받기] 버튼으로 외주·AC 컨설팅·팀 모집 글을 AI가 자동 작성해 커뮤니티에 게시합니다.
        </p>
          </>
        ) : null}

        {/* 회의록 탭 */}
        {tab === "meetings" ? <WorkspaceMeetings ideaId={idea.id} /> : null}

        {/* 공동 작업 탭 */}
        {tab === "members" ? (
          <WorkspaceMembers ideaId={idea.id} isOwner={isOwner} stages={data?.stages} />
        ) : null}

        {/* 일정·채팅은 사이드바 단독 메뉴(/schedule, /messages)로 이전됨 */}
      </div>

      {/* 단계 상세 모달 */}
      {openStage ? (
        <StageDetail
          stage={openStage}
          ideaTitle={idea.titleKo}
          onClose={() => setOpenStageId(null)}
          onChanged={refresh}
        />
      ) : null}
    </AuthGuard>
  );
}
