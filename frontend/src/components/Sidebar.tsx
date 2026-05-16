"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api as apiCall } from "@/lib/api";
import { planLabels } from "@/lib/product";
import { subscribeWS } from "@/lib/ws";
import SearchPalette from "@/components/SearchPalette";

const icons: Record<string, React.ReactNode> = {
  search: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  folder: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  ),
  ledger: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
    </svg>
  ),
  sparkle: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  user: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  credit: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  ),
  chat: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  ),
  admin: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  ),
  team: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  tool: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.65-4.65 2.496-3.032c.317-.384.74-.626 1.208-.765m0 0a3 3 0 1 1 3.75 3.75M6.228 6.228 3.75 3.75m2.478 2.478 2.122 2.122m-2.122-2.122 2.121 2.121" />
    </svg>
  ),
  mentor: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  ),
};

export default function Sidebar({
  open,
  visible,
  onClose,
  onToggle,
}: {
  open: boolean;
  visible: boolean;
  onClose: () => void;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState<"all" | "workspace" | "session">("all");

  // Cmd/Ctrl + K 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchScope("all");
        setSearchOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function openSearch(scope: "all" | "workspace" | "session") {
    setSearchScope(scope);
    setSearchOpen(true);
  }

  if (!user) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="사이드바 닫기"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      />

      {/* Mobile open button — lg 미만에서 사이드바 닫혀있을 때 노출 */}
      {!open && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label="사이드바 열기"
          className="fixed left-2 top-2 z-40 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <line x1="9.5" y1="4.5" x2="9.5" y2="19.5" />
          </svg>
        </button>
      ) : null}

      {/* Sidebar panel — collapsed면 좁은 아이콘 레일 */}
      <aside
        className={[
          "fixed bottom-0 left-0 top-0 z-40 transition-all duration-300",
          // 모바일: open=true 일 때만 표시 (full width)
          open ? "translate-x-0 w-[var(--sidebar-width)]" : "-translate-x-full w-[var(--sidebar-width)]",
          // 데스크탑: 항상 보이되, visible=false면 좁은 레일
          visible ? "lg:translate-x-0 lg:w-[var(--sidebar-width)]" : "lg:translate-x-0 lg:w-14",
        ].join(" ")}
        style={{
          background: "#0B0C10",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex h-full flex-col px-2 pb-2 pt-3">
          {/* Brand header — collapsed면 토글만 */}
          <div className={`mb-3 flex items-center gap-2 px-1 ${visible ? "justify-between" : "justify-center"}`}>
            {visible ? (
              <Link
                href="/idea-match"
                onClick={onClose}
                className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-[0.95rem] font-semibold text-white transition-colors hover:bg-white/[0.04]"
              >
                Widea
              </Link>
            ) : null}
            {onToggle ? (
              <button
                type="button"
                onClick={onToggle}
                aria-label={visible ? "사이드바 닫기" : "사이드바 열기"}
                title={visible ? "사이드바 닫기" : "사이드바 열기"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
                  <line x1="9.5" y1="4.5" x2="9.5" y2="19.5" />
                </svg>
              </button>
            ) : null}
          </div>

          {/* 중간 영역 — 펼침 모드에서만 스크롤 (collapsed에선 tooltip 가시화) */}
          <div className={`min-h-0 flex-1 ${visible ? "overflow-y-auto" : "overflow-visible"}`}>
            {/* 펼침 모드 전용: + 새 아이디어 + 검색 */}
            {visible ? (
              <>
                <Link
                  href="/idea-match"
                  onClick={onClose}
                  className="mb-1.5 flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-2 text-[0.8125rem] font-medium text-zinc-100 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  <span>새 아이디어</span>
                </Link>
              </>
            ) : null}

            {/* 펼침 모드 전용: 워크스페이스 + 분석 기록 (목록 형태) */}
            {visible ? (
              <>
                <SidebarWorkspaces onNav={onClose} onOpenSearch={() => openSearch("workspace")} />
                <SidebarSessions onNav={onClose} onOpenSearch={() => openSearch("session")} />
              </>
            ) : null}

            {/* Collapsed 모드 전용: 워크스페이스/분석기록(모달) + 커뮤니티/전문가(링크) */}
            {!visible ? (
              <div className="space-y-1">
                {/* 워크스페이스 — 클릭 시 워크스페이스 검색 모달 */}
                <button
                  type="button"
                  onClick={() => openSearch("workspace")}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
                >
                  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5.5C2 4.7 2.7 4 3.5 4h2.4l1.2 1.5h5.4c.8 0 1.5.7 1.5 1.5v4.5c0 .8-.7 1.5-1.5 1.5H3.5C2.7 13 2 12.3 2 11.5v-6Z" />
                  </svg>
                  <span className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 shadow-lg group-hover:visible">
                    워크스페이스
                  </span>
                </button>
                {/* 분석 기록 — 클릭 시 분석 기록 검색 모달 */}
                <button
                  type="button"
                  onClick={() => openSearch("session")}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
                >
                  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="5.5" />
                    <path d="M8 5v3l2 1.5" />
                  </svg>
                  <span className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 shadow-lg group-hover:visible">
                    분석 기록
                  </span>
                </button>
                {/* 커뮤니티 / 전문가 — 페이지 링크 */}
                {[
                  {
                    href: "/community",
                    label: "커뮤니티",
                    icon: (
                      <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6.5C3 4.6 4.6 3 6.5 3h3C11.4 3 13 4.6 13 6.5S11.4 10 9.5 10H7l-3 2.5V10c-.6 0-1-.4-1-1V6.5Z" />
                      </svg>
                    ),
                  },
                  {
                    href: "/talent",
                    label: "전문가 찾기",
                    icon: (
                      <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="5.5" r="2.5" />
                        <path d="M3 13c.5-2.5 2.5-4 5-4s4.5 1.5 5 4" />
                      </svg>
                    ),
                  },
                ].map((m) => {
                  const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
                  return (
                    <Link
                      key={m.href}
                      href={m.href}
                      onClick={onClose}
                      className={`group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                        active
                          ? "bg-white/[0.07] text-white"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                      }`}
                    >
                      {m.icon}
                      <span className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 shadow-lg group-hover:visible">
                        {m.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {/* 펼침 모드 전용: 부가 메뉴 */}
            {visible ? (
            <div className="mt-4 space-y-0.5 border-t border-white/[0.06] pt-3">
              {[
                {
                  href: "/community",
                  label: "커뮤니티",
                  icon: (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6.5C3 4.6 4.6 3 6.5 3h3C11.4 3 13 4.6 13 6.5S11.4 10 9.5 10H7l-3 2.5V10c-.6 0-1-.4-1-1V6.5Z" />
                    </svg>
                  ),
                },
                {
                  href: "/messages",
                  label: "채팅",
                  icon: (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 4A1.5 1.5 0 0 1 4 2.5h8A1.5 1.5 0 0 1 13.5 4v6A1.5 1.5 0 0 1 12 11.5H7l-3 2.5V11.5a1.5 1.5 0 0 1-1.5-1.5V4Z" />
                    </svg>
                  ),
                },
                {
                  href: "/schedule",
                  label: "일정",
                  icon: (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
                      <path d="M2.5 6.5h11M5 2v3M11 2v3" />
                    </svg>
                  ),
                },
                {
                  href: "/talent",
                  label: "전문가 찾기",
                  icon: (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="5.5" r="2.5" />
                      <path d="M3 13c.5-2.5 2.5-4 5-4s4.5 1.5 5 4" />
                    </svg>
                  ),
                },
              ].map((m) => {
                const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={onClose}
                    title={m.label}
                    className={`flex items-center gap-2 rounded-md py-1.5 text-[0.8125rem] transition-colors ${
                      visible ? "px-2.5" : "justify-center px-0"
                    } ${
                      active
                        ? "bg-white/[0.07] text-white"
                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                    }`}
                  >
                    <span className={`shrink-0 ${active ? "text-zinc-200" : "text-zinc-500"}`}>{m.icon}</span>
                    <span>{m.label}</span>
                  </Link>
                );
              })}
            </div>
            ) : null}

            {/* Admin 진입 — 펼침 모드 전용 */}
            {visible && user.isAdmin ? (
              <Link
                href="/admin"
                onClick={onClose}
                className={`mt-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.75rem] transition-colors ${
                  pathname === "/admin"
                    ? "bg-white/[0.07] text-white"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <span className="shrink-0 text-zinc-600">{icons.admin}</span>
                <span>관리자</span>
              </Link>
            ) : null}
          </div>

          {/* Bottom user panel — flex 끝에 항상 고정 (좌측 하단) */}
          <div className="shrink-0">
            <SidebarUserPanel onNav={onClose} compact={!visible} />
          </div>
        </div>
      </aside>

      {/* 검색 팔레트 */}
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} scope={searchScope} />
    </>
  );
}

function SidebarUserPanel({ onNav, compact = false }: { onNav: () => void; compact?: boolean }) {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { setUnread(0); return; }
    let cancelled = false;
    async function fetchUnread() {
      try {
        const [a, b] = await Promise.all([
          apiCall<{ count: number }>("GET", "/api/inbox/count", undefined, token).catch(() => ({ count: 0 })),
          apiCall<{ unreadTotal: number }>("GET", "/api/dm/unread-summary", undefined, token).catch(() => ({ unreadTotal: 0 })),
        ]);
        if (!cancelled) setUnread((a.count ?? 0) + (b.unreadTotal ?? 0));
      } catch { /* silent */ }
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 60_000);
    const unsub = subscribeWS("notification.new", () => setUnread((u) => u + 1));
    return () => { cancelled = true; clearInterval(t); unsub(); };
  }, [token, pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  if (!user) return null;
  const name = user.name || user.email.split("@")[0];
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const planLabel = user.isAdmin ? "Admin" : (planLabels[user.planType] || user.planType);

  return (
    <div ref={menuRef} className="relative mt-2 border-t border-white/[0.06] pt-2">
      {/* Notification row — 펼침 모드에서만 노출 */}
      {!compact ? (
        <Link
          href="/mypage/inbox"
          onClick={onNav}
          className="relative flex items-center gap-2 rounded-md px-2.5 py-2 text-[0.8125rem] text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="flex-1">알림</span>
          {unread > 0 ? (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Link>
      ) : null}

      {/* Account row — 이재환 클릭하면 메뉴 열림 (compact면 아바타만 + 툴팁) */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={`group relative flex w-full items-center transition-colors hover:bg-white/[0.04] ${
          compact ? "justify-center rounded-md py-1.5" : "gap-2.5 rounded-md px-2 py-2 text-left"
        }`}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[0.7rem] font-bold text-zinc-100">
          {initial}
          {compact && unread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.55rem] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </span>
        {compact ? (
          <span className="pointer-events-none invisible absolute bottom-1/2 left-full z-50 ml-3 translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 shadow-lg group-hover:visible">
            {name}
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{name}</span>
            <span className="block truncate text-[0.65rem] text-zinc-500">
              {planLabel} · {user.isAdmin ? "∞" : user.creditBalance} cr
            </span>
          </span>
        )}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-1 right-1 mb-1 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-2xl"
        >
          <Link
            href="/mypage"
            role="menuitem"
            onClick={() => { setMenuOpen(false); onNav(); }}
            className="block px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            프로필
          </Link>
          <Link
            href="/mypage/edit"
            role="menuitem"
            onClick={() => { setMenuOpen(false); onNav(); }}
            className="block px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            설정
          </Link>
          <Link
            href="/billing"
            role="menuitem"
            onClick={() => { setMenuOpen(false); onNav(); }}
            className="block px-3 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.06]"
          >
            구독 업그레이드
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setMenuOpen(false); logout(); }}
            className="block w-full border-t border-white/[0.06] px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10"
          >
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ───── 확정한 워크스페이스 목록 ───── */
function SidebarWorkspaces({ onNav, onOpenSearch: _onOpenSearch }: { onNav: () => void; onOpenSearch: () => void }) {
  const { token } = useAuth();
  const pathname = usePathname();
  type WS = { ideaId: string; title: string; isOwner: boolean };
  const [items, setItems] = useState<WS[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    apiCall<{ workspaces: WS[] }>(
      "GET",
      "/api/workspace/my-list",
      undefined,
      token,
    )
      .then((res) => { if (!cancelled) setItems(res.workspaces ?? []); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, pathname]);

  if (loading) return null;
  return (
    <div className="mb-3">
      {/* 섹션 헤더 — 토글 (chevron) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mb-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-white/[0.03] hover:text-zinc-200"
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        <span className="flex-1 text-left">워크스페이스</span>
        {items.length > 0 ? <span className="text-[0.6rem] tabular-nums text-zinc-500">{items.length}</span> : null}
      </button>
      {/* 항목 리스트 */}
      {expanded ? (
        <div className="space-y-0.5">
          {items.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[0.75rem] text-zinc-600">아직 확정한 워크스페이스가 없습니다</p>
          ) : null}
          {items.map((w) => {
            const active = pathname === `/workspace/${w.ideaId}` || pathname.startsWith(`/workspace/${w.ideaId}/`);
            return (
              <Link
                key={w.ideaId}
                href={`/workspace/${w.ideaId}`}
                onClick={onNav}
                className={`block truncate rounded-md px-2.5 py-1.5 text-[0.8125rem] transition-colors ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {w.title}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ───── 과거 분석 세션 (ChatGPT 채팅 히스토리 패턴) ───── */
function SidebarSessions({ onNav, onOpenSearch: _onOpenSearch }: { onNav: () => void; onOpenSearch: () => void }) {
  const { token } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get("sessionId");
  type Sess = { id: string; projectPolicy: { title: string }; createdAt: string };
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    apiCall<{ sessions: Sess[] }>(
      "GET",
      "/api/idea-match/sessions?limit=30",
      undefined,
      token,
    )
      .then((res) => { if (!cancelled) setSessions(res.sessions); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, pathname]);

  if (loading) return null;
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mb-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-white/[0.03] hover:text-zinc-200"
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        <span className="flex-1 text-left">분석 기록</span>
        {sessions.length > 0 ? <span className="text-[0.6rem] tabular-nums text-zinc-500">{sessions.length}</span> : null}
      </button>
      {expanded ? (
        <div className="space-y-0.5">
          {sessions.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[0.75rem] text-zinc-600">아직 분석 기록이 없습니다</p>
          ) : null}
          {sessions.map((s) => {
            const active = currentSessionId === s.id;
            return (
              <Link
                key={s.id}
                href={`/idea-match/results?sessionId=${s.id}`}
                onClick={onNav}
                className={`block truncate rounded-md px-2.5 py-1.5 text-[0.8125rem] transition-colors ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                }`}
              >
                {s.projectPolicy?.title || "이름 없음"}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
