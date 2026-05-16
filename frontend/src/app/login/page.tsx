"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readError } from "@/lib/product";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) router.replace("/idea-match");
  }, [authLoading, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/idea-match");
    } catch (caught) {
      setError(readError(caught, "이메일 또는 비밀번호를 다시 확인해 주세요."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0C10] text-zinc-100">
      {/* Top bar */}
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 lg:px-8">
          <Link href="/" className="text-base font-semibold tracking-tight text-white">
            Widea
          </Link>
          <p className="text-sm text-zinc-400">
            계정이 없으신가요?{" "}
            <Link
              href="/register"
              className="font-medium text-zinc-100 underline-offset-4 hover:underline"
            >
              회원가입
            </Link>
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">로그인</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Widea 워크스페이스에 접속하세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-300">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-300">
                  비밀번호
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
                >
                  비밀번호 찾기
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="비밀번호 입력"
                className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-zinc-500"
            >
              {submitting ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-xs text-zinc-500 lg:px-8">
          <p>© 2026 Widea</p>
          <nav className="flex items-center gap-4">
            <Link href="/contact" className="hover:text-zinc-300 transition-colors">문의</Link>
            <Link href="/billing" className="hover:text-zinc-300 transition-colors">요금</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
