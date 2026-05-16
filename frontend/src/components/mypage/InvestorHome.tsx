"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";
import { EmptyState, LoadingState } from "@/components/ProductUI";
import type { CommunityListResponse, CommunityPost } from "@/lib/types";

/**
 * 투자자 홈 — Deal flow는 아직 별도 모델 없으므로
 * 커뮤니티의 최근 case study + idea 공유 글을 deal flow 후보로 노출.
 */
export default function InvestorHome() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    // 최근 IDEA_SHARE + CASE_STUDY 글
    api<CommunityListResponse>(
      "GET",
      buildQuery("/api/community/posts", { page: 1, limit: 10 }),
      undefined,
      token,
    )
      .then((res) => {
        if (cancelled) return;
        const filtered = res.posts.filter(
          (p) => p.category === "IDEA_SHARE" || p.category === "CASE_STUDY",
        );
        setPosts(filtered);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "Deal flow 불러오기 실패")); })
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

      {/* Deal flow */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Deal flow <span className="text-zinc-500">({posts.length})</span>
          </h2>
          <Link
            href="/community?category=IDEA_SHARE"
            className="text-xs font-medium text-zinc-300 hover:text-zinc-200"
          >
            전체 보기 →
          </Link>
        </div>

        {loading ? (
          <LoadingState label="Deal flow 불러오는 중..." />
        ) : posts.length === 0 ? (
          <EmptyState
            title="아직 검토할 deal이 없습니다"
            description="창업가가 idea·케이스 공유 글을 올리면 여기에 자동으로 모입니다."
          />
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
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
                    {p.category === "IDEA_SHARE" ? "Idea" : "Case"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {p.content.slice(0, 200)}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{p.author?.name || p.author?.email || "익명"}</span>
                  <span>· {formatRelativeTime(p.createdAt)}</span>
                  <span>· 조회 {p.viewCount}</span>
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
          <QuickLink href="/community?category=TEAM_RECRUIT" title="진행 중인 팀" desc="투자할 만한 팀 발견" />
          <QuickLink href="/community" title="전체 커뮤니티" desc="산업 인사이트·디스커션" />
          <QuickLink href="/collab/meet" title="실시간 회의" desc="IR 미팅·창업가 면담" />
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
