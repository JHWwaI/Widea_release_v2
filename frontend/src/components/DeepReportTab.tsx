"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import { LoadingState } from "@/components/ProductUI";

type DeepReport = {
  hookLine?: string;
  existenceProof?: { heroLine?: string };
  mvpReality?: { heroLine?: string };
  wedgeStrategy?: { heroLine?: string; koreanAdaptationKo?: string };
  pivotWarning?: { heroLine?: string; shortcutKo?: string };
  technicalEngine?: { heroLine?: string };
};

type BenchmarkData = {
  companyName: string;
  industry: string | null;
  foundedYear: number | null;
  matchScore: number | null;
  valuationUsd: number | null;
  totalFundingUsd: number | null;
  archiveLink: string | null;
  mvpFeatures: string[];
  techStackHint: string[];
  initialChannel: string | null;
  initialMethod: string | null;
  pivotMoment: string | null;
  beachheadMarket: string | null;
};

export default function DeepReportTab({
  ideaId,
  onLaunch,
}: {
  ideaId: string;
  onLaunch?: () => void;
}) {
  const { token, user, updateCredit } = useAuth();
  const [report, setReport] = useState<DeepReport | null>(null);
  const [data, setData] = useState<BenchmarkData[]>([]);
  const [overallSim, setOverallSim] = useState<number>(0);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const requestedRef = useRef(false);

  // 마운트 시 자동 preview 로드 (무료, 생성 후 캐시됨)
  useEffect(() => {
    if (requestedRef.current || !token) return;
    requestedRef.current = true;
    (async () => {
      try {
        const res = await api<{
          report: DeepReport;
          benchmarkData: BenchmarkData[];
          overallSimilarity?: number;
          unlocked: boolean;
          cached: boolean;
        }>("POST", `/api/ideas/${ideaId}/deep-report`, {}, token);
        setReport(res.report);
        setData(res.benchmarkData ?? []);
        setOverallSim(res.overallSimilarity ?? 0);
        setUnlocked(Boolean(res.unlocked));
      } catch (caught) {
        setError(readError(caught, "심층 리포트를 불러오지 못했습니다."));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, token]);

  async function unlock() {
    if (!token) return;
    setUnlocking(true);
    setError("");
    try {
      const res = await api<{
        ok: boolean;
        alreadyUnlocked: boolean;
        creditUsed: number;
        creditBalance: number | null;
      }>("POST", `/api/ideas/${ideaId}/deep-report/unlock`, {}, token);
      if (res.creditBalance !== null) updateCredit(res.creditBalance);
      setUnlocked(true);
    } catch (caught) {
      setError(readError(caught, "잠금 해제 실패"));
    } finally {
      setUnlocking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingState label="벤치마크 분석 준비 중..." />
      </div>
    );
  }

  if (!report || data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-400">{error || "심층 리포트를 만들 수 없습니다."}</p>
      </div>
    );
  }

  // 가장 매칭이 강한 벤치마크 1개를 5단계 분석의 주 근거로 사용
  const primary = data[0];

  const overallPct = Math.round(overallSim * 100);
  const cost = 8;
  const canAfford = user?.isAdmin || (user?.creditBalance ?? 0) >= cost;

  return (
    <div className="relative">
      {/* 잠금 시: 본문 위에 떠있는 sticky CTA + 본문 블러 */}
      {!unlocked ? (
        <div className="pointer-events-none sticky top-4 z-20 mx-auto max-w-3xl pb-2">
          <div className="pointer-events-auto rounded-2xl border border-white/20 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  잠금된 분석 · 5단계 + 도구 3종 + 워크스페이스 자동 셋업
                </p>
                <p className="mt-1 text-sm font-bold text-white sm:text-base">
                  {cost} 크레딧으로 잠금 해제 → 영구 열람
                </p>
              </div>
              <button
                type="button"
                onClick={unlock}
                disabled={unlocking || !canAfford}
                className="shrink-0 rounded-full bg-white/[0.10] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/[0.15] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {unlocking ? "해제 중..." : `🔓 ${cost} 크레딧으로 열기`}
              </button>
            </div>
            {!canAfford ? (
              <p className="mt-2 text-xs text-rose-400">크레딧이 부족합니다 — 충전 후 이용해주세요.</p>
            ) : null}
            {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
          </div>
        </div>
      ) : null}

    <article
      className={`mx-auto max-w-3xl space-y-24 fade-up py-4 ${
        unlocked ? "" : "select-none"
      }`}
      style={
        unlocked
          ? undefined
          : {
              filter: "blur(7px)",
              WebkitFilter: "blur(7px)",
              pointerEvents: "none",
            }
      }
    >
      {/* HERO — 매칭 분석 */}
      <header className="space-y-8">
        <div className="space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-zinc-400">
            매칭 분석 · DB {data.length}건 벤치마크
          </p>

          {/* 거대 % */}
          <div className="flex items-baseline gap-4">
            <span className="text-7xl font-black leading-none tracking-tight text-white sm:text-9xl tabular-nums">
              {overallPct}
            </span>
            <span className="text-3xl font-black text-zinc-400 sm:text-5xl">%</span>
          </div>
          <p className="text-base text-zinc-400 sm:text-lg">
            당신의 아이디어와{" "}
            <span className="font-bold text-white">{primary.companyName}</span>의 유사도
          </p>
        </div>

        {/* 다른 매칭들 */}
        {data.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              다른 근거:
            </span>
            {data.slice(1).map((b) => (
              <span
                key={b.companyName}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300"
              >
                <span className="font-semibold">{b.companyName}</span>{" "}
                <span className="text-zinc-500">·</span>{" "}
                <span className="tabular-nums text-zinc-400">
                  {Math.round((b.matchScore ?? 0) * 100)}%
                </span>
              </span>
            ))}
          </div>
        ) : null}

        {/* hookLine */}
        {report.hookLine ? (
          <blockquote className="border-l-2 border-violet-400 pl-5 text-xl font-bold leading-snug text-white sm:text-2xl">
            “{report.hookLine}”
          </blockquote>
        ) : null}
      </header>

      <hr className="border-white/10" />

      {/* 01 — 실존 증명: 거대 숫자 + 한 줄 */}
      <Chapter num="01" eyebrow="실존 증명" hero={report.existenceProof?.heroLine} evidence={primary.companyName}>
        <div className="space-y-4">
          <CompanyHeader company={primary} />
          {primary.valuationUsd ? (
            <p className="text-7xl font-black tracking-tight text-white sm:text-8xl">
              ${(primary.valuationUsd / 1e9).toFixed(1)}<span className="text-zinc-400">B</span>
            </p>
          ) : null}
          <p className="text-sm text-zinc-400">
            {primary.foundedYear ? `${new Date().getFullYear() - primary.foundedYear}년 만에` : ""}
            {primary.totalFundingUsd ? ` · 누적 $${(primary.totalFundingUsd / 1e6).toFixed(0)}M 투자` : ""}
            {primary.industry ? ` · ${primary.industry}` : ""}
          </p>
        </div>
      </Chapter>

      {/* 브리지 */}
      <Bridge>그런데 처음엔 어땠을까?</Bridge>

      {/* 02 — MVP 흑역사: 초창기 웹사이트 썸네일 (메인) */}
      <Chapter
        num="02"
        eyebrow="MVP 흑역사"
        hero={report.mvpReality?.heroLine}
        evidence={primary.companyName}
      >
        <div className="space-y-6">
          {primary.archiveLink ? (
            <ArchiveThumbnail
              url={primary.archiveLink}
              companyName={primary.companyName}
              year={primary.foundedYear}
            />
          ) : null}

          {primary.mvpFeatures.length > 0 ? (
            <ul className="space-y-1.5">
              {primary.mvpFeatures.map((f, i) => (
                <li key={i} className="flex items-baseline gap-3 text-sm text-zinc-300 sm:text-base">
                  <span className="text-xs tabular-nums text-zinc-600">0{i + 1}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm italic text-zinc-500">
            당신의 기획안이 더 풍성하다.
          </p>
        </div>
      </Chapter>

      {/* 브리지 */}
      <Bridge>그럼 첫 100명은 어떻게 모았을까?</Bridge>

      {/* 03 — 송곳 전략 */}
      <Chapter num="03" eyebrow="송곳 전략" hero={report.wedgeStrategy?.heroLine} evidence={primary.companyName}>
        <WedgeFlow
          companyName={primary.companyName}
          beachheadMarket={primary.beachheadMarket}
          initialChannel={primary.initialChannel}
          initialMethod={primary.initialMethod}
          koreanAdaptation={report.wedgeStrategy?.koreanAdaptationKo}
        />
      </Chapter>

      {/* 브리지 */}
      <Bridge>근데 망하지 않을까?</Bridge>

      {/* 04 — 피벗 경고 */}
      <Chapter num="04" eyebrow="피벗 경고" hero={report.pivotWarning?.heroLine} evidence={primary.companyName}>
        <PivotBeforeAfter
          companyName={primary.companyName}
          pivotMoment={primary.pivotMoment}
          shortcutKo={report.pivotWarning?.shortcutKo}
        />
      </Chapter>

      {/* 브리지 */}
      <Bridge>그러면 어떤 사람을 영입해야 할까?</Bridge>

      {/* 05 — 기술 엔진 */}
      <Chapter num="05" eyebrow="기술 엔진" hero={report.technicalEngine?.heroLine} evidence={primary.companyName}>
        {primary.techStackHint.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {primary.techStackHint.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-zinc-100"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-sm leading-7 text-zinc-400">
              파트너 영입 시 이 스택을 한 번이라도 써본 사람을 우선하라.
            </p>
          </div>
        ) : null}
      </Chapter>

      {/* ─── 결론 — "이거구나!" 모먼트 + 실행 탭 진입 ─── */}
      <ConclusionSection
        primary={primary}
        hookLine={report.hookLine}
        overallPct={overallPct}
        onLaunch={unlocked ? onLaunch : undefined}
      />
    </article>
    </div>
  );
}

function ArchiveThumbnail({
  url,
  companyName,
  year,
}: {
  url: string;
  companyName: string;
  year: number | null;
}) {
  // thum.io 공개 무료 스크린샷 서비스 (API 키 불필요)
  // crop=400, width=800 — 16:8 정도 비율, lazy load
  const thumbUrl = `https://image.thum.io/get/width/800/crop/450/${encodeURI(url)}`;

  const [errored, setErrored] = useState(false);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-colors hover:border-white/25"
    >
      <div className="relative aspect-[16/9] w-full">
        {!errored ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={`${companyName} 초창기 모습`}
            loading="lazy"
            onError={() => setErrored(true)}
            className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center">
            <div className="space-y-2">
              <div className="text-4xl">📜</div>
              <p className="text-sm font-medium text-zinc-300">
                썸네일을 불러오지 못했습니다
              </p>
              <p className="text-xs text-zinc-500">클릭해서 직접 열어보세요</p>
            </div>
          </div>
        )}

        {/* 위 그라데이션 + 라벨 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-white">
            Wayback · {year ?? "초창기"}
          </span>
        </div>

        {/* 아래 그라데이션 + 회사명 + → */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <p className="text-base font-bold text-white">{companyName} 첫 화면</p>
          <span className="rounded-full bg-white/[0.15] px-3 py-1 text-xs font-semibold text-zinc-100 ring-1 ring-white/15">
            전체 보기 →
          </span>
        </div>
      </div>
    </a>
  );
}

/* ─── 챕터 사이 브리지 (질문 한 줄) ─────────────────── */
function Bridge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center -my-8">
      <p className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 text-xs font-medium text-zinc-400">
        ↓ {children}
      </p>
    </div>
  );
}

/* ─── 결론 섹션 — "이거구나!" 모먼트 ─────────────────── */
function ConclusionSection({
  primary,
  hookLine,
  overallPct,
  onLaunch,
}: {
  primary: BenchmarkData;
  hookLine?: string;
  overallPct: number;
  onLaunch?: () => void;
}) {
  const years = primary.foundedYear
    ? new Date().getFullYear() - primary.foundedYear
    : null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-violet-950/60 via-zinc-950 to-zinc-950 p-8 sm:p-12">
      {/* 워터마크 */}
      <span className="pointer-events-none absolute -bottom-12 -right-4 select-none text-[10rem] font-black leading-none text-violet-500/[0.06] sm:text-[14rem]">
        결론
      </span>

      <div className="relative space-y-8">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          5단계 검증 완료
        </p>

        {/* 거대 결론 한 줄 */}
        <h2 className="text-3xl font-black leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {hookLine ? (
            <>“{hookLine}”</>
          ) : (
            <>당신의 아이디어는 {overallPct}% 됐다.</>
          )}
        </h2>

        {/* 압축 요약 */}
        <div className="grid gap-4 border-y border-white/10 py-6 sm:grid-cols-3">
          <SummaryStat
            label="검증된 모델"
            value={
              primary.valuationUsd
                ? `$${(primary.valuationUsd / 1e9).toFixed(1)}B`
                : primary.companyName
            }
            sub={primary.companyName}
          />
          <SummaryStat
            label="유사도"
            value={`${overallPct}%`}
            sub="DB 100건 벤치마크 매칭"
          />
          <SummaryStat
            label="검증 기간"
            value={years ? `${years}년` : "—"}
            sub={primary.foundedYear ? `${primary.foundedYear}년 시작` : ""}
          />
        </div>

        {/* "그래서 어떻게 시작?" → 실행 탭 안내 */}
        <p className="text-base leading-8 text-zinc-300 sm:text-lg">
          검증은 끝났습니다. <span className="font-bold text-white">팀원 모집공고</span>,{" "}
          <span className="font-bold text-white">커피챗 메시지</span>,{" "}
          <span className="font-bold text-white">투자자 체크리스트</span>{" "}
          3종이 이미 작성되어 있습니다.
        </p>

        {/* 실행 탭으로 이동 버튼 */}
        {onLaunch ? (
          <button
            type="button"
            onClick={onLaunch}
            className="group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-8 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)] transition-all hover:bg-emerald-300 hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.9)]"
          >
            실행 도구 보기
            <span className="text-base transition-transform group-hover:translate-x-1">→</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-white sm:text-3xl">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

/* ─── 회사 헤더: 로고 + 산업 + 설립년 ─────────────────── */
function CompanyHeader({
  company,
}: {
  company: BenchmarkData;
}) {
  // companyName → domain 추정 (소문자 + 특수문자 제거 + .com)
  const domainGuess = company.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const logoUrl = `https://logo.clearbit.com/${domainGuess}.com`;
  const [logoOk, setLogoOk] = useState(true);

  return (
    <div className="flex items-center gap-4">
      {logoOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={company.companyName}
          onError={() => setLogoOk(false)}
          className="h-12 w-12 rounded-xl bg-white object-contain p-1.5 shadow"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.10] text-lg font-black text-zinc-200">
          {company.companyName.charAt(0)}
        </div>
      )}
      <div>
        <p className="text-lg font-bold text-white">{company.companyName}</p>
        <p className="text-xs text-zinc-500">
          {company.industry ?? "-"}
          {company.foundedYear ? ` · ${company.foundedYear}년 설립` : ""}
        </p>
      </div>
    </div>
  );
}

/* ─── 4-stat 스트립 ─────────────────────────────────── */
function StatStrip({ company }: { company: BenchmarkData }) {
  const items: Array<{ label: string; value: string } | null> = [
    company.valuationUsd
      ? {
          label: "현재 가치",
          value: `$${(company.valuationUsd / 1e9).toFixed(1)}B`,
        }
      : null,
    company.totalFundingUsd
      ? {
          label: "누적 펀딩",
          value: `$${(company.totalFundingUsd / 1e6).toFixed(0)}M`,
        }
      : null,
    company.foundedYear
      ? {
          label: "창업~현재",
          value: `${new Date().getFullYear() - company.foundedYear}년`,
        }
      : null,
    company.mvpFeatures.length > 0
      ? { label: "초기 MVP 기능", value: `${company.mvpFeatures.length}개` }
      : null,
  ];
  const valid = items.filter((i): i is { label: string; value: string } => i !== null);
  if (valid.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
      {valid.map((item) => (
        <div key={item.label} className="bg-zinc-950 p-4">
          <p className="text-[0.65rem] uppercase tracking-wider text-zinc-500">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── 타임라인 바 (창업~현재) ─────────────────────────── */
function TimelineBar({ foundedYear }: { foundedYear: number }) {
  const now = new Date().getFullYear();
  const years = now - foundedYear;
  // 30년 기준 막대 (대부분 회사가 30년 안)
  const pct = Math.min(100, (years / 30) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-xs text-zinc-500">
        <span>{foundedYear}</span>
        <span className="font-semibold text-zinc-400">{years}년</span>
        <span>{now}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── 송곳 전략 흐름도 ─────────────────────────────── */
function WedgeFlow({
  companyName,
  beachheadMarket,
  initialChannel,
  initialMethod,
  koreanAdaptation,
}: {
  companyName: string;
  beachheadMarket: string | null;
  initialChannel: string | null;
  initialMethod: string | null;
  koreanAdaptation?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        {/* 좌: 해외 원본 */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-zinc-700 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-zinc-200">
              해외
            </span>
            <span className="text-sm font-bold text-white">{companyName}</span>
          </div>
          <div className="space-y-3 text-sm leading-7 text-zinc-300">
            {beachheadMarket ? (
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  송곳 시장
                </p>
                <p className="mt-0.5">{beachheadMarket}</p>
              </div>
            ) : null}
            {initialChannel ? (
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  첫 100명 채널
                </p>
                <p className="mt-0.5">{initialChannel}</p>
              </div>
            ) : null}
            {initialMethod ? (
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                  실제 방법
                </p>
                <p className="mt-0.5">{initialMethod}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* 화살표 */}
        <div className="flex items-center justify-center">
          <div className="hidden lg:block">
            <svg className="h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
            </svg>
          </div>
          <div className="lg:hidden flex w-full items-center justify-center py-2">
            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* 우: 한국 적용 */}
        <div className="rounded-xl border border-white/15 bg-white/[0.10]/[0.08] p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-white/[0.10] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white">
              한국
            </span>
            <span className="text-sm font-bold text-white">변형 적용</span>
          </div>
          {koreanAdaptation ? (
            <p className="text-sm leading-7 text-white">{koreanAdaptation}</p>
          ) : (
            <p className="text-sm text-zinc-500">한국 적용 전략 생성 중...</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 피벗 BEFORE / AFTER ─────────────────────────── */
function PivotBeforeAfter({
  companyName,
  pivotMoment,
  shortcutKo,
}: {
  companyName: string;
  pivotMoment: string | null;
  shortcutKo?: string;
}) {
  return (
    <div className="space-y-4">
      {/* BEFORE */}
      {pivotMoment ? (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.04] p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-rose-300">
              ⚠ Before
            </span>
            <span className="text-xs text-zinc-500">{companyName}이 죽을 뻔했던 순간</span>
          </div>
          <p className="mt-3 text-base leading-7 text-zinc-300 sm:text-lg">
            {pivotMoment}
          </p>
        </div>
      ) : null}

      {/* 화살표 */}
      <div className="flex justify-center">
        <svg className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* AFTER */}
      {shortcutKo ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.10]/[0.06] p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/[0.10] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-200">
              ✓ After
            </span>
            <span className="text-xs text-zinc-500">한국 창업자가 바로 갈 정답</span>
          </div>
          <p className="mt-3 text-base leading-7 text-white sm:text-lg">
            {shortcutKo}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Datum({ label, big, sub }: { label: string; big: string; sub?: string }) {
  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-5xl font-black tracking-tight text-white sm:text-6xl">
        {big}
      </p>
      {sub ? <p className="mt-1 text-sm text-zinc-400">{sub}</p> : null}
    </div>
  );
}

function Chapter({
  num,
  eyebrow,
  hero,
  evidence,
  link,
  linkLabel,
  children,
}: {
  num: string;
  eyebrow: string;
  hero?: string;
  evidence?: string;
  link?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative space-y-8">
      <div className="pointer-events-none absolute -top-2 -left-2 select-none text-7xl font-black leading-none text-white/[0.05] sm:text-9xl">
        {num}
      </div>

      <div className="relative pl-3 sm:pl-6">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-zinc-400">
          {eyebrow}
        </p>

        {hero ? (
          <h2 className="mt-3 text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl">
            “{hero}”
          </h2>
        ) : null}

        {children ? <div className="mt-8 max-w-prose">{children}</div> : null}

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.10]/[0.08] px-4 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/[0.10]/[0.15]"
          >
            📜 {linkLabel ?? "자료 보기"}
          </a>
        ) : null}

        {evidence ? (
          <p className="mt-8 border-t border-white/5 pt-4 text-xs text-zinc-500">
            DB 근거 · <span className="text-zinc-300">{evidence}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
