"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import {
  clampText,
  communityCategoryOptions,
  formatDate,
  readError,
} from "@/lib/product";
import type { CommunityListResponse, CommunityPost } from "@/lib/types";

const PAGE_SIZE = 20;

export default function CommunityPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const authorId = searchParams.get("authorId") ?? "";
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);

    api<CommunityListResponse>(
      "GET",
      buildQuery("/api/community/posts", { category, q, authorId, page: 1, limit: PAGE_SIZE }),
      undefined,
      token ?? undefined,
    )
      .then((response) => {
        if (!cancelled) {
          setPosts(response.posts);
          setTotalPages(response.totalPages ?? 1);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "커뮤니티 글을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [category, q, authorId, token]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput.trim());
  }
  function handleSearchClear() {
    setSearchInput("");
    setQ("");
  }

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const response = await api<CommunityListResponse>(
        "GET",
        buildQuery("/api/community/posts", { category, q, authorId, page: nextPage, limit: PAGE_SIZE }),
        undefined,
        token ?? undefined,
      );
      setPosts((prev) => [...prev, ...response.posts]);
      setPage(nextPage);
      setTotalPages(response.totalPages ?? 1);
    } catch (caught) {
      setError(readError(caught, "추가 글을 불러오지 못했습니다."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLike(postId: string) {
    if (!token) return;
    try {
      const response = await api<{ liked: boolean; likeCount: number }>(
        "POST",
        `/api/community/posts/${postId}/like`,
        {},
        token,
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, _count: { comments: post._count?.comments || 0, likes: response.likeCount } }
            : post,
        ),
      );
    } catch (caught) {
      setError(readError(caught, "좋아요 처리에 실패했습니다."));
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="커뮤니티"
          title="커뮤니티"
          description="아이디어 공유, 질문, 팀 모집까지 한곳에서 연결합니다."
          actions={
            token ? (
              <Link href="/community/new" className="btn-primary px-5 py-2.5 text-sm">
                새 글 작성
              </Link>
            ) : undefined
          }
        />

        {error ? (
          <Surface className="border-rose-500/30 bg-rose-500/10 text-rose-200">{error}</Surface>
        ) : null}

        <Surface className="space-y-5">
          {/* 검색창 */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="search"
              placeholder="제목·본문 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input flex-1"
            />
            <button type="submit" className="btn-primary px-4 py-2 text-sm">
              검색
            </button>
            {q ? (
              <button
                type="button"
                onClick={handleSearchClear}
                className="btn-ghost px-3 py-2 text-sm"
              >
                초기화
              </button>
            ) : null}
          </form>
          {q ? (
            <p className="text-xs text-zinc-500">
              <span className="font-bold text-zinc-400">"{q}"</span> 검색 결과
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={category === "" ? "btn-secondary px-4 py-2 text-sm" : "btn-ghost px-4 py-2 text-sm"}
            >
              전체
            </button>
            {communityCategoryOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={
                  category === option.value
                    ? "btn-secondary px-4 py-2 text-sm"
                    : "btn-ghost px-4 py-2 text-sm"
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading ? (
            <EmptyState
              title="게시글을 불러오는 중입니다"
              description="카테고리별 최신 흐름을 연결하고 있습니다."
            />
          ) : posts.length === 0 ? (
            <EmptyState
              title="아직 게시글이 없습니다"
              description="첫 번째 글을 작성해 시장 인사이트나 팀 모집 글을 남겨보세요."
            />
          ) : (
            <div className="divide-y divide-white/10">
              {posts.map((post) => (
                <div key={post.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-accent">
                          {communityCategoryOptions.find((o) => o.value === post.category)?.label || post.category}
                        </span>
                        {post.idea ? (
                          <Link
                            href={`/workspace/${post.idea.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[0.65rem] font-medium text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            💡 {post.idea.titleKo}
                          </Link>
                        ) : null}
                        <span className="text-xs text-zinc-500">{formatDate(post.createdAt)}</span>
                      </div>
                      <Link href={`/community/${post.id}`}>
                        <h3 className="text-lg font-semibold text-white hover:text-zinc-200">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="text-sm leading-6 text-zinc-400">
                        {clampText(post.content, 160)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span>{post.author?.name || post.author?.email || "익명"}</span>
                        <span>조회 {post.viewCount}</span>
                        <span>댓글 {post._count?.comments || 0}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className="btn-ghost px-3 py-1.5 text-sm"
                      >
                        ♡ {post._count?.likes || 0}
                      </button>
                      <Link href={`/community/${post.id}`} className="text-xs text-zinc-400 hover:underline">
                        읽기 →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && page < totalPages && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-secondary px-6 py-2.5 text-sm"
              >
                {loadingMore ? "불러오는 중..." : "더보기"}
              </button>
            </div>
          )}
        </Surface>
      </div>
    </AuthGuard>
  );
}
