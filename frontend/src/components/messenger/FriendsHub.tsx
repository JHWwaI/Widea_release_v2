"use client";

/**
 * 친구 + 1:1 DM 통합 허브.
 * - 좌측: [친구][채팅] sub-tab (친구 목록 / 활성 대화 목록)
 * - 우측: 선택된 DM 채팅창 (카톡 스타일)
 * - 새 친구 추가 / 대상 변경 모달 포함.
 *
 * 워크스페이스 채팅 탭 안에 임베드되어 사용된다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import AddPeerToWorkspaceButton from "@/components/messenger/AddPeerToWorkspaceButton";
import AddTaskModal from "@/components/workspace/AddTaskModal";

type Peer = { id: string; name: string | null; email: string; userCode: string | null };
type LastMessage = { id: string; content: string; createdAt: string; senderId: string };
type DmConversation = {
  id: string;
  peer: Peer;
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
};
type DmMessage = {
  id: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
};

type SubTab = "friends" | "chats";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}
function peerLabel(p: Peer): string {
  return p.name || p.email || (p.userCode ?? "사용자");
}
function peerInitial(p: Peer): string {
  const s = peerLabel(p).trim();
  return s ? s[0].toUpperCase() : "?";
}
function groupDmKakao(messages: DmMessage[]): Array<{ senderId: string; items: DmMessage[] }> {
  const groups: Array<{ senderId: string; items: DmMessage[] }> = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    const sameSender = last && last.senderId === m.senderId;
    const sameMinute =
      last &&
      sameSender &&
      Math.abs(
        new Date(m.createdAt).getTime() -
          new Date(last.items[last.items.length - 1].createdAt).getTime(),
      ) < 60_000;
    if (sameSender && sameMinute) {
      last.items.push(m);
    } else {
      groups.push({ senderId: m.senderId, items: [m] });
    }
  }
  return groups;
}

export default function FriendsHub() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [subTab, setSubTab] = useState<SubTab>("friends");
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ conversations: DmConversation[] }>(
        "GET",
        "/api/dm/conversations",
        undefined,
        token,
      );
      setConversations(res.conversations);
    } catch (caught) {
      setError(readError(caught, "DM 목록 실패"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ?dm=ID 쿼리가 있으면 그 대화 자동 선택 + 채팅 sub-tab으로 전환
  useEffect(() => {
    const dmId = searchParams?.get("dm");
    if (dmId) {
      setSelectedId(dmId);
      setSubTab("chats");
    }
  }, [searchParams]);

  async function handleStart(identifier: string) {
    if (!token) return;
    const res = await api<{ conversation: { id: string }; peer: Peer }>(
      "POST",
      "/api/dm/start",
      { identifier },
      token,
    );
    await refresh();
    setSelectedId(res.conversation.id);
    setSubTab("chats");
    setShowStart(false);
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 sm:grid-cols-[240px_1fr]">
      {/* 좌측: sub-tab + 목록 */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center border-b border-white/10">
          <button
            type="button"
            onClick={() => setSubTab("friends")}
            className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${subTab === "friends" ? "bg-white/[0.06] text-zinc-200" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            친구 ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("chats")}
            className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${subTab === "chats" ? "bg-white/[0.06] text-zinc-200" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            채팅 ({conversations.filter((c) => c.lastMessage).length})
          </button>
          <button
            type="button"
            onClick={() => setShowStart(true)}
            className="px-2.5 py-2 text-[0.65rem] font-bold text-zinc-200 hover:bg-white/[0.04]"
            title="ID/이메일로 친구 추가"
          >
            +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-3 text-xs text-zinc-500">불러오는 중...</p>
          ) : conversations.length === 0 ? (
            <p className="p-3 text-xs text-zinc-500">
              아직 친구가 없어요. 우측 [+]로 ID/이메일을 추가하세요.
            </p>
          ) : subTab === "friends" ? (
            <FriendList
              conversations={conversations}
              onPick={(id) => {
                setSelectedId(id);
                setSubTab("chats");
              }}
            />
          ) : (
            <ChatList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>
      </aside>

      {/* 우측: 채팅창 */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        {error ? (
          <p className="border-b border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}
        {selectedId ? (
          <DmChatPanel
            key={selectedId}
            conversationId={selectedId}
            onMessageSent={refresh}
            onSwitchPeer={() => setShowSwitch(true)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-xs text-zinc-500">
              좌측에서 친구를 클릭해 채팅을 시작하세요.
            </p>
          </div>
        )}
      </section>

      {showStart ? (
        <StartDmModal onClose={() => setShowStart(false)} onStart={handleStart} />
      ) : null}

      {showSwitch ? (
        <SwitchPeerModal
          conversations={conversations}
          currentId={selectedId}
          onClose={() => setShowSwitch(false)}
          onPick={(id) => {
            setSelectedId(id);
            setShowSwitch(false);
          }}
          onAddNew={() => {
            setShowSwitch(false);
            setShowStart(true);
          }}
        />
      ) : null}
    </div>
  );
}

/* ─────────────── 친구 목록 / 채팅 목록 ─────────────── */

function FriendList({
  conversations,
  onPick,
}: {
  conversations: DmConversation[];
  onPick: (conversationId: string) => void;
}) {
  const friends = [...conversations].sort((a, b) =>
    peerLabel(a.peer).localeCompare(peerLabel(b.peer), "ko"),
  );
  return (
    <ul>
      {friends.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onPick(c.id)}
            className="flex w-full items-center gap-2.5 border-b border-white/5 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-xs font-bold text-white">
              {peerInitial(c.peer)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{peerLabel(c.peer)}</p>
              <p className="truncate text-[0.6rem] text-zinc-500">
                {c.peer.userCode ? `ID ${c.peer.userCode}` : c.peer.email}
              </p>
            </div>
            {c.unreadCount > 0 ? (
              <span className="ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white">
                {c.unreadCount}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ChatList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: DmConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { user } = useAuth();
  const list = [...conversations].sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });
  return (
    <ul>
      {list.map((c) => {
        const sel = c.id === selectedId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-2.5 border-b border-white/5 px-3 py-2 text-left transition-colors ${sel ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-xs font-bold text-white">
                {peerInitial(c.peer)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-bold text-white">{peerLabel(c.peer)}</p>
                  {c.lastMessageAt ? (
                    <span className="shrink-0 text-[0.55rem] text-zinc-500">
                      {formatTime(c.lastMessageAt)}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[0.65rem] text-zinc-400">
                  {c.lastMessage
                    ? (c.lastMessage.senderId === user?.id ? "나: " : "") + c.lastMessage.content
                    : "대화를 시작해보세요"}
                </p>
              </div>
              {c.unreadCount > 0 ? (
                <span className="ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white">
                  {c.unreadCount}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────── DM 채팅창 ─────────────── */

function DmChatPanel({
  conversationId,
  onMessageSent,
  onSwitchPeer,
}: {
  conversationId: string;
  onMessageSent: () => void;
  onSwitchPeer: () => void;
}) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api<{ peer: Peer; messages: DmMessage[] }>(
        "GET",
        `/api/dm/conversations/${conversationId}/messages`,
        undefined,
        token,
      );
      setMessages(res.messages);
      setPeer(res.peer);
      await api("POST", `/api/dm/conversations/${conversationId}/read`, undefined, token);
    } finally {
      setLoading(false);
    }
  }, [token, conversationId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversationId]);

  async function send() {
    if (!token) return;
    const content = inputRef.current?.value.trim() ?? "";
    if (!content) return;
    await api(
      "POST",
      `/api/dm/conversations/${conversationId}/messages`,
      { content },
      token,
    );
    if (inputRef.current) inputRef.current.value = "";
    await load();
    onMessageSent();
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2">
        {peer ? (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.08] text-xs font-bold text-white">
              {peerInitial(peer)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{peerLabel(peer)}</p>
              <p className="truncate text-[0.6rem] text-zinc-500">
                {peer.userCode ? `ID ${peer.userCode}` : null}
                {peer.userCode && peer.email ? " · " : null}
                {peer.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[0.6rem] font-semibold text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.10]"
              title="이 사람에게 일정 할당"
            >
              + 일정
            </button>
            <AddPeerToWorkspaceButton peerUserId={peer.id} peerName={peerLabel(peer)} />
            <button
              type="button"
              onClick={onSwitchPeer}
              className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.6rem] font-semibold text-zinc-300 hover:border-white/20 hover:bg-white/[0.10]/[0.08] hover:text-zinc-200"
              title="다른 친구로 채팅 전환"
            >
              대상 변경
            </button>
          </>
        ) : (
          <p className="text-xs text-zinc-500">불러오는 중...</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#1a1a22] px-3 py-3 space-y-3">
        {loading && messages.length === 0 ? (
          <p className="text-xs text-zinc-500">불러오는 중...</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-500">첫 메시지를 보내보세요.</p>
        ) : (
          groupDmKakao(messages).map((g, gi) => {
            const mine = g.senderId === user?.id;
            return (
              <div
                key={`${g.senderId}-${gi}`}
                className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                {!mine && peer ? (
                  <div
                    className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[0.65rem] font-bold text-white"
                    title={peerLabel(peer)}
                  >
                    {peerInitial(peer)}
                  </div>
                ) : null}
                <div className={`flex max-w-[75%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                  {g.items.map((m, mi) => {
                    const isLast = mi === g.items.length - 1;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            mine ? "bg-[#FAE100] text-zinc-900" : "bg-white text-zinc-900"
                          }`}
                        >
                          {m.content}
                        </div>
                        {isLast ? (
                          <span className="mb-0.5 flex flex-col items-end gap-0.5 text-[0.6rem] text-zinc-500">
                            {mine && !m.readAt ? (
                              <span className="font-bold text-zinc-200">1</span>
                            ) : null}
                            <span>{formatTime(m.createdAt)}</span>
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 bg-[#1a1a22] p-2">
        <div className="flex items-end gap-2 rounded-2xl bg-white/[0.06] p-1.5">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="메시지를 입력하세요"
            className="max-h-32 min-h-[32px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            type="button"
            onClick={send}
            className="rounded-xl bg-[#FAE100] px-3 py-1.5 text-xs font-bold text-zinc-900 hover:bg-[#FFE600]"
          >
            전송
          </button>
        </div>
      </div>

      {/* DM 상대에게 일정(task) 할당 — 그 사람이 워크스페이스 멤버일 때만 적용됨 */}
      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        defaultAssigneeId={peer?.id}
      />
    </>
  );
}

/* ─────────────── 모달들 ─────────────── */

function StartDmModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (id: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = identifier.trim();
    if (!v) {
      setErr("ID 또는 이메일을 입력해주세요.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await onStart(v);
    } catch (caught) {
      setErr(readError(caught, "실패"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">친구 추가 / 새 DM</h2>
        <p className="mt-1 text-xs text-zinc-500">
          상대방의 <strong>ID(6자)</strong> 또는 <strong>이메일</strong>을 입력하세요.
        </p>
        {user?.userCode ? (
          <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.7rem] text-zinc-400">
            내 ID: <strong className="text-zinc-200">{user.userCode}</strong>
          </p>
        ) : null}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            autoFocus
            className="input"
            placeholder="예: ABCD23 또는 friend@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={busy}
          />
          {err ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {err}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
              disabled={busy}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-white/[0.10] px-4 py-1.5 text-sm font-bold text-white hover:bg-white/[0.15] disabled:opacity-50"
            >
              {busy ? "찾는 중..." : "추가 / 시작"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function SwitchPeerModal({
  conversations,
  currentId,
  onClose,
  onPick,
  onAddNew,
}: {
  conversations: DmConversation[];
  currentId: string | null;
  onClose: () => void;
  onPick: (conversationId: string) => void;
  onAddNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      peerLabel(c.peer).toLowerCase().includes(q) ||
      (c.peer.userCode ?? "").toLowerCase().includes(q) ||
      c.peer.email.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />
      <div className="fixed left-1/2 top-1/2 z-50 flex w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-bold text-white">대상 변경</h2>
          <button
            type="button"
            onClick={onAddNew}
            className="rounded-md border border-white/20 bg-white/[0.08] px-2 py-1 text-[0.65rem] font-bold text-zinc-100 hover:bg-white/[0.12]"
          >
            + 새 친구
          </button>
        </header>
        <div className="border-b border-white/10 p-3">
          <input
            autoFocus
            className="input"
            placeholder="이름 · ID · 이메일로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-xs text-zinc-500">결과가 없습니다.</p>
          ) : (
            <ul>
              {filtered.map((c) => {
                const isCurrent = c.id === currentId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => onPick(c.id)}
                      className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-2.5 text-left transition-colors ${isCurrent ? "cursor-default opacity-50" : "hover:bg-white/[0.04]"}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-sm font-bold text-white">
                        {peerInitial(c.peer)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{peerLabel(c.peer)}</p>
                        <p className="truncate text-[0.65rem] text-zinc-500">
                          {c.peer.userCode ? `ID ${c.peer.userCode}` : c.peer.email}
                        </p>
                      </div>
                      {isCurrent ? (
                        <span className="text-[0.6rem] font-bold text-zinc-400">현재 대화</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
