"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
      <div className="mb-5 border-b border-white/[0.06] pb-4">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

type ExpertCategory =
  | "DEVELOPER"
  | "FRONTEND_DEV"
  | "BACKEND_DEV"
  | "FULLSTACK_DEV"
  | "MOBILE_DEV"
  | "AI_DEV"
  | "DEVOPS"
  | "DATA_ENGINEER"
  | "DESIGNER"
  | "UI_UX_DESIGNER"
  | "GRAPHIC_DESIGNER"
  | "MARKETER"
  | "GROWTH_MARKETER"
  | "CONTENT_MARKETER"
  | "AC_MENTOR"
  | "PLANNER"
  | "PM"
  | "BUSINESS_DEV"
  | "LAWYER"
  | "ACCOUNTANT"
  | "OTHER";

const CATEGORY_OPTIONS: Array<{ value: ExpertCategory; label: string; group: string }> = [
  { value: "FRONTEND_DEV", label: "프론트엔드 개발자", group: "개발" },
  { value: "BACKEND_DEV", label: "백엔드 개발자", group: "개발" },
  { value: "FULLSTACK_DEV", label: "풀스택 개발자", group: "개발" },
  { value: "MOBILE_DEV", label: "모바일 개발자", group: "개발" },
  { value: "AI_DEV", label: "AI/ML 개발자", group: "개발" },
  { value: "DEVOPS", label: "DevOps·인프라", group: "개발" },
  { value: "DATA_ENGINEER", label: "데이터 엔지니어", group: "개발" },
  { value: "DEVELOPER", label: "개발자(일반)", group: "개발" },
  { value: "UI_UX_DESIGNER", label: "UI/UX 디자이너", group: "디자인" },
  { value: "GRAPHIC_DESIGNER", label: "그래픽·브랜드 디자이너", group: "디자인" },
  { value: "DESIGNER", label: "디자이너(일반)", group: "디자인" },
  { value: "GROWTH_MARKETER", label: "그로스 마케터", group: "마케팅" },
  { value: "CONTENT_MARKETER", label: "콘텐츠 마케터", group: "마케팅" },
  { value: "MARKETER", label: "마케터(일반)", group: "마케팅" },
  { value: "PLANNER", label: "기획자", group: "기획·운영" },
  { value: "PM", label: "PM", group: "기획·운영" },
  { value: "BUSINESS_DEV", label: "사업개발", group: "기획·운영" },
  { value: "AC_MENTOR", label: "AC·멘토", group: "전문가" },
  { value: "LAWYER", label: "법무·변호사", group: "전문가" },
  { value: "ACCOUNTANT", label: "세무·회계", group: "전문가" },
  { value: "OTHER", label: "기타", group: "기타" },
];

type WorkMode = "REMOTE" | "HYBRID" | "ONSITE";
type Career = { company: string; role: string; period: string; summary: string };
type PortfolioItem = { title: string; role: string; stack: string[]; summary: string; url: string };
type Education = { school: string; degree: string; period: string };
type Certification = { name: string; issuer: string; year: string };

type Profile = {
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
  workMode: WorkMode | null;
  languages: string[];
  industries: string[];
  careers: Career[];
  portfolioItems: PortfolioItem[];
  education: Education[];
  certifications: Certification[];
  available: boolean;
};

const EMPTY: Profile = {
  category: "FRONTEND_DEV",
  headline: "",
  bio: "",
  skills: [],
  hourlyRateMin: null,
  hourlyRateMax: null,
  links: [],
  location: "",
  yearsOfExperience: null,
  availability: "",
  workMode: null,
  languages: [],
  industries: [],
  careers: [],
  portfolioItems: [],
  education: [],
  certifications: [],
  available: true,
};

const WORK_MODE_LABEL: Record<WorkMode, string> = {
  REMOTE: "원격",
  HYBRID: "하이브리드",
  ONSITE: "오피스",
};

export default function ExpertEditPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<Profile>(EMPTY);
  const [skillInput, setSkillInput] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [langInput, setLangInput] = useState("");
  const [industryInput, setIndustryInput] = useState("");
  const [careerDraft, setCareerDraft] = useState<Career>({ company: "", role: "", period: "", summary: "" });
  const [pfDraft, setPfDraft] = useState<PortfolioItem>({ title: "", role: "", stack: [], summary: "", url: "" });
  const [pfStackInput, setPfStackInput] = useState("");
  const [eduDraft, setEduDraft] = useState<Education>({ school: "", degree: "", period: "" });
  const [certDraft, setCertDraft] = useState<Certification>({ name: "", issuer: "", year: "" });
  const [hasAvatar, setHasAvatar] = useState(false);
  const [avatarBust, setAvatarBust] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ profile: (Profile & { hasAvatar?: boolean }) | null }>("GET", "/api/experts/me", undefined, token)
      .then((res) => {
        if (cancelled) return;
        if (res.profile) {
          const p = res.profile as Partial<Profile> & { hasAvatar?: boolean };
          setForm({
            ...EMPTY,
            ...p,
            skills: Array.isArray(p.skills) ? p.skills : [],
            links: Array.isArray(p.links) ? p.links : [],
            languages: Array.isArray(p.languages) ? p.languages : [],
            industries: Array.isArray(p.industries) ? p.industries : [],
            careers: Array.isArray(p.careers) ? p.careers : [],
            portfolioItems: Array.isArray(p.portfolioItems) ? p.portfolioItems : [],
            education: Array.isArray(p.education) ? p.education : [],
            certifications: Array.isArray(p.certifications) ? p.certifications : [],
            location: p.location ?? "",
            availability: p.availability ?? "",
          });
          setHasAvatar(!!p.hasAvatar);
        }
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "프로필 불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("사진은 5MB 이하만 올릴 수 있습니다.");
      return;
    }
    setAvatarBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/experts/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "사진 업로드 실패");
      }
      setHasAvatar(true);
      setAvatarBust(Date.now());
    } catch (caught) {
      setError(readError(caught, "사진 업로드 실패"));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarRemove() {
    if (!token) return;
    setAvatarBusy(true);
    setError("");
    try {
      await api("DELETE", "/api/experts/me/avatar", undefined, token);
      setHasAvatar(false);
      setAvatarBust(Date.now());
    } catch (caught) {
      setError(readError(caught, "사진 삭제 실패"));
    } finally {
      setAvatarBusy(false);
    }
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || form.skills.includes(s)) return;
    setForm({ ...form, skills: [...form.skills, s] });
    setSkillInput("");
  }
  function removeSkill(s: string) {
    setForm({ ...form, skills: form.skills.filter((x) => x !== s) });
  }
  function addLink() {
    const label = linkLabel.trim();
    const url = linkUrl.trim();
    if (!label || !url) return;
    setForm({ ...form, links: [...form.links, { label, url }] });
    setLinkLabel("");
    setLinkUrl("");
  }
  function removeLink(idx: number) {
    setForm({ ...form, links: form.links.filter((_, i) => i !== idx) });
  }

  function addLang() {
    const v = langInput.trim();
    if (!v || form.languages.includes(v)) return;
    setForm({ ...form, languages: [...form.languages, v] });
    setLangInput("");
  }
  function removeLang(v: string) {
    setForm({ ...form, languages: form.languages.filter((x) => x !== v) });
  }

  function addIndustry() {
    const v = industryInput.trim();
    if (!v || form.industries.includes(v)) return;
    setForm({ ...form, industries: [...form.industries, v] });
    setIndustryInput("");
  }
  function removeIndustry(v: string) {
    setForm({ ...form, industries: form.industries.filter((x) => x !== v) });
  }

  function addCareer() {
    if (!careerDraft.company.trim() || !careerDraft.role.trim()) return;
    setForm({ ...form, careers: [...form.careers, careerDraft] });
    setCareerDraft({ company: "", role: "", period: "", summary: "" });
  }
  function removeCareer(idx: number) {
    setForm({ ...form, careers: form.careers.filter((_, i) => i !== idx) });
  }

  function addPfStack() {
    const v = pfStackInput.trim();
    if (!v || pfDraft.stack.includes(v)) return;
    setPfDraft({ ...pfDraft, stack: [...pfDraft.stack, v] });
    setPfStackInput("");
  }
  function addPortfolio() {
    if (!pfDraft.title.trim()) return;
    setForm({ ...form, portfolioItems: [...form.portfolioItems, pfDraft] });
    setPfDraft({ title: "", role: "", stack: [], summary: "", url: "" });
  }
  function removePortfolio(idx: number) {
    setForm({ ...form, portfolioItems: form.portfolioItems.filter((_, i) => i !== idx) });
  }

  function addEducation() {
    if (!eduDraft.school.trim()) return;
    setForm({ ...form, education: [...form.education, eduDraft] });
    setEduDraft({ school: "", degree: "", period: "" });
  }
  function removeEducation(idx: number) {
    setForm({ ...form, education: form.education.filter((_, i) => i !== idx) });
  }

  function addCert() {
    if (!certDraft.name.trim()) return;
    setForm({ ...form, certifications: [...form.certifications, certDraft] });
    setCertDraft({ name: "", issuer: "", year: "" });
  }
  function removeCert(idx: number) {
    setForm({ ...form, certifications: form.certifications.filter((_, i) => i !== idx) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api("PUT", "/api/experts/me", form, token);
      setSuccess("저장되었습니다. /talent 페이지에 반영됩니다.");
      setTimeout(() => {
        if (user?.id) router.push(`/u/${user.id}`);
      }, 700);
    } catch (caught) {
      setError(readError(caught, "저장 실패"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingState label="불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl space-y-8 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/mypage" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← 마이페이지
          </Link>
          <p className="eyebrow">전문가 프로필</p>
          <h1 className="editorial-h2 text-white">내 프로필 등록·수정</h1>
          <p className="text-sm text-zinc-400">
            경력·프로젝트·도메인 경험까지 자세히 입력할수록 매칭 확률이 올라갑니다. /talent 그리드와 공개 프로필에 반영됩니다.
          </p>
        </header>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-zinc-200">
            {success}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Section
            title="기본 정보"
            description="검색 결과·전문가 카드에 가장 먼저 노출되는 정보입니다."
          >
            {/* 프로필 사진 */}
            <div>
              <label className="field-label">프로필 사진</label>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04]"
                >
                  {hasAvatar && user?.id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")}/api/experts/${user.id}/avatar?v=${avatarBust}`}
                      alt="프로필 사진"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-zinc-500">사진 없음</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="btn-secondary inline-flex cursor-pointer items-center px-4 py-2 text-sm">
                    {hasAvatar ? "사진 변경" : "사진 올리기"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarBusy}
                    />
                  </label>
                  {hasAvatar ? (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={avatarBusy}
                      className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
                    >
                      사진 제거
                    </button>
                  ) : null}
                  <p className="text-[0.7rem] text-zinc-500">JPG·PNG·WebP · 최대 5MB · 정사각형 권장</p>
                </div>
              </div>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="field-label">주요 카테고리 *</label>
              <select
                className="select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpertCategory })}
              >
                {Array.from(new Set(CATEGORY_OPTIONS.map((c) => c.group))).map((group) => (
                  <optgroup key={group} label={group}>
                    {CATEGORY_OPTIONS.filter((c) => c.group === group).map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* 한 줄 소개 */}
            <div>
              <label className="field-label">한 줄 소개 * (5자 이상)</label>
              <input
                className="input"
                placeholder="예: React·Next.js 풀스택 5년차, 핀테크/B2B SaaS 경험"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                maxLength={120}
              />
            </div>

            {/* 자세한 소개 */}
            <div>
              <label className="field-label">자세한 소개 * (10자 이상, 마크다운 가능)</label>
              <textarea
                className="textarea min-h-[180px]"
                placeholder="해온 프로젝트, 강점, 협업 스타일 등을 자유롭게 적어주세요."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
          </Section>

          <Section
            title="전문성·근무 조건"
            description="스킬·시급·가용성·근무 형태를 입력하면 매칭 정확도가 올라갑니다."
          >
          {/* 스킬 태그 */}
          <div>
            <label className="field-label">스킬 태그</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="예: React, TypeScript, Figma"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <button type="button" onClick={addSkill} className="btn-secondary px-4 py-2 text-sm">
                추가
              </button>
            </div>
            {form.skills.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="rounded bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-200 ring-1 ring-white/10 hover:bg-rose-500/10 hover:text-rose-200 hover:ring-rose-400/30"
                    title="클릭해서 제거"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* 시급 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">시급 최소 (원)</label>
              <input
                type="number"
                className="input"
                placeholder="50000"
                value={form.hourlyRateMin ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hourlyRateMin: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div>
              <label className="field-label">시급 최대 (원)</label>
              <input
                type="number"
                className="input"
                placeholder="100000"
                value={form.hourlyRateMax ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hourlyRateMax: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          {/* 위치 + 경력 + 가용성 + 근무 형태 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">위치</label>
              <input
                className="input"
                placeholder="예: 서울, 부산, 원격"
                value={form.location ?? ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">경력 연차</label>
              <input
                type="number"
                className="input"
                placeholder="예: 5"
                min={0}
                max={60}
                value={form.yearsOfExperience ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    yearsOfExperience: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div>
              <label className="field-label">가용성</label>
              <input
                className="input"
                placeholder="예: 풀타임 / 주 20시간 / 주말만"
                value={form.availability ?? ""}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">근무 형태</label>
              <select
                className="select"
                value={form.workMode ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workMode: (e.target.value || null) as WorkMode | null,
                  })
                }
              >
                <option value="">선택 안 함</option>
                <option value="REMOTE">원격</option>
                <option value="HYBRID">하이브리드</option>
                <option value="ONSITE">오피스</option>
              </select>
            </div>
          </div>

          {/* 사용 언어 */}
          <div>
            <label className="field-label">사용 언어</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="예: 한국어, 영어, 일본어"
                value={langInput}
                onChange={(e) => setLangInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLang();
                  }
                }}
              />
              <button type="button" onClick={addLang} className="btn-secondary px-4 py-2 text-sm">
                추가
              </button>
            </div>
            {form.languages.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.languages.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => removeLang(s)}
                    className="rounded bg-white/[0.05] px-2 py-0.5 text-xs text-zinc-200 ring-1 ring-white/10 hover:bg-rose-500/10 hover:text-rose-200"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* 도메인 경험 */}
          <div>
            <label className="field-label">도메인·산업 경험</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="예: 핀테크, B2B SaaS, 이커머스, 헬스케어"
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIndustry();
                  }
                }}
              />
              <button type="button" onClick={addIndustry} className="btn-secondary px-4 py-2 text-sm">
                추가
              </button>
            </div>
            {form.industries.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.industries.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => removeIndustry(s)}
                    className="rounded bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-200 ring-1 ring-white/10 hover:bg-rose-500/10 hover:text-rose-200"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          </Section>

          <Section
            title="경력·포트폴리오"
            description="구체적인 경력과 프로젝트가 협업 요청을 받을 확률을 크게 높입니다."
          >
          {/* 경력 이력 */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 space-y-3">
            <label className="field-label">경력 이력</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="input"
                placeholder="회사명 *"
                value={careerDraft.company}
                onChange={(e) => setCareerDraft({ ...careerDraft, company: e.target.value })}
              />
              <input
                className="input"
                placeholder="직무 *"
                value={careerDraft.role}
                onChange={(e) => setCareerDraft({ ...careerDraft, role: e.target.value })}
              />
              <input
                className="input sm:col-span-2"
                placeholder="기간 (예: 2022.03 ~ 현재)"
                value={careerDraft.period}
                onChange={(e) => setCareerDraft({ ...careerDraft, period: e.target.value })}
              />
              <textarea
                className="textarea sm:col-span-2"
                rows={2}
                placeholder="주요 성과·담당 업무 (예: 신규 결제 모듈 설계, MAU 30만 달성)"
                value={careerDraft.summary}
                onChange={(e) => setCareerDraft({ ...careerDraft, summary: e.target.value })}
              />
            </div>
            <button type="button" onClick={addCareer} className="btn-secondary px-4 py-2 text-sm">
              경력 추가
            </button>
            {form.careers.length > 0 ? (
              <ul className="space-y-2">
                {form.careers.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0 text-sm">
                      <p className="font-bold text-white">
                        {c.company} <span className="ml-1 text-zinc-400">· {c.role}</span>
                      </p>
                      {c.period ? <p className="text-xs text-zinc-500">{c.period}</p> : null}
                      {c.summary ? <p className="mt-1 text-xs text-zinc-300 whitespace-pre-wrap">{c.summary}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCareer(i)}
                      className="shrink-0 text-xs text-rose-300 hover:text-rose-200"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 대표 프로젝트 */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 space-y-3">
            <label className="field-label">대표 프로젝트·포트폴리오</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="input"
                placeholder="제목 *"
                value={pfDraft.title}
                onChange={(e) => setPfDraft({ ...pfDraft, title: e.target.value })}
              />
              <input
                className="input"
                placeholder="역할 (예: 리드 개발)"
                value={pfDraft.role}
                onChange={(e) => setPfDraft({ ...pfDraft, role: e.target.value })}
              />
              <input
                className="input sm:col-span-2"
                placeholder="URL (선택)"
                value={pfDraft.url}
                onChange={(e) => setPfDraft({ ...pfDraft, url: e.target.value })}
              />
              <textarea
                className="textarea sm:col-span-2"
                rows={2}
                placeholder="간단한 설명·성과"
                value={pfDraft.summary}
                onChange={(e) => setPfDraft({ ...pfDraft, summary: e.target.value })}
              />
              <div className="sm:col-span-2">
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="기술 스택 (Enter로 추가)"
                    value={pfStackInput}
                    onChange={(e) => setPfStackInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPfStack();
                      }
                    }}
                  />
                  <button type="button" onClick={addPfStack} className="btn-ghost px-3 py-2 text-xs">
                    +스택
                  </button>
                </div>
                {pfDraft.stack.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {pfDraft.stack.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[0.65rem] text-zinc-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <button type="button" onClick={addPortfolio} className="btn-secondary px-4 py-2 text-sm">
              프로젝트 추가
            </button>
            {form.portfolioItems.length > 0 ? (
              <ul className="space-y-2">
                {form.portfolioItems.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0 text-sm">
                      <p className="font-bold text-white">
                        {p.title}
                        {p.role ? <span className="ml-1 text-zinc-400"> · {p.role}</span> : null}
                      </p>
                      {p.summary ? <p className="text-xs text-zinc-300">{p.summary}</p> : null}
                      {p.stack.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.stack.map((s) => (
                            <span key={s} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[0.65rem] text-zinc-300">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-zinc-400 hover:underline"
                        >
                          {p.url} ↗
                        </a>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePortfolio(i)}
                      className="shrink-0 text-xs text-rose-300 hover:text-rose-200"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 학력 */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 space-y-3">
            <label className="field-label">학력</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                className="input"
                placeholder="학교 *"
                value={eduDraft.school}
                onChange={(e) => setEduDraft({ ...eduDraft, school: e.target.value })}
              />
              <input
                className="input"
                placeholder="학위·전공"
                value={eduDraft.degree}
                onChange={(e) => setEduDraft({ ...eduDraft, degree: e.target.value })}
              />
              <input
                className="input"
                placeholder="기간 (2018~2022)"
                value={eduDraft.period}
                onChange={(e) => setEduDraft({ ...eduDraft, period: e.target.value })}
              />
            </div>
            <button type="button" onClick={addEducation} className="btn-secondary px-4 py-2 text-sm">
              학력 추가
            </button>
            {form.education.length > 0 ? (
              <ul className="space-y-1.5">
                {form.education.map((ed, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-bold text-white">{ed.school}</span>
                      {ed.degree ? <span className="ml-1 text-zinc-400">· {ed.degree}</span> : null}
                      {ed.period ? <span className="ml-1 text-xs text-zinc-500">({ed.period})</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEducation(i)}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 자격증·수상 */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 space-y-3">
            <label className="field-label">자격증·수상</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                className="input"
                placeholder="이름 *"
                value={certDraft.name}
                onChange={(e) => setCertDraft({ ...certDraft, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="발급 기관"
                value={certDraft.issuer}
                onChange={(e) => setCertDraft({ ...certDraft, issuer: e.target.value })}
              />
              <input
                className="input"
                placeholder="연도"
                value={certDraft.year}
                onChange={(e) => setCertDraft({ ...certDraft, year: e.target.value })}
              />
            </div>
            <button type="button" onClick={addCert} className="btn-secondary px-4 py-2 text-sm">
              자격증 추가
            </button>
            {form.certifications.length > 0 ? (
              <ul className="space-y-1.5">
                {form.certifications.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-bold text-white">{c.name}</span>
                      {c.issuer ? <span className="ml-1 text-zinc-400">· {c.issuer}</span> : null}
                      {c.year ? <span className="ml-1 text-xs text-zinc-500">({c.year})</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCert(i)}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          </Section>

          <Section
            title="링크·공개 설정"
            description="GitHub·LinkedIn 등을 추가해서 신뢰도를 높이세요."
          >
          {/* 링크 */}
          <div>
            <label className="field-label">포트폴리오·링크</label>
            <div className="flex gap-2">
              <input
                className="input w-32"
                placeholder="라벨 (GitHub)"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
              />
              <input
                className="input flex-1"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <button type="button" onClick={addLink} className="btn-secondary px-4 py-2 text-sm">
                추가
              </button>
            </div>
            {form.links.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {form.links.map((l, i) => (
                  <li
                    key={`${l.url}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <span>
                      <span className="font-bold text-white">{l.label}</span>
                      <span className="ml-2 text-zinc-500">{l.url}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="text-rose-300 hover:text-rose-200"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 활동 여부 */}
          <div className="flex items-center gap-2">
            <input
              id="available"
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="available" className="text-sm text-zinc-300">
              영입 가능 (체크 해제 시 그리드에서 숨김)
            </label>
          </div>

          </Section>

          {/* 저장 */}
          <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur">
            <Link href="/talent" className="btn-ghost px-6 py-2.5">
              취소
            </Link>
            <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
