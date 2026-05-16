"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readError } from "@/lib/product";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace(user.userType ? "/idea-match" : "/select-type");
  }, [authLoading, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password, name);
      router.push("/select-type");
    } catch (caught) {
      setError(readError(caught, "회원가입에 실패했습니다. 입력값을 다시 확인해 주세요."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0C10] text-zinc-100">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 lg:px-8">
          <Link href="/" className="text-base font-semibold tracking-tight text-white">
            Widea
          </Link>
          <p className="text-sm text-zinc-400">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-medium text-zinc-100 underline-offset-4 hover:underline"
            >
              로그인
            </Link>
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">계정 만들기</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              무료로 시작하고 가입 즉시 50 크레딧이 지급됩니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="name" className="block text-xs font-medium text-zinc-300">
                이름
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="홍길동"
                className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
              />
            </div>

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
              <label htmlFor="password" className="block text-xs font-medium text-zinc-300">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="최소 6자"
                className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !email.trim() || !name.trim() || password.length < 6}
              className="w-full rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-zinc-500"
            >
              {submitting ? "계정 생성 중…" : "계정 만들기"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            가입하면 <Link href="/contact" className="underline-offset-4 hover:underline">이용약관 및 개인정보처리방침</Link>에 동의합니다.
          </p>
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
