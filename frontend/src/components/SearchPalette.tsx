"use client";

/**
 * ChatGPT 스타일 검색 팔레트 — 중앙 모달 + 검색 input + 결과 리스트.
 * 트리거: 사이드바 "검색" 아이콘 또는 Cmd/Ctrl + K
 *
 * 검색 대상: 워크스페이스(SELECTED 아이디어) + 분석 세션(idea-match sessions)
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type WorkspaceItem = { ideaId: string; title: string };
type SessionItem = { id: string; projectPolicy: { title: string }; createdAt: string };

export type SearchEntry = {
  id: string;
  kind: "workspace" | "session";
  title: string;
  href: string;
  meta?: string;
};

export default function SearchPalette({
  open,
  onClose,
  scope = "all",
  title,
}: {
  open: boolean;
  onClose: () => void;
  /** "workspace": 워크스페이스만, "session": 분석 기록만, "all": 둘 다 */
  scope?: "workspace" | "session" | "all";
  /** 헤더 라벨 (옵션) — placeholder도 자동 변경 */
  title?: string;
}) {
  const router = useRouter();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 열릴 때 데이터 fetch + input focus
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIdx(0);
    setTimeout(() => inputRef.current?.focus(), 50);

    if (!token) return;
    let cancelled = false;
    setLoading(true);
    const tasks: Promise<SearchEntry[]>[] = [];
    if (scope === "all" || scope === "workspace") {
      tasks.push(
        api<{ workspaces: WorkspaceItem[] }>("GET", "/api/workspace/my-list", undefined, token)
          .then((res) =>
            res.workspaces.map((w) => ({
              id: `ws-${w.ideaId}`,
              kind: "workspace" as const,
              title: w.title,
              href: `/workspace/${w.ideaId}`,
              meta: "워크스페이스",
            })),
          )
          .catch(() => []),
      );
    }
    if (scope === "all" || scope === "session") {
      tasks.push(
        api<{ sessions: SessionItem[] }>("GET", "/api/idea-match/sessions?limit=50", undefined, token)
          .then((res) =>
            res.sessions.map((s) => ({
              id: `sess-${s.id}`,
              kind: "session" as const,
              title: s.projectPolicy?.title || "이름 없는 분석",
              href: `/idea-match/results?sessionId=${s.id}`,
              meta: "분석 기록",
            })),
          )
          .catch(() => []),
      );
    }
    Promise.all(tasks)
      .then((results) => { if (!cancelled) setEntries(results.flat()); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, token, scope]);

  // 필터링
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.title.toLowerCase().includes(q) || (e.meta?.toLowerCase().includes(q) ?? false));
  }, [entries, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, entries.length]);

  const navigate = useCallback(
    (entry: SearchEntry) => {
      onClose();
      router.push(entry.href);
    },
    [router, onClose],
  );

  // ESC / 화살표 / Enter 키보드
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const entry = filtered[activeIdx];
        if (entry) navigate(entry);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIdx, onClose, navigate]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="검색"
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
      >
        {/* 검색 input */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4">
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              title
                ? `${title} 검색…`
                : scope === "workspace"
                  ? "워크스페이스 검색…"
                  : scope === "session"
                    ? "분석 기록 검색…"
                    : "워크스페이스, 분석 기록 검색…"
            }
            className="h-12 flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
          <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[0.65rem] text-zinc-500 sm:inline-block">ESC</kbd>
        </div>

        {/* 결과 리스트 */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              {query ? "검색 결과가 없습니다" : "아직 워크스페이스·분석 기록이 없습니다"}
            </p>
          ) : (
            <ul>
              {filtered.map((entry, i) => {
                const active = i === activeIdx;
                return (
                  <li key={entry.id}>
                    <Link
                      href={entry.href}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => onClose()}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                        active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-zinc-400">
                          {entry.kind === "workspace" ? (
                            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M2 5.5C2 4.7 2.7 4 3.5 4h2.4l1.2 1.5h5.4c.8 0 1.5.7 1.5 1.5v4.5c0 .8-.7 1.5-1.5 1.5H3.5C2.7 13 2 12.3 2 11.5v-6Z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <circle cx="8" cy="8" r="5.5" />
                              <path d="M8 5v3l2 1.5" />
                            </svg>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">{entry.title}</p>
                          <p className="truncate text-[0.65rem] text-zinc-500">{entry.meta}</p>
                        </div>
                      </div>
                      {active ? (
                        <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[0.65rem] text-zinc-500 sm:inline-block">↵</kbd>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 하단 힌트 */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[0.65rem] text-zinc-500">
          <span>전체 {entries.length}개</span>
          <span>↑↓ 이동 · ↵ 열기 · ESC 닫기</span>
        </div>
      </div>
    </div>
  );
}
