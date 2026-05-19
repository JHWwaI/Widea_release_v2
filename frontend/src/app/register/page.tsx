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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#08090C] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 420px at 50% -10%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(500px 320px at 0% 100%, rgba(255,255,255,0.03), transparent 70%)",
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
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-zinc-100 underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm animate-[fadeUp_0.6s_ease-out_both]">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">계정 만들기</h1>
            <p className="mt-2 text-sm text-zinc-400">무료로 시작하고 가입 즉시 50 크레딧이 지급됩니다.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
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
                  className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
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
                  className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
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
                  className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus:border-white/30 focus:bg-white/[0.06] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim() || !name.trim() || password.length < 6}
                className="w-full rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:-translate-y-px hover:bg-zinc-100 hover:shadow-[0_8px_30px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-white/15 disabled:text-zinc-500 disabled:shadow-none"
              >
                {submitting ? "계정 생성 중…" : "계정 만들기"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">
            가입하면 <Link href="/contact" className="underline-offset-4 hover:underline">이용약관 및 개인정보처리방침</Link>에 동의합니다.
          </p>
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
