"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";
import { EmptyState, LoadingState } from "@/components/ProductUI";
import type { CommunityListResponse, CommunityPost } from "@/lib/types";

export default function AcceleratorHome() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    api<CommunityListResponse>(
      "GET",
      buildQuery("/api/community/posts", { category: "AC_REQUEST", page: 1, limit: 10 }),
      undefined,
      token,
    )
      .then((res) => { if (!cancelled) setRequests(res.posts); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "신청을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token]);

  return (
    <>
      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* 받은 AC 신청 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            AC 컨설팅 신청 <span className="text-zinc-500">({requests.length})</span>
          </h2>
          <Link href="/community?category=AC_REQUEST" className="text-xs font-medium text-zinc-300 hover:text-zinc-200">
            전체 보기 →
          </Link>
        </div>

        {loading ? (
          <LoadingState label="신청을 불러오는 중..." />
        ) : requests.length === 0 ? (
          <EmptyState
            title="아직 신청이 없습니다"
            description="창업가가 AC 컨설팅 요청을 올리면 여기에 자동으로 표시됩니다."
          />
        ) : (
          <div className="space-y-2">
            {requests.map((p) => (
              <Link
                key={p.id}
                href={`/community/${p.id}`}
                className="group block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="truncate text-base font-semibold text-white group-hover:text-zinc-200">
                    {p.title}
                  </p>
                  <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[0.6rem] font-bold text-zinc-200">
                    AC 요청
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {p.content.slice(0, 200)}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{p.author?.name || p.author?.email || "익명"}</span>
                  <span>· {formatRelativeTime(p.createdAt)}</span>
                  <span>· 댓글 {p._count?.comments || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 빠른 이동 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-white">빠른 이동</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/community?category=TEAM_RECRUIT" title="팀 모집 피드" desc="합류 가능한 창업팀 발견" />
          <QuickLink href="/community?category=AC_REQUEST" title="컨설팅 의뢰" desc="창업가가 올린 컨설팅 요청" />
          <QuickLink href="/community" title="전체 커뮤니티" desc="모든 카테고리" />
          <QuickLink href="/collab/meet" title="실시간 회의" desc="멘토링·면담" />
          <QuickLink href="/mypage/edit" title="프로필 편집" desc="이름·비밀번호·역할" />
          <QuickLink href="/contact" title="문의하기" desc="제휴·피드백" />
        </div>
      </section>
    </>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
    >
      <p className="text-sm font-semibold text-white group-hover:text-zinc-200">{title}</p>
      <p className="mt-1 text-xs text-zinc-400">{desc}</p>
      <p className="mt-3 text-xs font-semibold text-zinc-200">바로가기 →</p>
    </Link>
  );
}
