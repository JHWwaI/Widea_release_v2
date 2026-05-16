"use client";

/**
 * DM 채팅창 헤더에서 상대방을 워크스페이스 멤버로 즉시 추가하는 버튼.
 * - 본인이 가진 워크스페이스 목록을 모달로 보여주고 선택
 * - 역할(EDITOR/VIEWER) 선택
 * - POST /api/workspace/{ideaId}/members 호출
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

type WorkspaceItem = { ideaId: string; title: string; isOwner: boolean };

export default function AddPeerToWorkspaceButton({
  peerUserId,
  peerName,
}: {
  peerUserId: string;
  peerName: string;
}) {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // mount 시 — 내 owner 워크스페이스 목록 + peer 멤버십 fetch
  useEffect(() => {
    if (!token || !user || user.id === peerUserId) {
      setInitialized(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ workspaces: WorkspaceItem[] }>(
          "GET",
          "/api/workspace/my-list",
          undefined,
          token,
        );
        const owned = res.workspaces.filter((w) => w.isOwner);
        if (cancelled) return;
        setWorkspaces(owned);

        // 각 워크스페이스에서 peer가 member인지 확인
        const memberships = await Promise.all(
          owned.map(async (w) => {
            try {
              const m = await api<{ members: Array<{ user: { id: string } }> }>(
                "GET",
                `/api/workspace/${w.ideaId}/members`,
                undefined,
                token,
              );
              const has = m.members.some((mm) => mm.user.id === peerUserId);
              return has ? w.ideaId : null;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        setMemberOf(new Set(memberships.filter((x): x is string => x !== null)));
      } catch {
        // 무시 — 버튼은 그대로 노출
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();
    return () => { cancelled = true; };
  }, [token, user, peerUserId]);

  // 본인에겐 안 보이게
  if (!user || user.id === peerUserId) return null;
  // 추가 가능한 워크스페이스가 하나도 없으면 버튼 숨김 (모두 이미 멤버이거나 owner 워크스페이스 없음)
  if (initialized && workspaces.length > 0 && memberOf.size >= workspaces.length) return null;

  async function addToWorkspace(ideaId: string, title: string) {
    if (!token) return;
    setAdding(ideaId);
    setError("");
    try {
      await api(
        "POST",
        `/api/workspace/${ideaId}/members`,
        { targetUserId: peerUserId, role },
        token,
      );
      setDone(title);
      setTimeout(() => {
        setOpen(false);
        setDone(null);
      }, 1500);
    } catch (caught) {
      setError(readError(caught, "추가 실패"));
    } finally {
      setAdding(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${peerName}님을 내 워크스페이스 멤버로 추가`}
        className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-[0.65rem] font-semibold text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.10]"
      >
        + 멤버로 추가
      </button>

      {open ? (
        <>
          <div
            role="button"
            tabIndex={-1}
            aria-label="닫기"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <header className="mb-3">
              <h3 className="text-base font-bold text-white">
                {peerName}님을 워크스페이스 멤버로 추가
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                추가할 워크스페이스와 권한을 선택하세요.
              </p>
            </header>

            {/* 역할 선택 */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-zinc-400">권한</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
                className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              >
                <option value="EDITOR">편집자 (task 수정 가능)</option>
                <option value="VIEWER">뷰어 (읽기 전용)</option>
              </select>
            </div>

            {error ? (
              <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            ) : null}

            {done ? (
              <p className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-zinc-200">
                ✓ {done}에 추가됐습니다.
              </p>
            ) : loading ? (
              <p className="py-4 text-center text-xs text-zinc-500">불러오는 중...</p>
            ) : workspaces.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
                내가 OWNER인 워크스페이스가 없습니다.<br />
                먼저 [아이디어 만들기]로 워크스페이스를 만들어주세요.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {workspaces.map((w) => {
                  const already = memberOf.has(w.ideaId);
                  return (
                    <li key={w.ideaId}>
                      <button
                        type="button"
                        disabled={adding === w.ideaId || already}
                        onClick={() => addToWorkspace(w.ideaId, w.title)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-white/30 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className={`truncate text-sm font-semibold ${already ? "text-zinc-500" : "text-white"}`}>
                          {w.title}
                        </span>
                        <span className="shrink-0 text-[0.65rem] font-semibold text-zinc-300">
                          {already ? "이미 멤버" : adding === w.ideaId ? "추가 중…" : "→ 추가"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
