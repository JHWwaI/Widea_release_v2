"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import type { WorkspaceStage } from "@/app/workspace/[ideaId]/page";

type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";

type Member = {
  id: string;
  role: WorkspaceRole;
  user: { id: string; name: string | null; email: string; userCode?: string | null };
};

type CollabRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

type SentCollabRequest = {
  id: string;
  status: CollabRequestStatus;
  message: string | null;
  grantRole: "EDITOR" | "VIEWER";
  createdAt: string;
  expert: { id: string; name: string | null; email: string };
};

const REQ_STATUS_LABEL: Record<CollabRequestStatus, string> = {
  PENDING: "대기",
  ACCEPTED: "수락",
  REJECTED: "거절",
  CANCELLED: "취소",
};

const REQ_STATUS_COLOR: Record<CollabRequestStatus, string> = {
  PENDING: "bg-white/[0.08] text-zinc-200 ring-white/15",
  ACCEPTED: "bg-white/[0.08] text-zinc-200 ring-white/15",
  REJECTED: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
  CANCELLED: "bg-zinc-700 text-zinc-400 ring-white/10",
};

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "소유자",
  EDITOR: "편집자",
  VIEWER: "뷰어",
};

const ROLE_COLOR: Record<WorkspaceRole, string> = {
  OWNER: "text-zinc-200 bg-white/[0.06] ring-white/15",
  EDITOR: "text-zinc-400 bg-white/[0.06] ring-white/15",
  VIEWER: "text-zinc-400 bg-white/[0.04] ring-white/10",
};

export default function WorkspaceMembers({
  ideaId,
  isOwner,
  stages,
}: {
  ideaId: string;
  isOwner: boolean;
  stages?: WorkspaceStage[];
}) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [dmBusy, setDmBusy] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sentRequests, setSentRequests] = useState<SentCollabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ members: Member[] }>(
        "GET",
        `/api/workspace/${ideaId}/members`,
        undefined,
        token,
      );
      setMembers(res.members);
      // OWNER인 경우 보낸 협업 요청도 함께 로드 (백엔드에서 권한 체크)
      if (isOwner) {
        try {
          const reqRes = await api<{ requests: SentCollabRequest[] }>(
            "GET",
            `/api/workspace/${ideaId}/collab-requests`,
            undefined,
            token,
          );
          setSentRequests(reqRes.requests);
        } catch {
          // OWNER 아닌 경우 등 — 무시
        }
      }
    } catch (caught) {
      setError(readError(caught, "멤버 불러오기 실패"));
    } finally {
      setLoading(false);
    }
  }, [token, ideaId, isOwner]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCancelRequest(requestId: string) {
    if (!token) return;
    if (!window.confirm("이 협업 요청을 취소할까요?")) return;
    try {
      await api("DELETE", `/api/collab-requests/${requestId}`, undefined, token);
      refresh();
    } catch (caught) {
      setError(readError(caught, "요청 취소 실패"));
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!token || !code) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const userRes = await api<{ user: { id: string; name: string | null; email: string } }>(
        "GET",
        `/api/auth/lookup?userCode=${encodeURIComponent(code)}`,
        undefined,
        token,
      );
      await api(
        "POST",
        `/api/workspace/${ideaId}/members`,
        { targetUserId: userRes.user.id, role: inviteRole },
        token,
      );
      setInviteCode("");
      setInviteSuccess(`${userRes.user.name || userRes.user.email}님을 추가했습니다.`);
      refresh();
    } catch (caught) {
      const msg = readError(caught, "초대 실패 — 코드를 다시 확인해주세요.");
      // 한도 초과 시 더 친절한 안내 + /billing 링크 (인라인)
      if (msg.includes("한도")) {
        setInviteError(`${msg} → 사이드바 [구독·결제]에서 플랜을 업그레이드하세요.`);
      } else {
        setInviteError(msg);
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: WorkspaceRole) {
    if (!token) return;
    try {
      await api("PATCH", `/api/workspace/${ideaId}/members/${memberId}`, { role }, token);
      refresh();
    } catch (caught) {
      setError(readError(caught, "역할 변경 실패"));
    }
  }

  async function handleRemove(memberId: string) {
    if (!token) return;
    if (!window.confirm("이 멤버를 제거하시겠습니까?")) return;
    try {
      await api("DELETE", `/api/workspace/${ideaId}/members/${memberId}`, undefined, token);
      refresh();
    } catch (caught) {
      setError(readError(caught, "멤버 제거 실패"));
    }
  }

  /** 해당 멤버에게 1:1 DM 자동 시작 — 채팅 탭의 친구 모드 + 그 대화 자동 선택 */
  async function handleStartDm(target: { id: string; email: string; name: string | null }) {
    if (!token || target.id === user?.id) return;
    setDmBusy(target.id);
    setError("");
    try {
      const res = await api<{ conversation: { id: string } }>(
        "POST",
        "/api/dm/start",
        { identifier: target.email },
        token,
      );
      // /messages 의 DM 모드 + 그 대화 자동 선택
      router.push(`/messages?dm=${encodeURIComponent(res.conversation.id)}`);
    } catch (caught) {
      setError(readError(caught, "DM 시작 실패"));
    } finally {
      setDmBusy(null);
    }
  }

  /** 멤버별 task 진척률 계산 — assigneeId 매칭 */
  function memberProgress(memberId: string): { total: number; done: number; pending: number; overdue: number } {
    if (!stages) return { total: 0, done: 0, pending: 0, overdue: 0 };
    const allTasks = stages.flatMap((s) => s.tasks);
    const mine = allTasks.filter((t) => t.assigneeId === memberId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const done = mine.filter(
      (t) => t.status === "DONE" || t.status === "OUTSOURCED" || t.status === "SKIPPED",
    ).length;
    const pending = mine.filter((t) => t.status === "PENDING").length;
    const overdue = mine.filter(
      (t) => t.dueDate && new Date(t.dueDate) < today && t.status === "PENDING",
    ).length;
    return { total: mine.length, done, pending, overdue };
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <header>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          공동 작업
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">워크스페이스 멤버</h2>
        <p className="text-xs text-zinc-500">
          EDITOR는 태스크 수정 가능, VIEWER는 읽기 전용입니다.
        </p>
      </header>

      {/* 내 초대 코드 안내 — 다른 사람이 나를 추가할 때, 또는 내가 누구를 추가할 때 모두 필요 */}
      {user?.userCode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.10]/[0.06] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
              내 초대 코드 (태그)
            </p>
            <p className="mt-0.5 text-xs text-zinc-300">
              다른 사람이 나를 워크스페이스에 추가할 때 필요한 코드예요. 클릭하면 복사됩니다.
            </p>
          </div>
          <UserCodeChip code={user.userCode} canCopy size="lg" />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {/* 소유자 카드 */}
      {user ? (
        <MemberCard
          name={user.name ?? user.email}
          email={user.email}
          userCode={user.userCode ?? null}
          role="OWNER"
          progress={memberProgress(user.id)}
          isMe
        />
      ) : null}

      {/* 멤버 목록 */}
      {loading ? (
        <p className="text-xs text-zinc-500">불러오는 중...</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => {
            const isMe = m.user.id === user?.id;
            return (
              <li key={m.id}>
                <MemberCard
                  name={m.user.name ?? m.user.email}
                  email={m.user.email}
                  userCode={m.user.userCode ?? null}
                  role={m.role}
                  progress={memberProgress(m.user.id)}
                  isMe={isMe}
                  /* OWNER 작업 */
                  ownerActions={
                    isOwner && !isMe ? (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as WorkspaceRole)}
                          className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                        >
                          <option value="EDITOR">편집자</option>
                          <option value="VIEWER">뷰어</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemove(m.id)}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          제거
                        </button>
                      </>
                    ) : null
                  }
                  /* 본인 탈퇴 */
                  selfActions={
                    isMe && m.user.id === user?.id && !isOwner ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        탈퇴
                      </button>
                    ) : null
                  }
                  /* 1:1 DM 시작 (본인 X) */
                  onStartDm={
                    isMe
                      ? undefined
                      : () => handleStartDm({ id: m.user.id, email: m.user.email, name: m.user.name })
                  }
                  dmBusy={dmBusy === m.user.id}
                />
              </li>
            );
          })}
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
              아직 공동 작업자가 없습니다.
            </p>
          ) : null}
        </ul>
      )}

      {/* 보낸 협업 요청 (OWNER만) */}
      {isOwner && sentRequests.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-300">전문가에게 보낸 요청</p>
            <p className="text-[0.65rem] text-zinc-500">
              수락 시 자동으로 멤버 추가됩니다
            </p>
          </div>
          <ul className="space-y-1.5">
            {sentRequests.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">
                    {r.expert.name || r.expert.email}
                  </p>
                  <p className="truncate text-[0.6rem] text-zinc-500">
                    {r.message ? `"${r.message}" · ` : ""}
                    {new Date(r.createdAt).toLocaleDateString("ko-KR")} ·{" "}
                    {r.grantRole === "EDITOR" ? "편집자" : "뷰어"}로 초대
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[0.6rem] font-bold ring-1 ${REQ_STATUS_COLOR[r.status]}`}
                >
                  {REQ_STATUS_LABEL[r.status]}
                </span>
                {r.status === "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => handleCancelRequest(r.id)}
                    className="text-[0.65rem] text-zinc-500 hover:text-rose-300"
                  >
                    취소
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 초대 폼 (OWNER만) */}
      {isOwner ? (
        <form onSubmit={handleInvite} className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-300">멤버 추가</p>
            <p className="text-[0.65rem] text-zinc-500">
              상대방 마이페이지의 <span className="font-mono text-zinc-400">초대 코드</span>를 입력하세요
            </p>
          </div>
          {inviteError ? (
            <p className="text-xs text-rose-300">{inviteError}</p>
          ) : null}
          {inviteSuccess ? (
            <p className="text-xs text-zinc-200">{inviteSuccess}</p>
          ) : null}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="초대 코드 (예: A1B2C3)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              className="w-36 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm uppercase tracking-widest text-white placeholder-zinc-600 outline-none focus:border-white/30"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "EDITOR" | "VIEWER")}
              className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="EDITOR">편집자</option>
              <option value="VIEWER">뷰어</option>
            </select>
            <button
              type="submit"
              disabled={inviting || inviteCode.length < 6}
              className="rounded-lg bg-white/[0.10] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.15] disabled:opacity-50"
            >
              {inviting ? "..." : "추가"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

/* ─────────────────────────────────────────────
   멤버 카드 — 진척률 + DM 시작 + 권한 액션
   ───────────────────────────────────────────── */

function MemberCard({
  name,
  email,
  userCode,
  role,
  progress,
  isMe,
  ownerActions,
  selfActions,
  onStartDm,
  dmBusy,
}: {
  name: string;
  email: string;
  userCode: string | null;
  role: WorkspaceRole;
  progress: { total: number; done: number; pending: number; overdue: number };
  isMe?: boolean;
  ownerActions?: React.ReactNode;
  selfActions?: React.ReactNode;
  onStartDm?: () => void;
  dmBusy?: boolean;
}) {
  const initial = (name || email).trim()[0]?.toUpperCase() ?? "?";
  const pct = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex items-start gap-3">
        {/* 아바타 */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-sm font-bold text-white">
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          {/* 이름 + 역할 + 나 */}
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="truncate text-sm font-bold text-white">{name}</p>
            {isMe ? (
              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[0.6rem] font-bold text-zinc-300">
                나
              </span>
            ) : null}
            <span className={`rounded-md px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${ROLE_COLOR[role]}`}>
              {ROLE_LABEL[role]}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.65rem] text-zinc-500">
            {userCode ? (
              <UserCodeChip code={userCode} canCopy={!!isMe} />
            ) : null}
            <span className="truncate">{email}</span>
          </p>

          {/* 진척률 — task가 있을 때만 */}
          {progress.total > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500/70 to-emerald-400/70 transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="shrink-0 text-[0.65rem] tabular-nums text-zinc-400">
                  {progress.done}/{progress.total}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[0.6rem]">
                {progress.pending > 0 ? (
                  <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-zinc-400">
                    진행 {progress.pending}
                  </span>
                ) : null}
                {progress.overdue > 0 ? (
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-300">
                    기한 초과 {progress.overdue}
                  </span>
                ) : null}
                {progress.pending === 0 && progress.overdue === 0 && progress.done > 0 ? (
                  <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-semibold text-zinc-200">
                    모두 완료 ✓
                  </span>
                ) : null}
              </div>
            </div>
          ) : !isMe ? (
            <p className="mt-1.5 text-[0.65rem] text-zinc-600">아직 할당된 작업 없음</p>
          ) : null}
        </div>
      </div>

      {/* 액션 줄 */}
      {(onStartDm || ownerActions || selfActions) ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-white/5 pt-2.5">
          {onStartDm ? (
            <button
              type="button"
              onClick={onStartDm}
              disabled={dmBusy}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[0.65rem] font-semibold text-zinc-100 hover:bg-white/[0.10] disabled:opacity-50"
              title="1:1 DM 시작 (워크스페이스 채팅 탭으로 이동)"
            >
              {dmBusy ? "..." : "메시지"}
            </button>
          ) : null}
          {ownerActions}
          {selfActions}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────
   userCode chip — 클릭 시 복사 (본인 카드/안내 박스 공용)
   ───────────────────────────────────────────── */

function UserCodeChip({
  code,
  canCopy,
  size,
}: {
  code: string;
  canCopy: boolean;
  size?: "lg";
}) {
  const [copied, setCopied] = useState(false);
  const isLg = size === "lg";

  function handleCopy() {
    if (!canCopy || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (canCopy) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title="클릭해서 복사"
        className={`group inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/[0.08] ${
          isLg ? "px-3 py-1.5 text-sm" : "px-1.5 py-0.5 text-[0.7rem]"
        } font-mono font-bold tracking-widest text-zinc-100 hover:bg-white/[0.12]`}
      >
        <span>{code}</span>
        <span className={isLg ? "text-xs" : "text-[0.6rem]"}>
          {copied ? "✓ 복사됨" : "복사"}
        </span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[0.65rem] font-mono tracking-widest text-zinc-400/70">
      {code}
    </span>
  );
}
