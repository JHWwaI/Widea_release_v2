"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BillingFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "결제가 취소되었거나 오류가 발생했습니다.";

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.08]">
          <svg className="h-7 w-7 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">결제 실패</h1>
          <p className="text-sm text-zinc-400">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/billing")}
            className="btn-primary flex-1"
          >
            다시 시도하기
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-secondary flex-1"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingFailPage() {
  return (
    <Suspense fallback={null}>
      <BillingFailContent />
    </Suspense>
  );
}
