"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState, EmptyState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";
import CollabRequestsInbox from "@/components/CollabRequestsInbox";

type Author = { id: string; name: string | null; email: string };
type Post = { id: string; title: string; category: string };

type DmPeer = { id: string; name: string | null; email: string; userCode: string | null };
type DmConv = {
  id: string;
  peer: DmPeer;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type InboxComment = {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  post: Post | undefined;
};

type InboxLike = {
  id: string;
  createdAt: string;
  user: Author;
  post: Post | undefined;
};

type InboxResponse = {
  comments: InboxComment[];
  likes: InboxLike[];
  total: number;
};

export default function InboxPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<InboxResponse | null>(null);
  const [dms, setDms] = useState<DmConv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewDm, setShowNewDm] = useState(false);
  const [newDmId, setNewDmId] = useState("");
  const [newDmError, setNewDmError] = useState("");
  const [startingDm, setStartingDm] = useState(false);

  async function startDm() {
    if (!token || !newDmId.trim()) return;
    setStartingDm(true);
    setNewDmError("");
    try {
      const res = await api<{ conversation: { id: string } }>(
        "POST",
        "/api/dm/start",
        { identifier: newDmId.trim() },
        token,
      );
      setShowNewDm(false);
      setNewDmId("");
      router.push(`/messages?dm=${encodeURIComponent(res.conversation.id)}`);
    } catch (caught) {
      setNewDmError(readError(caught, "사용자를 찾을 수 없습니다."));
    } finally {
      setStartingDm(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      api<InboxResponse>("GET", "/api/inbox", undefined, token),
      api<{ conversations: DmConv[] }>("GET", "/api/dm/conversations", undefined, token).catch(() => ({ conversations: [] as DmConv[] })),
    ])
      .then(([inboxRes, dmRes]) => {
        if (cancelled) return;
        setData(inboxRes);
        setDms(dmRes.conversations);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "받은 메시지를 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  function openDm(conversationId: string) {
    router.push(`/messages?dm=${encodeURIComponent(conversationId)}`);
  }

  // 미독 DM 우선
  const recentDms = [...dms]
    .sort((a, b) => {
      // 미독 카운트 우선, 다음 lastMessageAt 내림차순
      if ((b.unreadCount ?? 0) !== (a.unreadCount ?? 0)) return (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 8);
  const totalUnreadDm = dms.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  return (
    <AuthGuard>
      <div className="space-y-6 fade-up pb-12">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Link href="/mypage" className="text-xs text-zinc-500 hover:text-zinc-300">
              ← 마이페이지
            </Link>
            <p className="eyebrow">알림함</p>
            <h1 className="editorial-h2 text-white">받은 메시지·요청</h1>
            <p className="text-sm text-zinc-400">
              1:1 메시지, 협업 요청, 댓글·좋아요를 한 곳에서
            </p>
          </div>
          {totalUnreadDm > 0 ? (
            <button
              type="button"
              onClick={async () => {
                if (!token) return;
                try {
                  await api("POST", "/api/dm/mark-all-read", undefined, token);
                  setDms((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
                } catch (caught) {
                  setError(readError(caught, "전체 읽음 처리 실패"));
                }
              }}
              className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.10]"
            >
              모두 읽음
            </button>
          ) : null}
        </header>

        {/* 받은 DM (미독 우선) */}
        <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <header className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              1:1 메시지
              {totalUnreadDm > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-bold text-white">
                  {totalUnreadDm}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => {
                setNewDmError("");
                setNewDmId("");
                setShowNewDm(true);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[0.7rem] font-semibold text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.10]"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" d="M8 3v10M3 8h10" />
              </svg>
              새 채팅
            </button>
          </header>
          {recentDms.length > 0 ? (
            <ul className="space-y-1.5">
              {recentDms.map((c) => {
                const peerName = c.peer.name || c.peer.email || c.peer.userCode || "사용자";
                const initial = peerName.trim()[0]?.toUpperCase() ?? "?";
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openDm(c.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-left hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-xs font-bold text-zinc-100">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-bold text-white">{peerName}</p>
                          {c.lastMessageAt ? (
                            <span className="shrink-0 text-[0.6rem] text-zinc-500">
                              {formatRelativeTime(c.lastMessageAt)}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-zinc-400">
                          {c.lastMessage?.content ?? "(메시지 없음)"}
                        </p>
                      </div>
                      {c.unreadCount > 0 ? (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs text-zinc-500">
              아직 채팅이 없습니다. <span className="text-zinc-300">+ 새 채팅</span>으로 초대 코드 또는 이메일을 입력해 시작하세요.
            </p>
          )}
        </section>

        {/* 협업 요청 */}
        <CollabRequestsInbox />

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingState label="불러오는 중..." />
        ) : !data || data.total === 0 ? (
          <EmptyState
            title="아직 받은 응답이 없습니다"
            description="커뮤니티에 글을 올리면 여기에 응답이 모입니다."
            action={
              <Link href="/community/new" className="btn-primary text-sm">
                새 글 작성 →
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* 댓글 */}
            {data.comments.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-zinc-400">
                  댓글 {data.comments.length}건
                </h2>
                <ul className="space-y-2">
                  {data.comments.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={c.post ? `/community/${c.post.id}` : "/community"}
                        className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs text-zinc-500">
                            <span className="font-bold text-zinc-200">
                              {c.author.name || c.author.email.split("@")[0]}
                            </span>
                            님이{" "}
                            <span className="text-zinc-300">
                              "{c.post?.title.slice(0, 30) ?? "글"}..."
                            </span>
                            에 댓글
                          </p>
                          <span className="shrink-0 text-[0.7rem] text-zinc-500">
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-100">
                          {c.content}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* 좋아요 */}
            {data.likes.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-rose-300">
                  좋아요 {data.likes.length}건
                </h2>
                <ul className="space-y-2">
                  {data.likes.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={l.post ? `/community/${l.post.id}` : "/community"}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-rose-400/40 hover:bg-white/[0.04]"
                      >
                        <p className="text-xs text-zinc-300">
                          <span className="font-bold text-rose-200">
                            {l.user.name || l.user.email.split("@")[0]}
                          </span>
                          님이{" "}
                          <span className="text-zinc-400">
                            "{l.post?.title.slice(0, 40) ?? "글"}..."
                          </span>
                          좋아함
                        </p>
                        <span className="shrink-0 text-[0.7rem] text-zinc-500">
                          {formatRelativeTime(l.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>

      {/* 새 채팅 모달 */}
      {showNewDm ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !startingDm && setShowNewDm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">새 채팅 시작</h3>
            <p className="mt-1 text-xs text-zinc-400">
              상대방의 <span className="font-mono text-zinc-200">초대 코드</span>(6자) 또는 <span className="text-zinc-200">이메일</span>을 입력하세요.
            </p>
            <input
              autoFocus
              value={newDmId}
              onChange={(e) => setNewDmId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") startDm();
                if (e.key === "Escape") setShowNewDm(false);
              }}
              placeholder="예: ABC123 또는 friend@example.com"
              className="mt-4 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
            />
            {newDmError ? <p className="mt-2 text-xs text-rose-300">{newDmError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDm(false)}
                disabled={startingDm}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
              >
                취소
              </button>
              <button
                type="button"
                onClick={startDm}
                disabled={startingDm || !newDmId.trim()}
                className="rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-zinc-500"
              >
                {startingDm ? "찾는 중…" : "시작"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthGuard>
  );
}
