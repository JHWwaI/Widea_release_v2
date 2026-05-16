"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { communityCategoryOptions, readError } from "@/lib/product";
import type { CommunityPost } from "@/lib/types";

function CommunityNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "FREE_TALK",
    content: "",
  });
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState<string | null>(null);

  useEffect(() => {
    const cat      = searchParams.get("category");
    const title    = searchParams.get("title");
    const idea     = searchParams.get("ideaId");
    const ideaTitl = searchParams.get("ideaTitle");
    setForm((prev) => ({
      ...prev,
      ...(cat   ? { category: cat }   : {}),
      ...(title ? { title }           : {}),
    }));
    if (idea) setIdeaId(idea);
    if (ideaTitl) setIdeaTitle(decodeURIComponent(ideaTitl));
  }, [searchParams]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError("");

    try {
      const created = await api<CommunityPost>(
        "POST",
        "/api/community/posts",
        {
          title: form.title,
          category: form.category,
          content: form.content,
          ...(ideaId ? { ideaId } : {}),
        },
        token,
      );
      router.push(`/community/${created.id}`);
    } catch (caught) {
      setError(readError(caught, "게시글 작성에 실패했습니다."));
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/community" className="hover:text-zinc-300">
            커뮤니티
          </Link>
          <span>/</span>
          <span className="text-zinc-300">새 글 작성</span>
        </div>

        <PageHeader
          eyebrow="커뮤니티"
          title="새 글 작성"
          description="아이디어, 질문, 팀 모집 등 자유롭게 남겨보세요."
        />

        <Surface className="max-w-2xl space-y-6">
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {/* 연결된 아이디어 배너 */}
          {ideaId && ideaTitle ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.10]/[0.08] px-4 py-3">
              <span className="text-lg">💡</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-400">연결된 아이디어</p>
                <p className="truncate text-sm font-semibold text-white">{ideaTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIdeaId(null); setIdeaTitle(null); }}
                className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300"
              >
                해제
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <label htmlFor="category" className="field-label">
                카테고리
              </label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="select"
              >
                {communityCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="field-label">
                제목
              </label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="input"
                placeholder="예: 한국 B2B SaaS에서 세일즈 자동화 기회가 있을까요?"
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="field-label">
                본문
              </label>
              <textarea
                id="content"
                name="content"
                value={form.content}
                onChange={handleChange}
                className="textarea"
                placeholder="지금 고민 중인 문제, 찾은 인사이트, 함께할 팀원을 적어 보세요."
                rows={10}
                required
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5">
                {submitting ? "등록 중..." : "게시글 등록"}
              </button>
              <Link href="/community" className="btn-ghost px-6 py-2.5">
                취소
              </Link>
            </div>
          </form>
        </Surface>
      </div>
    </AuthGuard>
  );
}

export default function CommunityNewPage() {
  return (
    <Suspense fallback={null}>
      <CommunityNewContent />
    </Suspense>
  );
}
