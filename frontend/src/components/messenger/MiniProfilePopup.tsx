"use client";

/**
 * 카톡 스타일 미니 프로필 팝업.
 * - 채팅창의 아바타/이름 클릭 시 표시
 * - 1:1 DM 시작 + 그 사람 게시물 보기
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

export type MiniProfileUser = {
  id: string;
  name: string | null;
  email: string;
  userCode?: string | null;
};

export default function MiniProfilePopup({
  user,
  anchorRect,
  onClose,
}: {
  user: MiniProfileUser;
  anchorRect: DOMRect | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { token, user: me } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const isMe = me?.id === user.id;
  const name = user.name || user.email.split("@")[0];
  const initial = name.trim()[0]?.toUpperCase() ?? "?";

  async function startDm() {
    if (!token || isMe) return;
    setStarting(true);
    setError("");
    try {
      const identifier = user.userCode || user.email;
      const res = await api<{ conversation: { id: string } }>(
        "POST",
        "/api/dm/start",
        { identifier },
        token,
      );
      onClose();
      router.push(`/dm/${res.conversation.id}`);
    } catch (caught) {
      setError(readError(caught, "DM 시작 실패"));
    } finally {
      setStarting(false);
    }
  }

  function viewPosts() {
    onClose();
    router.push(`/community?authorId=${encodeURIComponent(user.id)}`);
  }

  // 위치 계산 — anchorRect 아래에 표시 (모바일은 중앙)
  const style: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 280),
        left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 280)),
        zIndex: 60,
      }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 60 };

  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label="닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="fixed inset-0 z-50 bg-black/40"
      />
      <div
        style={style}
        className="w-64 overflow-hidden rounded-2xl border border-white/15 bg-zinc-900 shadow-2xl"
      >
        {/* 프로필 헤더 */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-base font-bold text-zinc-100">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-[0.65rem] text-zinc-500">
              {user.userCode ? `ID ${user.userCode}` : user.email}
            </p>
          </div>
        </div>

        {error ? (
          <p className="border-b border-white/[0.06] bg-rose-500/10 px-4 py-2 text-[0.7rem] text-rose-300">
            {error}
          </p>
        ) : null}

        {/* 액션 버튼 */}
        <div className="p-2">
          {isMe ? (
            <p className="px-2 py-3 text-center text-xs text-zinc-500">나입니다</p>
          ) : (
            <>
              <button
                type="button"
                onClick={startDm}
                disabled={starting}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-100 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 7c0-2.5 2.5-4.5 5.5-4.5s5.5 2 5.5 4.5-2.5 4.5-5.5 4.5c-.7 0-1.4-.1-2-.3l-2.5 1 .8-2.2C3.4 9.2 2.5 8.2 2.5 7z" />
                </svg>
                {starting ? "DM 여는 중…" : "1:1 채팅"}
              </button>
              <button
                type="button"
                onClick={viewPosts}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-100 transition-colors hover:bg-white/[0.06]"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h10v10H3zM5 6h6M5 8.5h6M5 11h4" />
                </svg>
                게시물 보기
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
