"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { PageHeader, Surface } from "@/components/ProductUI";
import MockTossModal from "@/components/MockTossModal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatCurrency, planLabels, readError } from "@/lib/product";
import type { PlanRecord } from "@/lib/types";

export default function PricingPage() {
  const { token, user, refreshUser, updateCredit } = useAuth();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [clientKey, setClientKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingPlan, setPendingPlan] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const [mockPlan, setMockPlan] = useState<PlanRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<PlanRecord[]>("GET", "/api/plans"),
      api<{ tossClientKey: string }>("GET", "/api/config/payment"),
    ])
      .then(([planData, paymentConfig]) => {
        if (!cancelled) {
          setPlans(planData);
          setClientKey(paymentConfig.tossClientKey);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(readError(caught, "플랜 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // FREE 다운그레이드 — 결제 없이 즉시 적용
  async function handleFreeSubscribe() {
    if (!token) return;
    setPendingPlan("FREE");
    setError(""); setMessage("");
    try {
      const response = await api<{ creditBalance: number }>(
        "POST", "/api/subscribe", { planType: "FREE" }, token,
      );
      updateCredit(response.creditBalance);
      await refreshUser();
      setMessage("Free 플랜으로 변경되었습니다.");
    } catch (caught) {
      setError(readError(caught, "플랜 변경에 실패했습니다."));
    } finally {
      setPendingPlan("");
    }
  }

  // 🎬 관리자 데모 우회 — 토스 안 거치고 즉시 플랜 적용
  async function handleDemoSubscribe(plan: PlanRecord) {
    if (!token) return;
    setPendingPlan(plan.planType);
    setError(""); setMessage("");
    try {
      const response = await api<{ creditBalance: number; planType: string }>(
        "POST", "/api/admin/demo-subscribe", { planType: plan.planType }, token,
      );
      updateCredit(response.creditBalance);
      await refreshUser();
      setMessage(`🎬 데모 결제 완료 — ${planLabels[response.planType] || response.planType} 플랜 적용 (실거래 X)`);
    } catch (caught) {
      setError(readError(caught, "데모 결제에 실패했습니다."));
    } finally {
      setPendingPlan("");
    }
  }

  // 유료 플랜 — 토스 결제창
  async function handleTossPayment(plan: PlanRecord) {
    if (!token || !user) return;
    if (!clientKey) {
      setError("결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setPendingPlan(plan.planType);
    setError("");
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const orderId = `widea-${plan.planType.toLowerCase()}-${Date.now()}`;
      await tossPayments.requestPayment("카드", {
        amount: plan.price,
        orderId,
        orderName: `Widea ${plan.label} 구독`,
        customerName: user.name || user.email,
        successUrl: `${window.location.origin}/billing/success?planType=${plan.planType}`,
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch (caught: unknown) {
      if (caught && typeof caught === "object" && "code" in caught && (caught as { code: string }).code === "USER_CANCEL") {
        setPendingPlan("");
        return;
      }
      setError(readError(caught, "결제 요청에 실패했습니다."));
    } finally {
      setPendingPlan("");
    }
  }

  return (
    <div className="workspace-grid fade-up">
      <PageHeader
        eyebrow="가격 안내"
        title="팀의 실행 속도에 맞는 플랜"
        description="무료 탐색부터 팀 단위 운영까지, 크레딧과 실행량에 맞춰 플랜을 확장할 수 있습니다."
        badge={user ? <span className="badge badge-accent">현재 {planLabels[user.planType] || user.planType}</span> : undefined}
      />

      {message ? (
        <Surface className="border-white/15 bg-white/[0.06] text-zinc-200">{message}</Surface>
      ) : null}
      {error ? (
        <Surface className="border-rose-500/30 bg-rose-500/10 text-rose-300">{error}</Surface>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Surface key={index} className="min-h-[320px]"><div /></Surface>
            ))
          : plans.map((plan) => {
              const isCurrent = user?.planType === plan.planType;
              const isRecommended = plan.planType === "PRO";
              const isFree = plan.price === 0;
              return (
                <Surface
                  key={plan.planType}
                  className={`flex h-full flex-col justify-between space-y-5 ${isRecommended ? "surface-card-accent" : ""}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">{isFree ? "스타터" : "스케일업"}</p>
                        <h2 className="text-2xl font-semibold text-white">{plan.label}</h2>
                      </div>
                      {isRecommended ? <span className="badge badge-warning">Recommended</span> : null}
                    </div>
                    <div>
                      <p className="text-3xl font-semibold tracking-[-0.05em] text-white">
                        {isFree ? "무료" : formatCurrency(plan.price)}
                        {!isFree ? <span className="text-sm font-normal text-zinc-500">/월</span> : null}
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        매월 {plan.credits.toLocaleString("ko-KR")} credits
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {[
                        `${plan.credits.toLocaleString("ko-KR")} credits 지급`,
                        "Discovery, Blueprint, Idea Match 즉시 사용",
                        plan.planType === "TEAM"
                          ? "운영용으로 넉넉한 사용량"
                          : plan.planType === "ENTERPRISE"
                            ? "대규모 탐색과 검증에 적합"
                            : "소규모 팀과 개인 검증에 적합",
                      ].map((line) => (
                        <div
                          key={line}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {token ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => (isFree ? handleFreeSubscribe() : handleTossPayment(plan))}
                        disabled={pendingPlan === plan.planType || isCurrent}
                        className={isCurrent ? "btn-secondary w-full" : "btn-primary w-full"}
                      >
                        {isCurrent
                          ? "현재 플랜"
                          : pendingPlan === plan.planType
                            ? "처리 중..."
                            : isFree
                              ? "무료로 시작"
                              : `${plan.label} 결제하기`}
                      </button>
                      {user?.isAdmin && !isFree && !isCurrent ? (
                        <button
                          type="button"
                          onClick={() => { setMockPlan(plan); setMockOpen(true); }}
                          disabled={pendingPlan === plan.planType}
                          className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.10] disabled:opacity-50"
                          title="관리자 전용 — Toss 스타일 데모 결제"
                        >
                          🎬 데모 결제 (실거래 X)
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <Link href="/register" className="btn-primary w-full">
                      가입하고 시작하기
                    </Link>
                  )}
                </Surface>
              );
            })}
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        ⓘ 결제는 토스페이먼츠 테스트 환경으로 처리되며 실제 카드 청구는 발생하지 않습니다. 정식 출시 시 실거래로 자동 전환됩니다.
      </p>

      {mockPlan ? (
        <MockTossModal
          open={mockOpen}
          planLabel={mockPlan.label}
          amountKRW={mockPlan.price}
          onClose={() => setMockOpen(false)}
          onConfirm={async () => {
            await handleDemoSubscribe(mockPlan);
          }}
        />
      ) : null}
    </div>
  );
}
