"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import MeetingNotesSection from "@/components/MeetingNotesSection";

function genRoomCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `widea-${part()}-${part()}`;
}

function MeetContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const wantJoin = searchParams.get("join") === "1";
  const ideaId = searchParams.get("ideaId") || undefined;

  const [room, setRoom] = useState<string>("");
  const [joinCode, setJoinCode] = useState("");
  const [active, setActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // ?room= 으로 직접 들어온 경우 바로 입장
  useEffect(() => {
    const r = searchParams.get("room");
    if (r) {
      setRoom(r);
      setActive(true);
    }
  }, [searchParams]);

  const meetUrl = useMemo(() => {
    if (!room) return "";
    // Jitsi Meet (무료 공개 인스턴스, 인증 불필요, 이름은 룸명에 포함)
    const displayName = encodeURIComponent(user?.name || user?.email || "Widea Member");
    return `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=%22${displayName}%22&config.prejoinPageEnabled=false`;
  }, [room, user]);

  function handleCreate() {
    const code = genRoomCode();
    setRoom(code);
    setActive(true);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    setRoom(code);
    setActive(true);
  }

  async function copyShare() {
    if (!room) return;
    const url = `${window.location.origin}/collab/meet?room=${encodeURIComponent(room)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function exit() {
    setActive(false);
    setRoom("");
    setJoinCode("");
  }

  if (active && room) {
    return (
      <AuthGuard>
        <div className="mx-auto max-w-7xl space-y-3 fade-up py-2 pb-12">
          <header className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                실시간 회의
              </p>
              <h1 className="truncate text-lg font-bold text-white">
                회의방 <span className="text-zinc-300">{room}</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={copyShare} className="btn-secondary text-sm">
                {copied ? "✓ 링크 복사됨" : "🔗 초대 링크 복사"}
              </button>
              <button type="button" onClick={exit} className="btn-ghost text-sm">
                나가기
              </button>
            </div>
          </header>

          {/* Jitsi 영상 */}
          <div className="h-[60vh] overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe
              key={room}
              src={meetUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="h-full w-full"
              title="Widea Meet"
            />
          </div>

          <p className="px-1 text-xs text-zinc-500">
            화상회의는 Jitsi Meet 위에서 동작합니다. 팀원에게 초대 링크 또는 회의방 코드(<span className="text-zinc-300">{room}</span>)를 공유하세요.
          </p>

          {/* 자동 회의록 섹션 */}
          {!ideaId ? (
            <p className="rounded-lg border border-white/15 bg-white/[0.10]/[0.06] px-4 py-3 text-xs text-zinc-200">
              ⚠ 워크스페이스에서 회의를 시작하지 않으면 회의록이 어떤 아이디어와도 연결되지 않습니다. 보관함을 통합했기 때문에, 끝낸 회의록을 다시 보려면{" "}
              <Link href="/idea-match" className="underline hover:text-zinc-100">아이디어 → 워크스페이스</Link>에서 시작하세요.
            </p>
          ) : null}
          <MeetingNotesSection roomCode={room} ideaId={ideaId} />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-8 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/collab" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            ← 협업 허브
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            실시간 회의
          </h1>
          <p className="text-sm text-zinc-300">
            화상 미팅 · 화면 공유 · 실시간 채팅. 회의방을 만들거나 코드로 참여하세요.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* 만들기 */}
          <section className="space-y-3 rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-500/[0.10] to-purple-500/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">새 회의</p>
            <h2 className="text-lg font-bold text-white">회의방 만들기</h2>
            <p className="text-sm text-zinc-300">
              즉시 새 방을 생성합니다. 링크를 팀원에게 공유하면 바로 참여할 수 있어요.
            </p>
            <button type="button" onClick={handleCreate} className="btn-primary w-full">
              + 새 회의 시작
            </button>
          </section>

          {/* 참여 */}
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">코드로 참여</p>
            <h2 className="text-lg font-bold text-white">기존 회의방 참여</h2>
            <p className="text-sm text-zinc-300">초대받은 회의방 코드 또는 링크 끝의 코드를 입력하세요.</p>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                className="input"
                placeholder="예: widea-x9k2-7p4q"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                autoFocus={wantJoin}
              />
              <button type="submit" className="btn-secondary w-full" disabled={!joinCode.trim()}>
                참여하기
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white">사용 팁</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
            <li>• 마이크/카메라 권한을 허용하면 즉시 통화에 참여합니다.</li>
            <li>• 화면 공유: 회의 중 하단 [화면 공유] 아이콘.</li>
            <li>• 채팅·손들기·녹화 등 기본 기능 모두 사용 가능합니다.</li>
            <li>• 회의방 코드는 영구적으로 살아있어, 같은 코드로 언제든 다시 모일 수 있습니다.</li>
          </ul>
        </section>
      </div>
    </AuthGuard>
  );
}

export default function MeetPage() {
  return (
    <Suspense fallback={null}>
      <MeetContent />
    </Suspense>
  );
}
