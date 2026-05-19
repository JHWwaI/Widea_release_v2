"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import { LoadingState } from "@/components/ProductUI";

type RecruitingPost = {
  titleKo?: string;
  bodyKo?: string;
  evidenceCompanyName?: string;
};

type CoffeeChat = {
  subjectKo?: string;
  targetRole?: string;
  bodyKo?: string;
  evidenceCompanyName?: string;
  archiveLink?: string;
  archiveLabel?: string;
};

type InvestorChecklist = {
  kpiToProve?: Array<{ metric?: string; target?: string; rationale?: string }>;
  unitEconomics?: { cacKo?: string; ltvKo?: string; logicKo?: string };
  moatKo?: string;
  evidenceCompanyName?: string;
};

type Artifacts = {
  recruitingPost?: RecruitingPost;
  coffeeChatTemplate?: CoffeeChat;
  investorChecklist?: InvestorChecklist;
};

export default function ArtifactsPanel({ ideaId }: { ideaId: string }) {
  const { token, updateCredit } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Artifacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState<{
    recruitingPostId?: string | null;
    outsourcePostId?: string | null;
    projectId?: string;
  } | null>(null);
  const requestedRef = useRef(false);

  // deep-report 생성 후 자동으로 artifacts 호출 (번들 — 무료)
  useEffect(() => {
    if (requestedRef.current || !token) return;
    requestedRef.current = true;
    (async () => {
      try {
        const res = await api<{
          artifacts: Artifacts;
          cached: boolean;
          creditUsed: number;
          creditBalance: number | null;
        }>("POST", `/api/ideas/${ideaId}/artifacts`, {}, token);
        setData(res.artifacts);
        if (res.creditBalance !== null) updateCredit(res.creditBalance);
      } catch (caught) {
        setError(readError(caught, "도구 생성에 실패했습니다."));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, token]);

  async function launch() {
    if (!token) return;
    setLaunching(true);
    setError("");
    try {
      const res = await api<{
        projectId: string;
        recruitingPostId: string | null;
        outsourcePostId: string | null;
      }>("POST", `/api/ideas/${ideaId}/launch-workspace`, {}, token);
      setLaunched(res);
      // 0.8초 후 워크스페이스로 자동 이동 (6단계 보드)
      setTimeout(() => {
        router.push(`/workspace/${ideaId}`);
      }, 800);
    } catch (caught) {
      setError(readError(caught, "워크스페이스 생성에 실패했습니다."));
      setLaunching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <LoadingState label="실행 도구 자동 생성 중..." />
      </div>
    );
  }

  // artifacts 생성 실패한 경우 — 안내만 띄우고 launch는 그대로 진행 가능
  if (!data) {
    return (
      <section className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            워크스페이스 시작
          </p>
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            바로 시작할 수 있어요
          </h2>
          {error ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.10]/[0.06] p-4 text-sm leading-7 text-zinc-200">
              ⚠ AI가 지금 일시적으로 바빠 모집공고·커피챗 자동 작성을 못 만들었어요.<br/>
              그래도 워크스페이스 셋업은 정상 작동합니다. 아래 버튼으로 바로 시작하세요.
            </p>
          ) : null}
          <p className="max-w-xl text-sm leading-7 text-zinc-400">
            6단계 보드 + 33개 default task가 자동 생성됩니다. 각 task에서 외주 글은
            나중에 한 건씩 작성할 수 있어요.
          </p>
        </header>

        <div className="space-y-3 text-center">
          {launched ? (
            <p className="text-base font-bold text-zinc-300">✓ 워크스페이스 생성 완료</p>
          ) : (
            <button
              type="button"
              onClick={launch}
              disabled={launching}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-10 py-4 text-base font-black text-zinc-950 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)] transition-all hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {launching ? "생성 중..." : "🚀 워크스페이스 시작"}
            </button>
          )}
          <p className="text-xs text-zinc-500">
            워크스페이스 생성·체크리스트 사용은 무료입니다.
          </p>
        </div>
      </section>
    );
  }

  const { recruitingPost, coffeeChatTemplate, investorChecklist } = data;

  return (
    <section className="space-y-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
          분석 끝 · 실행 도구 자동 생성됨
        </p>
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          이제 진짜 만들 차례
        </h2>
        <p className="max-w-xl text-base leading-7 text-zinc-400">
          모집공고·커피챗·투자 체크리스트 3종이 준비됐습니다.<br/>
          한 번 누르면 워크스페이스에 모두 자동 배포됩니다.
        </p>
      </header>

      {/* 1. 모집 공고 */}
      {recruitingPost ? (
        <ArtifactBlock
          num="01"
          label="팀원 모집 공고"
          subtitle={recruitingPost.titleKo}
          evidence={recruitingPost.evidenceCompanyName}
        >
          <pre className="whitespace-pre-wrap font-sans text-base leading-8 text-zinc-200">
            {recruitingPost.bodyKo}
          </pre>
        </ArtifactBlock>
      ) : null}

      {/* 2. 커피챗 */}
      {coffeeChatTemplate ? (
        <ArtifactBlock
          num="02"
          label="커피챗 메시지"
          subtitle={`타겟: ${coffeeChatTemplate.targetRole ?? ""}`}
          evidence={coffeeChatTemplate.evidenceCompanyName}
        >
          <p className="text-sm font-semibold text-white">
            제목: <span className="font-normal text-zinc-300">{coffeeChatTemplate.subjectKo}</span>
          </p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-base leading-8 text-zinc-200">
            {coffeeChatTemplate.bodyKo}
          </pre>
          {coffeeChatTemplate.archiveLink ? (
            <a
              href={coffeeChatTemplate.archiveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.10]/[0.08] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.10]/[0.12]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.10] text-base">
                📜
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">
                  {coffeeChatTemplate.archiveLabel ?? "Wayback Machine 스냅샷"}
                </span>
                <span className="mt-0.5 block truncate text-xs text-zinc-400">
                  {coffeeChatTemplate.archiveLink}
                </span>
              </span>
              <span className="shrink-0 text-zinc-400">→</span>
            </a>
          ) : null}
        </ArtifactBlock>
      ) : null}

      {/* 3. 투자 체크리스트 */}
      {investorChecklist ? (
        <ArtifactBlock
          num="03"
          label="투자 체크리스트"
          subtitle="투자자 3대 질문에 대한 답"
          evidence={investorChecklist.evidenceCompanyName}
        >
          <div className="space-y-6">
            {Array.isArray(investorChecklist.kpiToProve) && investorChecklist.kpiToProve.length > 0 ? (
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-500">
                  먼저 증명할 KPI
                </p>
                <ul className="mt-3 space-y-3">
                  {investorChecklist.kpiToProve.map((k, i) => (
                    <li key={i}>
                      <p className="text-base font-semibold text-white">
                        {k.metric} <span className="text-zinc-400">→ {k.target}</span>
                      </p>
                      {k.rationale ? (
                        <p className="mt-0.5 text-sm leading-7 text-zinc-400">{k.rationale}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {investorChecklist.unitEconomics ? (
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-500">
                  단위 경제
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {investorChecklist.unitEconomics.cacKo ? (
                    <div>
                      <dt className="font-semibold text-white">CAC</dt>
                      <dd className="text-zinc-300">{investorChecklist.unitEconomics.cacKo}</dd>
                    </div>
                  ) : null}
                  {investorChecklist.unitEconomics.ltvKo ? (
                    <div>
                      <dt className="font-semibold text-white">LTV</dt>
                      <dd className="text-zinc-300">{investorChecklist.unitEconomics.ltvKo}</dd>
                    </div>
                  ) : null}
                  {investorChecklist.unitEconomics.logicKo ? (
                    <p className="text-zinc-400">💡 {investorChecklist.unitEconomics.logicKo}</p>
                  ) : null}
                </dl>
              </div>
            ) : null}

            {investorChecklist.moatKo ? (
              <div className="border-l-2 border-white/30 pl-5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-400">
                  왜 망하지 않는가
                </p>
                <p className="mt-2 text-base leading-8 text-white">{investorChecklist.moatKo}</p>
              </div>
            ) : null}
          </div>
        </ArtifactBlock>
      ) : null}

      {/* ─── 결정의 순간 ─────────────────────────────────────── */}
      <section className="relative mt-16 -mx-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-zinc-950 to-zinc-900 p-8 sm:mx-0 sm:p-12">

        <div className="relative space-y-10">
          {launched ? (
            <div className="space-y-3 text-center">
              <p className="text-3xl font-black leading-tight text-zinc-200 sm:text-4xl">
                첫 줄이 시작됐다.
              </p>
              <p className="text-base text-zinc-300">
                커뮤니티에 모집글·외주 의뢰가 게시됐어요.<br/>
                잠시 후 모집글로 이동합니다…
              </p>
            </div>
          ) : (
            <>
              {/* 빅 인용 */}
              <blockquote className="space-y-3">
                <p className="text-2xl font-bold leading-snug text-white sm:text-4xl lg:text-5xl">
                  “위대한 회사도<br/>
                  <span className="text-zinc-500">처음엔 한 줄이었다.</span>”
                </p>
              </blockquote>

              {/* 셋업 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-200">
                  당신의 첫 줄
                </p>
                <p className="text-base leading-8 text-zinc-200 sm:text-lg">
                  5단계로 검증을 끝냈습니다. <br/>
                  Stripe가 Hacker News에 코드 한 줄을 올렸을 때처럼,<br/>
                  <span className="font-bold text-white">당신의 첫 줄은 이 버튼입니다.</span>
                </p>
              </div>

              {/* 일어날 일 미리보기 */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Step num="1" title="모집공고 게시" desc="커뮤니티에 자동 게시" />
                <Step num="2" title="외주 의뢰 발송" desc="외주 카테고리에 동시 게시" />
                <Step num="3" title="첫 메시지" desc="가장 빠른 지원자와 30분 커피챗" />
              </div>

              {/* 큰 CTA */}
              <div className="space-y-3 pt-2 text-center">
                <button
                  type="button"
                  onClick={launch}
                  disabled={launching}
                  className="group inline-flex items-center gap-3 rounded-full bg-emerald-400 px-12 py-5 text-base font-black text-zinc-950 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)] transition-all hover:bg-emerald-300 hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.9)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
                >
                  <span>{launching ? "배포 중..." : "첫 줄을 시작하기"}</span>
                  <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                </button>
                <p className="text-xs text-zinc-500">
                  클릭 시 모집글·외주 의뢰가 즉시 커뮤니티에 게시됩니다 · 언제든 수정·삭제 가능
                </p>
                {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              </div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-zinc-200/40">{num}</span>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}

function ArtifactBlock({
  num,
  label,
  subtitle,
  evidence,
  children,
}: {
  num: string;
  label: string;
  subtitle?: string;
  evidence?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-x-6">
      <div className="min-w-0 space-y-4">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {label}
          </p>
          {subtitle ? (
            <p className="mt-1.5 text-lg font-bold leading-tight text-white">{subtitle}</p>
          ) : null}
        </header>
        <div>{children}</div>
        {evidence ? (
          <p className="border-t border-white/5 pt-3 text-xs text-zinc-500">
            근거 · <span className="text-zinc-300">{evidence}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
