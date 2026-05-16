"use client";

import Link from "next/link";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { planLabels, userTypeLabels } from "@/lib/product";
import FounderHome from "@/components/mypage/FounderHome";
import AcceleratorHome from "@/components/mypage/AcceleratorHome";

function UserCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="클릭하면 복사됩니다"
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
    >
      <span>초대 코드</span>
      <span className="font-mono text-zinc-300">{code}</span>
      <span className="text-zinc-500">{copied ? "✓ 복사됨" : "· 복사"}</span>
    </button>
  );
}

export default function MyPage() {
  const { user } = useAuth();
  const role = user?.userType ?? "FOUNDER";
  const cta =
    role === "EXPERT"
      ? { href: "/community?category=TEAM_RECRUIT", label: "팀 모집 보기" }
      : { href: "/idea-match", label: "새 아이디어 만들기" };

  return (
    <AuthGuard>
      <div className="pb-16">
        {/* ── Hero 헤더 ── */}
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.06] pb-8">
          <div className="min-w-0 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {role === "EXPERT" ? "전문가 워크스페이스" : "내 워크스페이스"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              안녕하세요{user?.name ? `, ${user.name}님` : ""}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
              <span>{user?.userType ? userTypeLabels[user.userType] : "역할 미설정"}</span>
              <span className="text-zinc-700">·</span>
              <span>{user ? planLabels[user.planType] || user.planType : "-"} 플랜</span>
              <span className="text-zinc-700">·</span>
              <span>크레딧 {user?.isAdmin ? "무제한" : (user?.creditBalance ?? 0)}</span>
              {user?.userCode ? (
                <>
                  <span className="text-zinc-700">·</span>
                  <UserCodeBadge code={user.userCode} />
                </>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={cta.href}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-white/40 hover:bg-white/[0.04]"
            >
              {cta.label}
            </Link>
          </div>
        </header>

        {/* ── 본문 ── */}
        <main className="mt-8">
          {role === "EXPERT" ? <AcceleratorHome /> : <FounderHome />}
        </main>
      </div>
    </AuthGuard>
  );
}
