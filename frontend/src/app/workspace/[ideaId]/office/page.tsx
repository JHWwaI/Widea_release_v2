"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import AvatarCustomizer, { loadAvatar, saveAvatar, type AvatarConfig } from "@/components/office/AvatarCustomizer";
import SafeOfficeBoundary from "@/components/office/SafeOfficeBoundary";
import VirtualMeeting from "@/components/office/VirtualMeeting";

const OfficeScene = dynamic(() => import("@/components/office/MinimalOffice"), { ssr: false });

type IdeaInfo = { titleKo: string };

export default function OfficePage({ params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = use(params);
  const { user, token } = useAuth();
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(true);
  const [showMeeting, setShowMeeting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ idea: IdeaInfo }>("GET", `/api/workspace/${ideaId}`, undefined, token)
      .then((res) => setTitle(res.idea?.titleKo ?? ""))
      .catch(() => {});
  }, [token, ideaId]);

  function handleConfirm(cfg: AvatarConfig) {
    saveAvatar(cfg);
    setAvatar(cfg);
    setShowCustomizer(false);
  }

  return (
    <AuthGuard>
      <div className="fixed inset-0 z-[60]" style={{ background: "#0a0b10" }}>
        {/* Beta 배너 */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            가상 사무실 — 개발 중 (프로토타입)
          </span>
        </div>

        {/* 우상단 정보 + 나가기 + 아바타 변경 */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          <span className="rounded-md border border-white/10 bg-black/50 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
            {title || "워크스페이스"}
          </span>
          <button
            type="button"
            onClick={() => setShowMeeting((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors ${
              showMeeting
                ? "border-white/20 bg-white/[0.08] text-zinc-200"
                : "border-white/20 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.10]"
            }`}
            title="음성·화상·화면공유 회의 시작"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {showMeeting ? "회의 진행 중" : "회의 시작"}
          </button>
          <button
            type="button"
            onClick={() => setShowCustomizer(true)}
            className="rounded-md border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur transition-colors hover:bg-white/10"
          >
            아바타 변경
          </button>
          <Link
            href={`/workspace/${ideaId}`}
            className="rounded-md border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur transition-colors hover:bg-white/10"
          >
            ← 워크스페이스로
          </Link>
        </div>

        {/* 하단 안내 — 다음 단계 */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-lg border border-white/10 bg-black/60 px-4 py-2.5 text-center text-xs text-zinc-400 backdrop-blur">
            <p>
              <span className="font-medium text-zinc-200">다음 단계 개발 예정</span>
              <span className="mx-2 text-zinc-600">·</span>
              사실적 풀바디 아바타
              <span className="mx-2 text-zinc-600">·</span>
              근접 음성 채팅
              <span className="mx-2 text-zinc-600">·</span>
              회의실 분리
              <span className="mx-2 text-zinc-600">·</span>
              사무실 인테리어
            </p>
          </div>
        </div>

        {/* 회의 패널 — Jitsi Meet 임베드 (음성·화상·화면공유) */}
        {showMeeting ? (
          <VirtualMeeting
            roomId={ideaId}
            displayName={user?.name || user?.email?.split("@")[0] || "anon"}
            onClose={() => setShowMeeting(false)}
          />
        ) : null}

        {/* 아바타 커스터마이저 (입장 전 / 변경 시) */}
        {showCustomizer ? (
          <AvatarCustomizer
            initial={avatar ?? loadAvatar()}
            onConfirm={handleConfirm}
          />
        ) : null}

        {/* 3D 씬 — 아바타 결정 후에만 마운트, 크래시 시 메시지 표시 */}
        {avatar ? (
          <div className="absolute inset-0">
            <SafeOfficeBoundary>
              <OfficeScene
                roomId={ideaId}
                myId={user?.id ?? "anon"}
                myName={user?.name || user?.email?.split("@")[0] || "anon"}
                myAvatar={avatar}
              />
            </SafeOfficeBoundary>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
