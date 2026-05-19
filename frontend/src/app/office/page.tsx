"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import AvatarCustomizer, { loadAvatar, saveAvatar, type AvatarConfig } from "@/components/office/AvatarCustomizer";
import SafeOfficeBoundary from "@/components/office/SafeOfficeBoundary";

const CityScene = dynamic(() => import("@/components/office/CityScene"), { ssr: false });

type Building = {
  ideaId: string;
  titleKo: string;
  ownerName: string;
  memberCount: number;
  canEnter: boolean;
};

export default function CityPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api<{ buildings: Building[] }>("GET", "/api/office/buildings", undefined, token)
      .then((res) => setBuildings(res.buildings))
      .catch((e) => setError(e instanceof Error ? e.message : "도시 데이터 오류"));
  }, [token]);

  function handleConfirm(cfg: AvatarConfig) {
    saveAvatar(cfg);
    setAvatar(cfg);
    setShowCustomizer(false);
  }

  function handleEnter(ideaId: string) {
    router.push(`/workspace/${ideaId}/office`);
  }

  return (
    <AuthGuard>
      <div className="fixed inset-0 z-[60]" style={{ background: "#7eb6e8" }}>
        {/* 상단 배너 */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/50" />
            Widea Valley — 베타 (개발 중)
          </span>
        </div>

        {/* 우상단 액션 */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          <span className="rounded-md border border-white/10 bg-black/50 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
            🏙 {buildings?.length ?? "..."} 빌딩
          </span>
          <button
            type="button"
            onClick={() => setShowCustomizer(true)}
            className="rounded-md border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur transition-colors hover:bg-white/10"
          >
            아바타 변경
          </button>
          <Link
            href="/mypage"
            className="rounded-md border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur transition-colors hover:bg-white/10"
          >
            ← 나가기
          </Link>
        </div>

        {/* 하단 안내 */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-lg border border-white/10 bg-black/60 px-4 py-2.5 text-center text-xs text-zinc-300 backdrop-blur">
            본인이 owner·member인 빌딩만 입장 가능 · 다음 단계: 음성 채팅 / 빌딩 외관 커스텀 / 야경 모드
          </div>
        </div>

        {/* 에러 */}
        {error ? (
          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {/* 아바타 커스터마이저 */}
        {showCustomizer ? (
          <AvatarCustomizer
            initial={avatar ?? loadAvatar()}
            onConfirm={handleConfirm}
          />
        ) : null}

        {/* 도시 씬 */}
        {avatar && buildings ? (
          <div className="absolute inset-0">
            <SafeOfficeBoundary>
              <CityScene
                myId={user?.id ?? "anon"}
                myName={user?.name || user?.email?.split("@")[0] || "anon"}
                myAvatar={avatar}
                buildings={buildings}
                onEnterBuilding={handleEnter}
              />
            </SafeOfficeBoundary>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
