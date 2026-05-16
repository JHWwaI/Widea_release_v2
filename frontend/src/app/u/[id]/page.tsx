"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/ProductUI";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";
import SendCollabRequestButton from "@/components/SendCollabRequestButton";

type ExpertCategory = string;

type Career = { company: string; role: string; period: string; summary: string };
type PortfolioItem = { title: string; role: string; stack: string[]; summary: string; url: string };
type Education = { school: string; degree: string; period: string };
type Certification = { name: string; issuer: string; year: string };

type Profile = {
  id: string;
  userId: string;
  category: ExpertCategory;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  links: Array<{ label: string; url: string }>;
  location: string | null;
  yearsOfExperience: number | null;
  availability: string | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  languages: string[];
  industries: string[];
  careers: Career[];
  portfolioItems: PortfolioItem[];
  education: Education[];
  certifications: Certification[];
  available: boolean;
  viewCount: number;
};

type User = { id: string; name: string | null; email: string; createdAt: string };

const CATEGORY_LABEL: Record<string, string> = {
  DEVELOPER: "개발자(일반)",
  FRONTEND_DEV: "프론트엔드 개발자",
  BACKEND_DEV: "백엔드 개발자",
  FULLSTACK_DEV: "풀스택 개발자",
  MOBILE_DEV: "모바일 개발자",
  AI_DEV: "AI/ML 개발자",
  DEVOPS: "DevOps·인프라",
  DATA_ENGINEER: "데이터 엔지니어",
  DESIGNER: "디자이너(일반)",
  UI_UX_DESIGNER: "UI/UX 디자이너",
  GRAPHIC_DESIGNER: "그래픽·브랜드 디자이너",
  MARKETER: "마케터(일반)",
  GROWTH_MARKETER: "그로스 마케터",
  CONTENT_MARKETER: "콘텐츠 마케터",
  AC_MENTOR: "AC·멘토",
  PLANNER: "기획자",
  PM: "PM",
  BUSINESS_DEV: "사업개발",
  LAWYER: "법무·변호사",
  ACCOUNTANT: "세무·회계",
  OTHER: "기타",
};

const WORK_MODE_LABEL: Record<string, string> = {
  REMOTE: "원격",
  HYBRID: "하이브리드",
  ONSITE: "오피스",
};

export default function UserProfilePage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<{ profile: Profile; user: User }>("GET", `/api/experts/${id}`)
      .then((res) => {
        if (cancelled) return;
        setProfile(res.profile);
        setUser(res.user);
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "프로필 불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingState label="프로필 불러오는 중..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-4">
        <p className="text-sm text-rose-300">{error || "프로필을 찾을 수 없습니다."}</p>
        <Link href="/talent" className="btn-primary">전문가 목록으로</Link>
      </div>
    );
  }

  function formatRate(min: number | null, max: number | null) {
    if (min == null && max == null) return "협의";
    const fmt = (n: number) => `${(n / 10000).toLocaleString()}만`;
    if (min != null && max != null) return `${fmt(min)} ~ ${fmt(max)}원/시간`;
    if (min != null) return `${fmt(min)}원~/시간`;
    return `~${fmt(max!)}원/시간`;
  }

  return (
    <div className="fade-up pb-12">
      <Link href="/talent" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← 전문가 목록
      </Link>

      {/* 사람인 스타일 이력서 */}
      <article className="mt-6 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
        {/* ── 헤더: 이력서 제목 ── */}
        <div className="border-b-2 border-white/15 bg-white/[0.03] px-6 py-4 sm:px-8">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">RESUME / 이력서</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {user?.name || "익명 전문가"}
            </h1>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${
                profile.available
                  ? "bg-white/[0.08] text-zinc-100 ring-white/20"
                  : "bg-white/[0.03] text-zinc-500 ring-white/10"
              }`}
            >
              {profile.available ? "영입 가능" : "비활성"}
            </span>
          </div>
        </div>

        {/* ── 인적사항 (Field-Value 테이블) ── */}
        <Section label="인적사항">
          <Row label="지원분야" value={CATEGORY_LABEL[profile.category] ?? profile.category} />
          {typeof profile.yearsOfExperience === "number" ? <Row label="경력" value={`${profile.yearsOfExperience}년차`} /> : null}
          {profile.location ? <Row label="거주지" value={profile.location} /> : null}
          {profile.workMode ? <Row label="근무 형태" value={WORK_MODE_LABEL[profile.workMode] ?? profile.workMode} /> : null}
          <Row label="희망 보수" value={formatRate(profile.hourlyRateMin, profile.hourlyRateMax)} />
          {profile.availability ? <Row label="참여 가능 시점" value={profile.availability} /> : null}
          {user?.email ? <Row label="이메일" value={user.email} mono /> : null}
        </Section>

        {/* ── 한 줄 소개 ── */}
        {profile.headline ? (
          <Section label="한 줄 소개">
            <p className="px-6 py-4 text-sm leading-relaxed text-zinc-100 sm:px-8">{profile.headline}</p>
          </Section>
        ) : null}

        {/* ── 자기소개서 ── */}
        {profile.bio ? (
          <Section label="자기소개서">
            <p className="whitespace-pre-wrap px-6 py-4 text-sm leading-7 text-zinc-200 sm:px-8">{profile.bio}</p>
          </Section>
        ) : null}

        {/* ── 경력사항 ── */}
        {profile.careers && profile.careers.length > 0 ? (
          <Section label="경력사항">
            <table className="w-full text-sm">
              <tbody>
                {profile.careers.map((c, i) => (
                  <tr key={i} className="border-b border-white/[0.05] last:border-b-0">
                    <td className="w-[180px] px-6 py-3 align-top text-xs text-zinc-500 sm:px-8">{c.period || "—"}</td>
                    <td className="px-6 py-3 align-top sm:px-8">
                      <p className="font-semibold text-white">{c.company}</p>
                      {c.role ? <p className="text-xs text-zinc-400">{c.role}</p> : null}
                      {c.summary ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{c.summary}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ) : null}

        {/* ── 대표 프로젝트 ── */}
        {profile.portfolioItems && profile.portfolioItems.length > 0 ? (
          <Section label="대표 프로젝트">
            <div className="divide-y divide-white/[0.05]">
              {profile.portfolioItems.map((p, i) => (
                <div key={i} className="px-6 py-3 sm:px-8">
                  <p className="font-semibold text-white">
                    {p.title}
                    {p.role ? <span className="ml-2 text-xs font-normal text-zinc-400">{p.role}</span> : null}
                  </p>
                  {p.summary ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{p.summary}</p>
                  ) : null}
                  {p.stack && p.stack.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.stack.map((s) => (
                        <span key={s} className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[0.65rem] text-zinc-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-zinc-400 hover:text-zinc-200 hover:underline">
                      프로젝트 링크 ↗
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── 학력 ── */}
        {profile.education && profile.education.length > 0 ? (
          <Section label="학력">
            <table className="w-full text-sm">
              <tbody>
                {profile.education.map((ed, i) => (
                  <tr key={i} className="border-b border-white/[0.05] last:border-b-0">
                    <td className="w-[180px] px-6 py-3 align-top text-xs text-zinc-500 sm:px-8">{ed.period || "—"}</td>
                    <td className="px-6 py-3 align-top sm:px-8">
                      <p className="font-semibold text-white">{ed.school}</p>
                      {ed.degree ? <p className="mt-0.5 text-xs text-zinc-400">{ed.degree}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ) : null}

        {/* ── 자격증 · 수상 ── */}
        {profile.certifications && profile.certifications.length > 0 ? (
          <Section label="자격증 · 수상">
            <table className="w-full text-sm">
              <tbody>
                {profile.certifications.map((c, i) => (
                  <tr key={i} className="border-b border-white/[0.05] last:border-b-0">
                    <td className="w-[180px] px-6 py-3 align-top text-xs text-zinc-500 sm:px-8">{c.year || "—"}</td>
                    <td className="px-6 py-3 align-top sm:px-8">
                      <p className="font-semibold text-white">{c.name}</p>
                      {c.issuer ? <p className="mt-0.5 text-xs text-zinc-400">{c.issuer}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ) : null}

        {/* ── 보유 기술 ── */}
        {profile.skills.length > 0 ? (
          <Section label="보유 기술">
            <div className="flex flex-wrap gap-1.5 px-6 py-4 sm:px-8">
              {profile.skills.map((s) => (
                <span key={s} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-100">
                  {s}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── 도메인 경험 ── */}
        {profile.industries && profile.industries.length > 0 ? (
          <Section label="도메인 경험">
            <div className="flex flex-wrap gap-1.5 px-6 py-4 sm:px-8">
              {profile.industries.map((s) => (
                <span key={s} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-100">
                  {s}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── 사용 가능 언어 ── */}
        {profile.languages && profile.languages.length > 0 ? (
          <Section label="사용 가능 언어">
            <div className="flex flex-wrap gap-1.5 px-6 py-4 sm:px-8">
              {profile.languages.map((s) => (
                <span key={s} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-100">
                  {s}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── 포트폴리오 · 링크 ── */}
        {profile.links.length > 0 ? (
          <Section label="포트폴리오 · 링크">
            <ul className="px-6 py-4 space-y-1.5 sm:px-8">
              {profile.links.map((l, i) => (
                <li key={`${l.url}-${i}`}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-baseline gap-2 text-sm text-zinc-200 hover:text-white"
                  >
                    <span className="font-medium">{l.label}</span>
                    <span className="truncate text-xs text-zinc-500">{l.url}</span>
                    <span className="text-xs text-zinc-500">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* ── 액션 ── */}
        <div className="bg-white/[0.03] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            {user?.email ? (
              <a
                href={`mailto:${user.email}`}
                className="rounded-md border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.12] hover:text-white"
              >
                이메일로 컨택
              </a>
            ) : null}
            <SendCollabRequestButton expertUserId={profile.userId} />
          </div>
        </div>
      </article>

      <p className="mt-6 text-center text-xs text-zinc-600">
        조회 {profile.viewCount}회
      </p>
    </div>
  );
}

/* 사람인 스타일 섹션 — 좌측 라벨 컬럼 + 우측 내용 */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 border-b border-white/[0.06] sm:grid-cols-[160px_1fr]">
      <div className="border-b border-white/[0.05] bg-white/[0.02] px-6 py-3 sm:border-b-0 sm:border-r sm:px-6 sm:py-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-300">{label}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex border-b border-white/[0.04] last:border-b-0">
      <div className="w-[120px] shrink-0 bg-white/[0.02] px-4 py-2.5 text-xs text-zinc-400 sm:w-[140px]">
        {label}
      </div>
      <div className={`flex-1 px-4 py-2.5 text-sm text-zinc-100 ${mono ? "font-mono text-[0.8125rem]" : ""}`}>
        {value}
      </div>
    </div>
  );
}
