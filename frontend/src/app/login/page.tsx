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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#08090C] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 420px at 50% -10%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(500px 320px at 100% 100%, rgba(255,255,255,0.03), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 50% 0%, black 20%, transparent 75%)",
          }}
        />
      </div>

      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-white">
            Widea
          </Link>
          <p className="text-sm text-zinc-400">
            계정이 없으신가요?{" "}
            <Link href="/register" className="font-medium text-zinc-100 underline-offset-4 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-[fadeUp_0.6s_ease-out_both]">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">로그인</h1>
            <p className="mt-2 text-sm text-zinc-400">Widea 워크스페이스에 다시 오신 것을 환영합니다.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
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
                  className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
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
                  className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="w-full rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:-translate-y-px hover:bg-zinc-100 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-white/15 disabled:text-zinc-500 disabled:shadow-none"
              >
                {submitting ? "로그인 중…" : "로그인"}
              </button>
            </form>
          </div>
        </div>
      </main>


      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
