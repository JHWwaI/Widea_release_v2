"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { planLabels, readError } from "@/lib/product";

type ConfirmResult = {
  planType: string;
  creditsGranted: number;
  creditBalance: number;
};

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BillingSuccessContent />
    </Suspense>
  );
}

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, refreshUser, updateCredit } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const paymentKey = searchParams.get("paymentKey");
    const orderId    = searchParams.get("orderId");
    const amount     = searchParams.get("amount");
    const planType   = searchParams.get("planType");

    if (!paymentKey || !orderId || !amount || !planType) {
      setError("결제 정보가 올바르지 않습니다.");
      setStatus("error");
      return;
    }
    if (!token) {
      setError("로그인이 필요합니다.");
      setStatus("error");
      return;
    }

    api<ConfirmResult>(
      "POST",
      "/api/payment/toss/confirm",
      { paymentKey, orderId, amount: Number(amount), planType },
      token,
    )
      .then(async (data) => {
        updateCredit(data.creditBalance);
        await refreshUser();
        setResult(data);
        setStatus("success");
      })
      .catch((caught) => {
        setError(readError(caught, "결제 승인에 실패했습니다."));
        setStatus("error");
      });
  }, [searchParams, token, refreshUser, updateCredit]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-8 py-6">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
          <span className="text-sm text-zinc-400">결제를 확인하는 중입니다...</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-white/[0.04] p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
            <svg className="h-6 w-6 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white">결제 확인 실패</h1>
          <p className="text-sm text-zinc-400">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/billing")}
            className="btn-primary w-full"
          >
            결제 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
          <svg className="h-7 w-7 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">결제 완료!</h1>
          <p className="text-sm text-zinc-400">
            {result ? `${planLabels[result.planType] || result.planType} 플랜이 시작됐습니다.` : ""}
          </p>
        </div>

        {result && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">충전된 크레딧</span>
              <span className="font-semibold text-white">+{result.creditsGranted.toLocaleString()} cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">현재 잔액</span>
              <span className="font-semibold text-white">{result.creditBalance.toLocaleString()} cr</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/idea-match")}
            className="btn-primary flex-1"
          >
            아이디어 생성하기
          </button>
          <button
            type="button"
            onClick={() => router.push("/billing")}
            className="btn-secondary flex-1"
          >
            구독 관리
          </button>
        </div>
      </div>
    </div>
  );
}
