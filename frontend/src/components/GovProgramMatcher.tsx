"use client";

import { useEffect, useState } from "react";
import { Badge, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

interface GovProgram {
  id: string;
  name: string;
  agency: string;
  programType: string;
  amount: { min: number; max: number };
  durationMonths: number;
  selfBurdenRatio?: number;
  description: string;
  applicationUrl: string;
  applicationFormSections: string[];
  cohortInfo: { typical: string; nextExpected?: string };
  bestFor?: string[];
  eligibility: { notes?: string };
}

interface Match {
  program: GovProgram;
  score: number;
  matchReasons: string[];
  missingRequirements: string[];
}

interface MatchResponse {
  ideaId: string;
  detectedKeywords: string[];
  targetMarket: string;
  matchedCount: number;
  totalAmountKRW: number;
  matches: Match[];
}

interface DraftSection {
  title: string;
  content: string;
}

interface DraftResponse {
  program: GovProgram;
  ideaId: string;
  draft: {
    sections: DraftSection[];
    overallTone?: string;
    submitChecklist?: string[];
  };
  generatedAt: string;
  creditUsed: number;
  creditBalance: number;
}

function formatKRW(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억원`;
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1).replace(/\.0$/, "")}천만원`;
  return `${n.toLocaleString("ko-KR")}원`;
}

export default function GovProgramMatcher({ ideaId }: { ideaId: string }) {
  const { token, updateCredit } = useAuth();
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftResponse>>({});

  useEffect(() => {
    if (!token || !ideaId) return;
    let cancelled = false;
    setLoading(true);
    api<MatchResponse>("GET", `/api/ideas/${ideaId}/gov-programs`, undefined, token)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(readError(e, "정부지원사업 매칭 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ideaId, token]);

  async function generateDraft(programId: string) {
    if (!token) return;
    setDrafting(programId);
    setError("");
    try {
      const result = await api<DraftResponse>(
        "POST", `/api/ideas/${ideaId}/gov-programs/${programId}/draft`,
        {}, token,
      );
      updateCredit(result.creditBalance);
      setDrafts((p) => ({ ...p, [programId]: result }));
      setOpenId(programId);
    } catch (e) {
      setError(readError(e, "신청서 자동 작성 실패"));
    } finally {
      setDrafting(null);
    }
  }

  if (loading) {
    return (
      <Surface className="space-y-2">
        <p className="eyebrow">정부지원사업 매칭</p>
        <p className="text-sm text-zinc-400">매칭 중입니다...</p>
      </Surface>
    );
  }

  if (error) {
    return (
      <Surface className="space-y-2 border-rose-500/30 bg-rose-500/10">
        <p className="text-sm text-rose-300">{error}</p>
      </Surface>
    );
  }

  if (!data || data.matches.length === 0) {
    return (
      <Surface className="space-y-2">
        <p className="eyebrow">정부지원사업 매칭</p>
        <p className="text-sm text-zinc-400">매칭되는 사업이 없습니다.</p>
      </Surface>
    );
  }

  return (
    <Surface className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">정부지원사업 자동 매칭</p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            받을 수 있는 지원금 — 최대 <span className="text-zinc-200">{formatKRW(data.totalAmountKRW)}</span>
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {data.matchedCount}건의 사업이 이 아이디어에 적합합니다 · 감지된 키워드: {data.detectedKeywords.join(", ") || "—"}
          </p>
        </div>
        <Badge tone="success">AI 매칭 점수 30점 이상</Badge>
      </div>

      {/* 매칭 카드 */}
      <div className="grid gap-3">
        {data.matches.map((m) => {
          const isOpen = openId === m.program.id;
          const draft = drafts[m.program.id];
          return (
            <div
              key={m.program.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/15"
            >
              {/* 카드 헤더 */}
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{m.program.name}</h3>
                      <span className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[0.65rem] font-semibold text-zinc-200">
                        매칭 {m.score}점
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">{m.program.agency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-200">{formatKRW(m.program.amount.max)}</p>
                    <p className="text-[0.65rem] text-zinc-500">최대 지원</p>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{m.program.description}</p>

                {/* 메타 정보 */}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[0.7rem]">
                  <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-400">
                    📅 {m.program.cohortInfo.typical}
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-400">
                    ⏱ {m.program.durationMonths}개월
                  </span>
                  {m.program.selfBurdenRatio ? (
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 text-zinc-200">
                      자부담 {Math.round(m.program.selfBurdenRatio * 100)}%
                    </span>
                  ) : (
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 text-zinc-200">
                      자부담 0%
                    </span>
                  )}
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-zinc-300">
                    {m.program.programType}
                  </span>
                </div>

                {/* 매칭 이유 */}
                {m.matchReasons.length > 0 ? (
                  <div className="mt-3 rounded-lg bg-white/[0.10]/5 p-2.5">
                    <p className="text-[0.7rem] font-semibold text-zinc-200">✓ 매칭 이유</p>
                    <ul className="mt-1 space-y-0.5">
                      {m.matchReasons.map((r) => (
                        <li key={r} className="text-xs text-zinc-300">· {r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* 미충족 요건 */}
                {m.missingRequirements.length > 0 ? (
                  <div className="mt-2 rounded-lg bg-white/[0.10]/5 p-2.5">
                    <p className="text-[0.7rem] font-semibold text-zinc-200">⚠ 추가 필요</p>
                    <ul className="mt-1 space-y-0.5">
                      {m.missingRequirements.map((r) => (
                        <li key={r} className="text-xs text-zinc-300">· {r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* 액션 버튼 */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => generateDraft(m.program.id)}
                    disabled={drafting === m.program.id}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {drafting === m.program.id
                      ? "AI 작성 중..."
                      : draft
                        ? "✓ 작성 완료 — 다시 보기"
                        : "🤖 AI로 신청서 자동 작성 (3 cr)"}
                  </button>
                  <a
                    href={m.program.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    공식 공고 →
                  </a>
                  {draft ? (
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : m.program.id)}
                      className="btn-ghost px-3 py-2 text-sm"
                    >
                      {isOpen ? "접기" : "펼치기"}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* 드래프트 결과 */}
              {isOpen && draft ? (
                <div className="border-t border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">📄 자동 작성된 신청서 초안</p>
                      <p className="text-[0.7rem] text-zinc-500">
                        생성: {new Date(draft.generatedAt).toLocaleString("ko-KR")} · 사용 크레딧: {draft.creditUsed} cr
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const text = draft.draft.sections
                          .map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.content}`)
                          .join("\n\n---\n\n");
                        navigator.clipboard.writeText(text);
                      }}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      📋 전체 복사
                    </button>
                  </div>

                  {draft.draft.overallTone ? (
                    <p className="text-xs italic text-zinc-400">
                      💡 톤: {draft.draft.overallTone}
                    </p>
                  ) : null}

                  <div className="space-y-3">
                    {draft.draft.sections.map((s, i) => (
                      <details
                        key={i}
                        open={i === 0}
                        className="group rounded-lg border border-white/10 bg-white/[0.03]"
                      >
                        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-zinc-100 group-open:border-b group-open:border-white/10">
                          <span className="mr-2 text-zinc-200">{i + 1}.</span>{s.title}
                        </summary>
                        <div className="px-3 py-3 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                          {s.content}
                        </div>
                      </details>
                    ))}
                  </div>

                  {draft.draft.submitChecklist && draft.draft.submitChecklist.length > 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-white/[0.10]/5 p-3">
                      <p className="text-xs font-semibold text-zinc-200">✅ 제출 전 체크리스트</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {draft.draft.submitChecklist.map((c, i) => (
                          <li key={i} className="text-xs text-zinc-300">· {c}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-[0.7rem] leading-relaxed text-zinc-500">
        ⓘ 매칭 점수는 AI 추정치이며 최종 자격 요건은 각 기관 공고를 반드시 확인하세요. 신청서 초안은 AI가 사용자 데이터를 기반으로 작성한 80% 자동화 결과물이며, 제출 전 사람의 검토가 필요합니다.
      </p>
    </Surface>
  );
}
