"use client";

/**
 * 구독 결제 페이지 — OpenAI 스타일.
 * 상단 [개인 | 팀] 탭 토글 → 각 카테고리 플랜 카드 그리드.
 */

import { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import {
  PERSONAL_PLANS,
  TEAM_PLANS,
  PLAN_META,
  formatKrw,
  type PlanMeta,
  type PlanType,
} from "@/lib/plans";

type Tab = "personal" | "team";
type WorkspaceItem = { ideaId: string; title: string; isOwner: boolean };
type WsSubResponse = {
  planType: PlanType;
  maxMembers: number;
  currentMembers: number;
};

export default function BillingPage() {
  return (
    <AuthGuard>
      <Inner />
    </AuthGuard>
  );
}

function Inner() {
  const { token, user, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>("personal");
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [selectedWs, setSelectedWs] = useState<string>("");
  const [wsSub, setWsSub] = useState<WsSubResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshWs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ workspaces: WorkspaceItem[] }>(
        "GET",
        "/api/workspace/my-list",
        undefined,
        token,
      );
      const owned = res.workspaces.filter((w) => w.isOwner);
      setWorkspaces(owned);
      if (!selectedWs && owned[0]) setSelectedWs(owned[0].ideaId);
    } catch {
      // silent
    }
  }, [token, selectedWs]);

  useEffect(() => {
    refreshWs();
  }, [refreshWs]);

  // 선택된 워크스페이스 구독 fetch
  useEffect(() => {
    if (!token || !selectedWs) {
      setWsSub(null);
      return;
    }
    api<WsSubResponse>("GET", `/api/workspace/${selectedWs}/subscription`, undefined, token)
      .then(setWsSub)
      .catch(() => setWsSub(null));
  }, [token, selectedWs]);

  async function handleSubscribePersonal(plan: PlanMeta) {
    if (!token) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // 개인 플랜은 기존 /api/subscribe (FREE) 또는 /api/admin/demo-subscribe (유료, 데모용)
      if (plan.priceKrw === 0) {
        await api("POST", "/api/subscribe", { planType: plan.key }, token);
      } else {
        await api("POST", "/api/admin/demo-subscribe", { planType: plan.key }, token);
      }
      await refreshUser();
      setSuccess(`${plan.label} 플랜으로 변경됐습니다.`);
    } catch (caught) {
      setError(readError(caught, "구독 실패"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribeTeam(plan: PlanMeta) {
    if (!token || !selectedWs) {
      setError("워크스페이스를 선택해주세요.");
      return;
    }
    if (plan.key === "ENTERPRISE") {
      window.location.href = "/contact";
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api(
        "POST",
        `/api/workspace/${selectedWs}/subscribe`,
        { planType: plan.key },
        token,
      );
      const wsName = workspaces.find((w) => w.ideaId === selectedWs)?.title ?? "워크스페이스";
      setSuccess(`${wsName}에 ${plan.label} 플랜이 활성화됐습니다.`);
      const subRes = await api<WsSubResponse>("GET", `/api/workspace/${selectedWs}/subscription`, undefined, token);
      setWsSub(subRes);
    } catch (caught) {
      setError(readError(caught, "팀 구독 실패"));
    } finally {
      setLoading(false);
    }
  }

  const currentPersonalPlan = (user?.planType ?? "FREE") as PlanType;
  const plans = tab === "personal" ? PERSONAL_PLANS : TEAM_PLANS;

  return (
    <div className="mx-auto max-w-6xl space-y-6 fade-up">
      <header className="space-y-2 text-center">
        <p className="eyebrow">구독·결제</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">플랜을 선택하세요</h1>
        <p className="text-sm text-zinc-400">
          개인 창업자부터 팀 단위까지 — 검증·실행·확장 단계별 맞춤 가격
        </p>
      </header>

      {/* 탭 토글 */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setTab("personal")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
              tab === "personal" ? "bg-white/[0.10] text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            개인
          </button>
          <button
            type="button"
            onClick={() => setTab("team")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
              tab === "team" ? "bg-white/[0.10] text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            팀
          </button>
        </div>
      </div>

      {/* 팀 탭 — 워크스페이스 선택 */}
      {tab === "team" ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          {workspaces.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">
              내가 OWNER인 워크스페이스가 없습니다. 먼저 [아이디어 만들기]로 만들어주세요.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="text-xs font-semibold text-zinc-400">결제할 워크스페이스</label>
              <select
                value={selectedWs}
                onChange={(e) => setSelectedWs(e.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              >
                {workspaces.map((w) => (
                  <option key={w.ideaId} value={w.ideaId}>
                    {w.title}
                  </option>
                ))}
              </select>
              {wsSub ? (
                <p className="text-xs text-zinc-500">
                  현재: <strong className="text-white">{PLAN_META[wsSub.planType].label}</strong>
                  <span className="mx-1">·</span>
                  멤버 {wsSub.currentMembers}/{wsSub.maxMembers === 0 ? "∞" : wsSub.maxMembers}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-center text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-center text-sm text-white">
          ✓ {success}
        </p>
      ) : null}

      {/* 플랜 카드 그리드 */}
      <div
        className={`grid gap-4 ${
          tab === "personal" ? "mx-auto max-w-5xl sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {plans.map((plan) => {
          const isCurrent =
            tab === "personal"
              ? currentPersonalPlan === plan.key
              : wsSub?.planType === plan.key;
          return (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrent={isCurrent}
              onClick={() =>
                tab === "personal" ? handleSubscribePersonal(plan) : handleSubscribeTeam(plan)
              }
              loading={loading}
              showWsRequired={tab === "team" && !selectedWs && plan.key !== "ENTERPRISE"}
            />
          );
        })}
      </div>

      <p className="text-center text-[0.7rem] text-zinc-500">
        ⚠ 데모 환경 — 유료 플랜 결제는 시연용 우회 모드입니다. 실제 카드 결제는 발생하지 않습니다.
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onClick,
  loading,
  showWsRequired,
}: {
  plan: PlanMeta;
  isCurrent: boolean;
  onClick: () => void;
  loading: boolean;
  showWsRequired: boolean;
}) {
  const isFree = plan.priceKrw === 0 && plan.key !== "ENTERPRISE";
  const isEnterprise = plan.key === "ENTERPRISE";

  const badgeMeta =
    plan.badge === "popular"
      ? { text: "인기", cn: "bg-white/[0.10] text-white" }
      : plan.badge === "best_value"
        ? { text: "추천", cn: "bg-white text-white" }
        : null;

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border p-5 transition-all ${
        isCurrent
          ? "border-white/30 bg-white/[0.05] ring-1 ring-white/15"
          : plan.badge
            ? "border-white/15 bg-white/[0.10]/[0.04] ring-1 ring-white/10"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {badgeMeta ? (
        <span
          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold ${badgeMeta.cn}`}
        >
          {badgeMeta.text}
        </span>
      ) : null}
      {isCurrent ? (
        <span className="absolute -top-2.5 right-3 rounded-full bg-white px-2.5 py-0.5 text-[0.6rem] font-bold text-white">
          현재 플랜
        </span>
      ) : null}

      <div className="space-y-1">
        <p className="text-base font-bold text-white">{plan.label}</p>
        <p className="text-[0.7rem] text-zinc-400">{plan.tagline}</p>
      </div>

      <div className="space-y-0.5">
        {isEnterprise ? (
          <p className="text-2xl font-black text-white">별도 견적</p>
        ) : (
          <>
            <p className="text-3xl font-black text-white">
              ₩{formatKrw(plan.priceKrw)}
              <span className="ml-1 text-sm font-normal text-zinc-500">/월</span>
            </p>
            {plan.maxMembers > 0 ? (
              <p className="text-[0.65rem] text-zinc-500">
                멤버 {plan.maxMembers}명 한도
                {plan.category === "team" && plan.priceKrw > 0
                  ? ` · 1인당 약 ₩${formatKrw(Math.round(plan.priceKrw / plan.maxMembers))}`
                  : ""}
              </p>
            ) : null}
          </>
        )}
      </div>

      <ul className="flex-1 space-y-1.5 border-t border-white/5 pt-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[0.7rem] text-zinc-300">
            <span className="text-zinc-300">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClick}
        disabled={loading || isCurrent || showWsRequired}
        className={`mt-1 w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
          isCurrent
            ? "bg-white/30 text-white cursor-default"
            : isEnterprise || isFree
              ? "border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              : "bg-white/[0.10] text-white hover:bg-white/[0.15]"
        }`}
      >
        {isCurrent
          ? "사용 중"
          : isEnterprise
            ? "영업팀 문의 →"
            : showWsRequired
              ? "워크스페이스 선택 필요"
              : isFree
                ? "FREE로 변경"
                : `${plan.label} 시작`}
      </button>
    </div>
  );
}
