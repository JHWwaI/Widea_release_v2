"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, LoadingState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDate, readError } from "@/lib/product";
import type { CreditLedgerEntry } from "@/lib/types";

function actionLabel(action: string) {
  if (action === "GRANT")  return { text: "충전",  cls: "bg-white/[0.06] text-zinc-800" };
  if (action === "REFUND") return { text: "환불",  cls: "bg-blue-50 text-blue-700" };
  if (action === "EXPIRE") return { text: "만료",  cls: "bg-gray-100 text-gray-400" };
  return                          { text: "사용",  cls: "bg-gray-100 text-gray-700" };
}

export default function BillingHistoryPage() {
  const { token, user } = useAuth();
  const [history, setHistory] = useState<CreditLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    api<CreditLedgerEntry[]>("GET", "/api/credits/history", undefined, token)
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "크레딧 이력을 불러오지 못했습니다.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const totalUsed = history
    .filter((e) => e.action === "CONSUME")
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const totalGranted = history
    .filter((e) => e.action === "GRANT")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="크레딧 사용 이력"
          title="크레딧 이력"
          description="충전, 사용, 환불 내역을 확인하세요."
          actions={
            <Link href="/billing" className="btn-secondary px-4 py-2 text-sm">
              ← 구독 플랜으로
            </Link>
          }
        />

        {error ? (
          <Surface className="border-red-100 bg-red-50 text-red-700">{error}</Surface>
        ) : null}

        {/* 요약 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Surface className="space-y-1 surface-card-accent">
            <p className="eyebrow">크레딧 잔액</p>
            <p className="text-3xl font-bold text-gray-900">
              {user?.isAdmin ? "∞" : (user?.creditBalance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">현재 잔액</p>
          </Surface>
          <Surface className="space-y-1">
            <p className="eyebrow">총 사용</p>
            <p className="text-3xl font-bold text-gray-900">{totalUsed.toLocaleString()}</p>
            <p className="text-xs text-gray-400">총 사용 크레딧</p>
          </Surface>
          <Surface className="space-y-1">
            <p className="eyebrow">총 충전</p>
            <p className="text-3xl font-bold text-gray-900">{totalGranted.toLocaleString()}</p>
            <p className="text-xs text-gray-400">총 충전 크레딧</p>
          </Surface>
        </div>

        {/* 이력 테이블 */}
        <Surface className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">크레딧 거래 내역</p>
              <h2 className="text-xl font-semibold text-gray-900">전체 이력</h2>
            </div>
            <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {history.length}건
            </span>
          </div>

          {loading ? (
            <LoadingState label="이력을 불러오는 중..." />
          ) : history.length === 0 ? (
            <EmptyState
              title="크레딧 이력이 없습니다"
              description="Discovery, Blueprint, Idea Match 등 AI 기능을 사용하면 여기에 이력이 쌓입니다."
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((entry) => {
                const al = actionLabel(entry.action);
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{entry.reason}</p>
                      <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${al.cls}`}>
                        {al.text}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount} cr
                        </p>
                        <p className="text-xs text-gray-400">잔액 {entry.balanceAfter}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      </div>
    </AuthGuard>
  );
}
