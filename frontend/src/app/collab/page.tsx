"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { clampText, communityCategoryOptions, formatRelativeTime, readError } from "@/lib/product";
import type { CommunityListResponse, CommunityPost } from "@/lib/types";

type Tab = "RECRUIT" | "OUTSOURCE";

const TAB_META: Record<Tab, { label: string; cat: string; emptyTitle: string; emptyDesc: string; cta: string }> = {
  RECRUIT: {
    label: "팀원 모집",
    cat: "TEAM_RECRUIT",
    emptyTitle: "아직 팀원 모집 글이 없습니다",
    emptyDesc: "함께할 사람을 찾는 글을 가장 먼저 올려보세요.",
    cta: "팀원 모집 글쓰기",
  },
  OUTSOURCE: {
    label: "외주 의뢰",
    cat: "OUTSOURCE_REQUEST",
    emptyTitle: "아직 외주 의뢰 글이 없습니다",
    emptyDesc: "필요한 작업을 정리해 외주 의뢰를 올려보세요.",
    cta: "외주 의뢰 글쓰기",
  },
};

export default function CollabHubPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>("RECRUIT");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    const cat = TAB_META[tab].cat;
    api<CommunityListResponse>(
      "GET",
      buildQuery("/api/community/posts", { category: cat, page: 1, limit: 30 }),
      undefined,
      token,
    )
      .then((res) => { if (!cancelled) setPosts(res.posts); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "글을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tab, token]);

  const meta = TAB_META[tab];
  const newHref = `/community/new?category=${meta.cat}`;

  return (
    <AuthGuard>
      <div className="space-y-8 fade-up pb-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            팀 빌딩 · 협업
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            외주·팀원 모집
          </h1>
          <p className="text-sm leading-7 text-zinc-300">
            함께할 사람을 찾고, 외주를 의뢰하고, 실시간으로 회의하세요.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/collab/meet" className="btn-secondary text-sm">
              🎥 실시간 회의 시작
            </Link>
            <Link href={newHref} className="btn-primary text-sm">
              + {meta.cta}
            </Link>
          </div>
        </header>

        {/* 탭 */}
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(Object.keys(TAB_META) as Tab[]).map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-white/[0.10] text-indigo-100" : "text-zinc-400 hover:text-white"
                }`}
              >
                {TAB_META[key].label}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {/* 리스트 */}
        {loading ? (
          <LoadingState label="불러오는 중..." />
        ) : posts.length === 0 ? (
          <EmptyState
            title={meta.emptyTitle}
            description={meta.emptyDesc}
            action={
              <Link href={newHref} className="btn-primary text-sm">{meta.cta}</Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="group block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[0.6875rem] font-semibold text-zinc-200 ring-1 ring-white/10">
                        {communityCategoryOptions.find((o) => o.value === post.category)?.label || post.category}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-white group-hover:text-zinc-200">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-300">
                      {clampText(post.content, 180)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>{post.author?.name || post.author?.email || "익명"}</span>
                      <span>· 조회 {post.viewCount}</span>
                      <span>· 댓글 {post._count?.comments || 0}</span>
                      <span>· ♡ {post._count?.likes || 0}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-zinc-500 group-hover:text-zinc-300">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 회의 카드 */}
        <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-500/[0.10] to-purple-500/[0.06] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            실시간 회의
          </p>
          <h2 className="mt-1.5 text-lg font-bold text-white">
            마음에 드는 팀과 바로 회의를 시작하세요
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            화상 미팅 · 화면 공유 · 실시간 채팅으로 협업 속도를 끌어올립니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/collab/meet" className="btn-primary text-sm">회의방 만들기</Link>
            <Link href="/collab/meet?join=1" className="btn-secondary text-sm">코드로 참여</Link>
          </div>
          {!user ? (
            <p className="mt-2 text-xs text-zinc-500">로그인이 필요합니다.</p>
          ) : null}
        </section>
      </div>
    </AuthGuard>
  );
}
