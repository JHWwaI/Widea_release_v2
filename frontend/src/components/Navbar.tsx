"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { planLabels, userTypeLabels } from "@/lib/product";
import { subscribeWS } from "@/lib/ws";

export default function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // 알림 미독 카운트 — 댓글/좋아요(인박스) + DM 미독 합산. 60초 폴링.
  useEffect(() => {
    if (!token) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    async function fetchUnread() {
      try {
        const [a, b] = await Promise.all([
          api<{ count: number }>("GET", "/api/inbox/count", undefined, token).catch(() => ({ count: 0 })),
          api<{ unreadTotal: number }>("GET", "/api/dm/unread-summary", undefined, token).catch(() => ({ unreadTotal: 0 })),
        ]);
        if (!cancelled) setUnread((a.count ?? 0) + (b.unreadTotal ?? 0));
      } catch {
        /* silent */
      }
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 60_000);
    // 실시간: 협업요청·DM 도착 즉시 카운트 +1
    const unsub = subscribeWS("notification.new", () => {
      setUnread((u) => u + 1);
    });
    return () => {
      cancelled = true;
      clearInterval(t);
      unsub();
    };
  }, [token, pathname]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        background: "rgba(7,6,15,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="mx-auto flex h-[var(--navbar-height)] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        {/* Left: sidebar toggle only (brand moved to sidebar header, ChatGPT-style) */}
        <div className="flex items-center gap-3">
          {user ? (
            // Mobile-only: lg 미만에서만 햄버거 노출 (lg 이상은 사이드바 자체에 토글이 있음)
            <button
              type="button"
              onClick={onMenuToggle}
              aria-label="사이드바 토글"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
                <line x1="9.5" y1="4.5" x2="9.5" y2="19.5" />
              </svg>
            </button>
          ) : (
            <Link href="/" className="flex items-center">
              <span className="text-lg font-bold tracking-tight text-white">Widea</span>
            </Link>
          )}
        </div>

        {/* Right: 로그인 전만 노출 (로그인 후 사용자 정보·알림·로그아웃은 사이드바 하단으로 이동) */}
        {user ? (
          <div />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ color: "#A8AACC" }}
            >
              로그인
            </Link>
            <Link href="/register" className="btn-primary px-4 py-1.5 text-sm">
              시작하기
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
