"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    setSubmitting(true); setError("");
    try {
      await api("POST", "/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (caught) {
      setError(readError(caught, "비밀번호 재설정에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-gray-900">유효하지 않은 링크입니다</p>
          <Link href="/forgot-password" className="btn-secondary mt-4 inline-block text-sm">
            다시 요청하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">새 비밀번호 설정</h1>
          <p className="mt-2 text-sm text-gray-500">영문과 숫자를 포함한 8자 이상으로 설정해주세요.</p>
        </div>

        {done ? (
          <div className="rounded-xl border border-white/15 bg-white/[0.06] p-6 text-center space-y-2">
            <p className="font-semibold text-white">비밀번호가 변경됐습니다</p>
            <Link href="/login" className="btn-primary mt-3 inline-block text-sm px-6">
              로그인하기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="field-label">새 비밀번호</label>
              <input
                type="password"
                className="input"
                placeholder="8자 이상, 영문+숫자 포함"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="field-label">비밀번호 확인</label>
              <input
                type="password"
                className="input"
                placeholder="비밀번호를 다시 입력해주세요"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
