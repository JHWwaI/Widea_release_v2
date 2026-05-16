"use client";

/**
 * 메신저 — 사이드바 단독 메뉴.
 * [DM][팀] top-level 탭으로 분리:
 *   - DM: 글로벌 1:1 — FriendsHub 재사용
 *   - 팀: 내 워크스페이스 목록 + 선택 시 그 워크스페이스의 WorkspaceChat
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import FriendsHub from "@/components/messenger/FriendsHub";
import WorkspaceChat from "@/components/workspace/WorkspaceChat";

type TopTab = "dm" | "team";
type TeamItem = {
  ideaId: string;
  title: string;
  isOwner: boolean;
  lastMessage: { content: string; createdAt: string; author: { name: string | null; email: string } } | null;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

export default function MessengerPage() {
  return (
    <AuthGuard>
      <Inner />
    </AuthGuard>
  );
}

function Inner() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const initial: TopTab = searchParams?.get("tab") === "team" ? "team" : "dm";
  const [tab, setTab] = useState<TopTab>(initial);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState("");

  const refreshTeams = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ workspaces: TeamItem[] }>(
        "GET",
        "/api/workspace/my-list",
        undefined,
        token,
      );
      setTeams(res.workspaces);
    } catch (caught) {
      setError(readError(caught, "팀 채팅 목록 불러오기 실패"));
    } finally {
      setLoadingTeams(false);
    }
  }, [token]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height)-6rem)] min-h-[600px] flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            메신저
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">채팅</h1>
        </div>
        <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
          <button
            type="button"
            onClick={() => setTab("dm")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${tab === "dm" ? "bg-white/[0.10] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            개인 DM
          </button>
          <button
            type="button"
            onClick={() => setTab("team")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${tab === "team" ? "bg-white/[0.10] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            팀 채팅 ({teams.length})
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {tab === "dm" ? (
        <div className="flex-1 min-h-0">
          <FriendsHub />
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 sm:grid-cols-[260px_1fr]">
          {/* 좌: 워크스페이스 목록 */}
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="text-xs font-bold text-zinc-300">내 워크스페이스</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingTeams ? (
                <p className="p-4 text-xs text-zinc-500">불러오는 중...</p>
              ) : teams.length === 0 ? (
                <p className="p-4 text-xs text-zinc-500">
                  아직 워크스페이스가 없어요.<br />
                  사이드바 [아이디어 만들기]에서 시작하세요.
                </p>
              ) : (
                <ul>
                  {teams.map((w) => {
                    const sel = w.ideaId === selectedIdeaId;
                    return (
                      <li key={w.ideaId}>
                        <button
                          type="button"
                          onClick={() => setSelectedIdeaId(w.ideaId)}
                          className={`flex w-full items-start gap-2.5 border-b border-white/5 px-3 py-3 text-left transition-colors ${sel ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-violet-700/20 text-xs font-bold text-white">
                            {w.title.trim()[0] ?? "?"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate text-xs font-bold text-white">{w.title}</p>
                              {w.lastMessage ? (
                                <span className="shrink-0 text-[0.55rem] text-zinc-500">
                                  {formatTime(w.lastMessage.createdAt)}
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-[0.65rem] text-zinc-400">
                              {w.lastMessage ? (
                                <>
                                  <span className="text-zinc-300">
                                    {w.lastMessage.author.name ?? w.lastMessage.author.email}:
                                  </span>{" "}
                                  {w.lastMessage.content}
                                </>
                              ) : (
                                <span className="text-zinc-600">{w.isOwner ? "내 워크스페이스" : "멤버"}</span>
                              )}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* 우: 선택된 워크스페이스의 팀 채팅 */}
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            {selectedIdeaId ? (
              <WorkspaceChat key={selectedIdeaId} ideaId={selectedIdeaId} />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-center">
                <p className="text-sm text-zinc-500">
                  좌측에서 워크스페이스를 선택하세요.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
