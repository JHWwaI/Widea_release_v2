"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      await api("POST", "/api/auth/forgot-password", { email });
      setSent(true);
    } catch (caught) {
      setError(readError(caught, "요청에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">비밀번호 찾기</h1>
          <p className="mt-2 text-sm text-gray-500">
            가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-emerald-100 bg-white/[0.06] p-6 text-center space-y-2">
            <p className="font-semibold text-emerald-800">메일을 보냈습니다</p>
            <p className="text-sm text-zinc-700">
              받은 편지함을 확인해주세요. 링크는 1시간 동안 유효합니다.
            </p>
            <Link href="/login" className="btn-secondary mt-3 inline-block text-sm">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="field-label">이메일</label>
              <input
                type="email"
                className="input"
                placeholder="가입한 이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "전송 중..." : "재설정 링크 받기"}
            </button>
            <p className="text-center text-sm text-gray-400">
              <Link href="/login" className="hover:underline">로그인으로 돌아가기</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
