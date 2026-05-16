"use client";

import Link from "next/link";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError, userTypeLabels, userTypeOptions } from "@/lib/product";

export default function ProfileEditPage() {
  const { token, user, setUserType, refreshUser } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: "", ok: true });

  const [roleChanging, setRoleChanging] = useState(false);
  const [roleMsg, setRoleMsg] = useState({ text: "", ok: true });

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setProfileSaving(true);
    setProfileMsg({ text: "", ok: true });
    try {
      const body: Record<string, string> = {};
      if (profileForm.name.trim()) body.name = profileForm.name.trim();
      if (profileForm.newPassword) {
        body.currentPassword = profileForm.currentPassword;
        body.newPassword = profileForm.newPassword;
      }
      if (Object.keys(body).length === 0) {
        setProfileMsg({ text: "변경할 내용을 입력해주세요.", ok: false });
        return;
      }
      await api("PATCH", "/api/auth/me", body, token);
      await refreshUser();
      setProfileMsg({ text: "저장됐습니다.", ok: true });
      setProfileForm({ name: "", currentPassword: "", newPassword: "" });
    } catch (caught) {
      setProfileMsg({ text: readError(caught, "저장에 실패했습니다."), ok: false });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleRoleChange(newType: string) {
    if (!token || newType === user?.userType) return;
    setRoleChanging(true);
    setRoleMsg({ text: "", ok: true });
    try {
      await setUserType(newType);
      setRoleMsg({ text: "역할이 변경되었습니다.", ok: true });
    } catch {
      setRoleMsg({ text: "역할 변경에 실패했습니다.", ok: false });
    } finally {
      setRoleChanging(false);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-8 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/mypage" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            ← 내 워크스페이스
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">프로필 편집</h1>
          <p className="text-sm text-zinc-400">계정 정보, 비밀번호, 역할을 관리합니다.</p>
        </header>

        {/* 계정 정보 */}
        <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">계정 정보</h2>
          <dl className="space-y-2">
            <Row label="이메일" value={user?.email || "-"} />
            <Row label="이름" value={user?.name || "-"} />
            <Row label="현재 역할" value={user?.userType ? userTypeLabels[user.userType] : "역할 미설정"} />
          </dl>
        </section>

        {/* 프로필 수정 */}
        <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">정보 변경</h2>
          {profileMsg.text ? (
            <p className={`text-sm font-medium ${profileMsg.ok ? "text-zinc-200" : "text-rose-300"}`}>
              {profileMsg.text}
            </p>
          ) : null}
          <form onSubmit={handleProfileSave} className="space-y-3">
            <div>
              <label className="field-label">이름 변경</label>
              <input
                className="input"
                placeholder={user?.name || "이름 입력"}
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">현재 비밀번호</label>
              <input
                type="password"
                className="input"
                placeholder="비밀번호 변경 시 입력"
                value={profileForm.currentPassword}
                onChange={(e) => setProfileForm((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">새 비밀번호</label>
              <input
                type="password"
                className="input"
                placeholder="8자 이상, 영문+숫자"
                value={profileForm.newPassword}
                onChange={(e) => setProfileForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <button type="submit" disabled={profileSaving} className="btn-primary w-full">
              {profileSaving ? "저장 중..." : "저장"}
            </button>
          </form>
        </section>

        {/* 역할 변경 */}
        <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">역할 변경</h2>
            <p className="mt-1 text-sm text-zinc-400">역할에 따라 메뉴와 기능이 달라집니다.</p>
          </div>
          {roleMsg.text ? (
            <p className={`text-sm font-medium ${roleMsg.ok ? "text-zinc-200" : "text-rose-300"}`}>
              {roleMsg.text}
            </p>
          ) : null}
          <div className="grid gap-2">
            {userTypeOptions.map((opt) => {
              const isActive = user?.userType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={roleChanging || isActive}
                  onClick={() => handleRoleChange(opt.value)}
                  className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed"
                  style={
                    isActive
                      ? {
                          background: "rgba(124,58,237,0.10)",
                          borderColor: "rgba(124,58,237,0.30)",
                        }
                      : {
                          background: "rgba(255,255,255,0.02)",
                          borderColor: "rgba(255,255,255,0.08)",
                        }
                  }
                >
                  <div>
                    <p className={`text-sm font-semibold ${isActive ? "text-zinc-200" : "text-white"}`}>
                      {opt.label}
                    </p>
                    {opt.hint ? (
                      <p className="mt-0.5 text-xs text-zinc-400">{opt.hint}</p>
                    ) : null}
                  </div>
                  {isActive ? (
                    <span className="rounded-md bg-white/[0.10] px-2 py-0.5 text-xs font-semibold text-zinc-200">
                      현재
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      {roleChanging ? "변경 중..." : "선택"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5">
      <dt className="text-sm text-zinc-400">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
