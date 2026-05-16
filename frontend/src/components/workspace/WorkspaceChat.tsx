"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import { subscribeWS } from "@/lib/ws";
import AddTaskModal from "@/components/workspace/AddTaskModal";
import MiniProfilePopup from "@/components/messenger/MiniProfilePopup";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** 카톡식 그룹화 — 같은 발신자의 연속 메시지를 묶고, 마지막만 시간 표시 */
function groupKakao(messages: Message[]): Array<{
  authorId: string;
  authorName: string;
  items: Message[];
}> {
  const groups: Array<{ authorId: string; authorName: string; items: Message[] }> = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    const sameAuthor = last && last.authorId === m.author.id;
    const sameMinute =
      last &&
      sameAuthor &&
      Math.abs(
        new Date(m.createdAt).getTime() -
          new Date(last.items[last.items.length - 1].createdAt).getTime(),
      ) < 60_000;
    if (sameAuthor && sameMinute) {
      last.items.push(m);
    } else {
      groups.push({
        authorId: m.author.id,
        authorName: m.author.name ?? m.author.email,
        items: [m],
      });
    }
  }
  return groups;
}

/* 메시지 목록 — 타이핑할 때 re-render 되지 않도록 memo 분리 */
const ChatMessageList = memo(function ChatMessageList({
  messages,
  myId,
  bottomRef,
  onAvatarClick,
}: {
  messages: Message[];
  myId: string | undefined;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onAvatarClick?: (author: Message["author"], rect: DOMRect) => void;
}) {
  const groups = groupKakao(messages);
  return (
    <div className="flex-1 overflow-y-auto bg-[#1a1a22] px-4 py-4 space-y-3">
      {messages.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">
          아직 메시지가 없습니다. 팀원들과 대화를 시작하세요.
        </p>
      ) : (
        groups.map((g, gi) => {
          const isMe = g.authorId === myId;
          return (
            <div
              key={`${g.authorId}-${gi}`}
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              {!isMe ? (
                <button
                  type="button"
                  onClick={(e) => {
                    const author = g.items[0]?.author;
                    if (!author) return;
                    onAvatarClick?.(author, (e.currentTarget as HTMLElement).getBoundingClientRect());
                  }}
                  className="mt-5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[0.7rem] font-bold text-zinc-100 transition-colors hover:bg-white/[0.15]"
                  title={`${g.authorName} 프로필`}
                >
                  {g.authorName.slice(0, 1).toUpperCase()}
                </button>
              ) : null}
              <div className={`flex max-w-[75%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                {!isMe ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      const author = g.items[0]?.author;
                      if (!author) return;
                      onAvatarClick?.(author, (e.currentTarget as HTMLElement).getBoundingClientRect());
                    }}
                    className="mb-1 px-1 text-left text-[0.7rem] text-zinc-400 hover:text-zinc-200"
                  >
                    {g.authorName}
                  </button>
                ) : null}
                <div className="flex flex-col gap-1">
                  {g.items.map((m, mi) => {
                    const isLast = mi === g.items.length - 1;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            isMe
                              ? "bg-[#FAE100] text-zinc-900"
                              : "bg-white text-zinc-900"
                          }`}
                        >
                          {m.content}
                        </div>
                        {isLast ? (
                          <span className="mb-0.5 text-[0.6rem] text-zinc-500">
                            {formatTime(m.createdAt)}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
});

export default function WorkspaceChat({ ideaId }: { ideaId: string }) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  /* 입력 상태는 uncontrolled ref로 관리 → messages 업데이트 시 re-render 없음 */
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [profilePopup, setProfilePopup] = useState<{ user: Message["author"]; rect: DOMRect } | null>(null);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!token) return;
    try {
      const res = await api<{ messages: Message[] }>(
        "GET",
        `/api/workspace/${ideaId}/messages`,
        undefined,
        token,
      );
      const latest = res.messages;
      const newLastId = latest[latest.length - 1]?.id ?? null;
      if (newLastId !== lastIdRef.current) {
        lastIdRef.current = newLastId;
        setMessages(latest);
        if (!silent) {
          requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
        }
      }
    } catch (caught) {
      if (!silent) setError(readError(caught, "메시지를 불러오지 못했습니다."));
    }
  }, [token, ideaId]);

  useEffect(() => {
    fetchMessages();
    // WS 실시간 수신 — 같은 워크스페이스 메시지면 즉시 추가
    const unsub = subscribeWS("chat.message", (payload) => {
      const data = payload as { ideaId: string; message: Message };
      if (data.ideaId !== ideaId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      lastIdRef.current = data.message.id;
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    });
    // 폴링은 안전망(WS 끊김 대비)으로 30초 주기 유지
    const iv = setInterval(() => fetchMessages(true), 30000);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [fetchMessages, ideaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  async function handleSend() {
    const content = inputRef.current?.value.trim();
    if (!content || !token) return;
    setSending(true);
    setError("");
    try {
      await api("POST", `/api/workspace/${ideaId}/messages`, { content }, token);
      if (inputRef.current) inputRef.current.value = "";
      await fetchMessages();
    } catch (caught) {
      setError(readError(caught, "전송 실패"));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">팀 채팅</p>
          <h2 className="text-xs font-bold text-white">이 워크스페이스 팀원과 대화</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddTask(true)}
          className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[0.65rem] font-semibold text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.10]"
          title="회의 중 즉석 일정 잡기"
        >
          + 일정
        </button>
      </header>

      <ChatMessageList
        messages={messages}
        myId={user?.id}
        bottomRef={bottomRef}
        onAvatarClick={(author, rect) => setProfilePopup({ user: author, rect })}
      />
      {profilePopup ? (
        <MiniProfilePopup
          user={profilePopup.user}
          anchorRect={profilePopup.rect}
          onClose={() => setProfilePopup(null)}
        />
      ) : null}

      {error ? (
        <p className="border-t border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="border-t border-white/10 bg-[#1a1a22] p-2.5">
        <div className="flex items-end gap-2 rounded-2xl bg-white/[0.06] p-1.5">
          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요"
            rows={1}
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="rounded-xl bg-[#FAE100] px-3.5 py-2 text-xs font-bold text-zinc-900 transition-colors hover:bg-[#FFE600] disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </div>

      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        defaultIdeaId={ideaId}
      />
    </section>
  );
}
