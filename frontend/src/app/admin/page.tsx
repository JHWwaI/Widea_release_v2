"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { EmptyState, PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api, buildQuery } from "@/lib/api";
import { formatDate, readError } from "@/lib/product";

/* ── 타입 ─────────────────────────────────────────── */

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalBlueprints: number;
  totalIdeaSessions: number;
  totalCommunityPosts: number;
  totalCases: number;
  recentUsers: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  userType: string | null;
  planType: string;
  creditBalance: number;
  createdAt: string;
  _count: { projectPolicies: number };
}

interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

interface AdminCase {
  id: string;
  companyName: string;
  industry: string | null;
  targetMarket: string | null;
  fundingStage: string | null;
  dataQualityScore: number | null;
  isActive: boolean;
  createdAt: string;
}

interface AdminCasesResponse {
  cases: AdminCase[];
  total: number;
  page: number;
  totalPages: number;
}

type Tab = "stats" | "users" | "cases";

const PLAN_OPTIONS = ["FREE", "STARTER", "PRO", "TEAM", "ENTERPRISE"];
const USER_TYPE_OPTIONS = ["FOUNDER", "EXPERT"];

/* ── 컴포넌트 ──────────────────────────────────────── */

export default function AdminPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");

  /* ── 통계 ── */
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  /* ── 유저 목록 ── */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  /* 인라인 편집 */
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editUserType, setEditUserType] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  /* 크레딧 지급 */
  const [grantUserId, setGrantUserId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState("10");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantMsg, setGrantMsg] = useState("");

  /* 삭제 */
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── 케이스 목록 ── */
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [casesTotal, setCasesTotal] = useState(0);
  const [casesTotalPages, setCasesTotalPages] = useState(1);
  const [casesPage, setCasesPage] = useState(1);
  const [casesSearch, setCasesSearch] = useState("");
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState("");

  /* ── 통계 로드 ── */
  useEffect(() => {
    if (!token || tab !== "stats") return;
    setStatsLoading(true); setStatsError("");
    api<AdminStats>("GET", "/api/admin/stats", undefined, token)
      .then(setStats)
      .catch((e) => setStatsError(readError(e, "통계를 불러오지 못했습니다.")))
      .finally(() => setStatsLoading(false));
  }, [token, tab]);

  /* ── 유저 목록 로드 ── */
  useEffect(() => {
    if (!token || tab !== "users") return;
    setUsersLoading(true); setUsersError("");
    api<AdminUsersResponse>(
      "GET",
      buildQuery("/api/admin/users", { page: usersPage, limit: 20, search: usersSearch || undefined }),
      undefined,
      token,
    )
      .then((d) => { setUsers(d.users); setUsersTotal(d.total); setUsersTotalPages(d.totalPages); })
      .catch((e) => setUsersError(readError(e, "유저 목록을 불러오지 못했습니다.")))
      .finally(() => setUsersLoading(false));
  }, [token, tab, usersPage, usersSearch]);

  /* ── 케이스 목록 로드 ── */
  useEffect(() => {
    if (!token || tab !== "cases") return;
    setCasesLoading(true); setCasesError("");
    api<AdminCasesResponse>(
      "GET",
      buildQuery("/api/admin/cases", { page: casesPage, limit: 20, search: casesSearch || undefined }),
      undefined,
      token,
    )
      .then((d) => { setCases(d.cases); setCasesTotal(d.total); setCasesTotalPages(d.totalPages); })
      .catch((e) => setCasesError(readError(e, "케이스 목록을 불러오지 못했습니다.")))
      .finally(() => setCasesLoading(false));
  }, [token, tab, casesPage, casesSearch]);

  /* ── 유저 수정 ── */
  async function handleEditSave(userId: string) {
    if (!token) return;
    setEditSaving(true);
    try {
      const updated = await api<AdminUser>(
        "PATCH", `/api/admin/users/${userId}`,
        { planType: editPlan || undefined, userType: editUserType || undefined },
        token,
      );
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, planType: updated.planType, userType: updated.userType } : u));
      setEditUserId(null);
    } catch (e) {
      setUsersError(readError(e, "수정에 실패했습니다."));
    } finally {
      setEditSaving(false);
    }
  }

  /* ── 크레딧 지급 ── */
  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !grantUserId) return;
    setGranting(true); setGrantMsg("");
    try {
      const res = await api<{ newBalance: number; granted: number }>(
        "POST", "/api/admin/credits/grant",
        { userId: grantUserId, amount: Number(grantAmount), reason: grantReason || "어드민 지급" },
        token,
      );
      setGrantMsg(`완료! 새 잔액: ${res.newBalance} 크레딧`);
      setUsers((prev) => prev.map((u) => u.id === grantUserId ? { ...u, creditBalance: res.newBalance } : u));
    } catch (e) {
      setGrantMsg(readError(e, "크레딧 지급에 실패했습니다."));
    } finally {
      setGranting(false);
    }
  }

  /* ── 유저 삭제 ── */
  async function handleDelete(userId: string) {
    if (!token) return;
    setDeleting(true);
    try {
      await api("DELETE", `/api/admin/users/${userId}`, undefined, token);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteUserId(null);
    } catch (e) {
      setUsersError(readError(e, "삭제에 실패했습니다."));
    } finally {
      setDeleting(false);
    }
  }

  if (!user?.isAdmin) {
    return (
      <AuthGuard>
        <div className="workspace-grid fade-up">
          <Surface className="py-16 text-center">
            <p className="text-lg font-semibold text-gray-900">접근 권한이 없습니다</p>
            <p className="mt-2 text-sm text-gray-500">관리자 계정으로 로그인해주세요.</p>
          </Surface>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="관리자"
          title="관리자 대시보드"
          description="서비스 전체 현황을 확인하고 유저·크레딧을 관리합니다."
        />

        {/* 탭 */}
        <div className="flex gap-2 border-b border-gray-100 pb-0">
          {([
            { id: "stats", label: "통계" },
            { id: "users", label: `유저 목록${usersTotal ? ` (${usersTotal})` : ""}` },
            { id: "cases", label: `케이스 DB${casesTotal ? ` (${casesTotal})` : ""}` },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 통계 탭 ── */}
        {tab === "stats" && (
          <div className="space-y-4">
            {statsError ? <Surface className="text-sm text-red-600">{statsError}</Surface> : null}
            {statsLoading || !stats ? (
              <Surface><EmptyState title="불러오는 중..." description="" /></Surface>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "전체 가입자", value: stats.totalUsers, sub: `이번 주 +${stats.recentUsers}명` },
                  { label: "프로젝트", value: stats.totalProjects },
                  { label: "Blueprint", value: stats.totalBlueprints },
                  { label: "Idea Match 세션", value: stats.totalIdeaSessions },
                  { label: "커뮤니티 글", value: stats.totalCommunityPosts },
                  { label: "글로벌 케이스 DB", value: stats.totalCases },
                ].map(({ label, value, sub }) => (
                  <Surface key={label} className="space-y-1">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
                    {sub ? <p className="text-xs text-zinc-700">{sub}</p> : null}
                  </Surface>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 유저 목록 탭 ── */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* 검색 */}
            <Surface className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="이메일 또는 이름 검색"
                value={usersSearch}
                onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
              />
            </Surface>

            {usersError ? <Surface className="text-sm text-red-600">{usersError}</Surface> : null}

            {usersLoading ? (
              <Surface><EmptyState title="불러오는 중..." description="" /></Surface>
            ) : users.length === 0 ? (
              <Surface><EmptyState title="유저가 없습니다" description="" /></Surface>
            ) : (
              <Surface className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="px-4 py-3">이메일 / 이름</th>
                      <th className="px-4 py-3">플랜</th>
                      <th className="px-4 py-3">유형</th>
                      <th className="px-4 py-3">크레딧</th>
                      <th className="px-4 py-3">프로젝트</th>
                      <th className="px-4 py-3">가입일</th>
                      <th className="px-4 py-3">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{u.email}</p>
                          {u.name ? <p className="text-xs text-gray-400">{u.name}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          {editUserId === u.id ? (
                            <select
                              className="select text-xs py-1"
                              value={editPlan}
                              onChange={(e) => setEditPlan(e.target.value)}
                            >
                              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          ) : (
                            <span className="badge badge-neutral">{u.planType}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editUserId === u.id ? (
                            <select
                              className="select text-xs py-1"
                              value={editUserType}
                              onChange={(e) => setEditUserType(e.target.value)}
                            >
                              <option value="">—</option>
                              {USER_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          ) : (
                            <span className="text-gray-500">{u.userType ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{u.creditBalance}</td>
                        <td className="px-4 py-3 text-gray-500">{u._count.projectPolicies}</td>
                        <td className="px-4 py-3 text-gray-400">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {editUserId === u.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditSave(u.id)}
                                  disabled={editSaving}
                                  className="btn-primary text-xs px-2 py-1"
                                >
                                  {editSaving ? "저장 중" : "저장"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditUserId(null)}
                                  className="btn-ghost text-xs px-2 py-1"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditUserId(u.id);
                                    setEditPlan(u.planType);
                                    setEditUserType(u.userType ?? "");
                                  }}
                                  className="btn-ghost text-xs px-2 py-1"
                                >
                                  편집
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setGrantUserId(u.id); setGrantMsg(""); setGrantAmount("10"); setGrantReason(""); }}
                                  className="btn-ghost text-xs px-2 py-1 text-zinc-700"
                                >
                                  크레딧 지급
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteUserId(u.id)}
                                  className="btn-ghost text-xs px-2 py-1 text-red-400"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Surface>
            )}

            {/* 페이지네이션 */}
            {usersTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={usersPage <= 1}
                  onClick={() => setUsersPage((p) => p - 1)}
                  className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-30"
                >
                  이전
                </button>
                <span className="text-sm text-gray-500">{usersPage} / {usersTotalPages}</span>
                <button
                  type="button"
                  disabled={usersPage >= usersTotalPages}
                  onClick={() => setUsersPage((p) => p + 1)}
                  className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-30"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 케이스 DB 탭 ── */}
        {tab === "cases" && (
          <div className="space-y-4">
            <Surface className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="회사명 또는 업종 검색"
                value={casesSearch}
                onChange={(e) => { setCasesSearch(e.target.value); setCasesPage(1); }}
              />
            </Surface>

            {casesError ? <Surface className="text-sm text-red-600">{casesError}</Surface> : null}

            {casesLoading ? (
              <Surface><EmptyState title="불러오는 중..." description="" /></Surface>
            ) : cases.length === 0 ? (
              <Surface><EmptyState title="케이스가 없습니다" description="" /></Surface>
            ) : (
              <Surface className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="px-4 py-3">회사명</th>
                      <th className="px-4 py-3">업종</th>
                      <th className="px-4 py-3">타깃 마켓</th>
                      <th className="px-4 py-3">펀딩 단계</th>
                      <th className="px-4 py-3">품질 점수</th>
                      <th className="px-4 py-3">상태</th>
                      <th className="px-4 py-3">등록일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cases.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.companyName}</td>
                        <td className="px-4 py-3 text-gray-500">{c.industry ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{c.targetMarket ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{c.fundingStage ?? "—"}</td>
                        <td className="px-4 py-3">
                          {c.dataQualityScore !== null ? (
                            <span className={`font-medium ${c.dataQualityScore >= 0.8 ? "text-zinc-700" : c.dataQualityScore >= 0.5 ? "text-zinc-700" : "text-red-500"}`}>
                              {(c.dataQualityScore * 100).toFixed(0)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.isActive ? "bg-white/[0.06] text-zinc-800" : "bg-gray-100 text-gray-400"}`}>
                            {c.isActive ? "활성" : "비활성"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Surface>
            )}

            {casesTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={casesPage <= 1}
                  onClick={() => setCasesPage((p) => p - 1)}
                  className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-30"
                >
                  이전
                </button>
                <span className="text-sm text-gray-500">{casesPage} / {casesTotalPages}</span>
                <button
                  type="button"
                  disabled={casesPage >= casesTotalPages}
                  onClick={() => setCasesPage((p) => p + 1)}
                  className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-30"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 크레딧 지급 모달 ── */}
      {grantUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-lg font-semibold text-gray-900">크레딧 지급</p>
            <p className="mt-1 text-sm text-gray-500">
              {users.find((u) => u.id === grantUserId)?.email}
            </p>
            <form onSubmit={handleGrant} className="mt-4 grid gap-3">
              <div>
                <label className="field-label">지급 크레딧</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label">사유 (선택)</label>
                <input
                  className="input"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="어드민 지급"
                />
              </div>
              {grantMsg ? (
                <p className={`text-sm ${grantMsg.startsWith("완료") ? "text-zinc-700" : "text-red-600"}`}>{grantMsg}</p>
              ) : null}
              <div className="flex gap-2">
                <button type="submit" disabled={granting} className="btn-primary flex-1">
                  {granting ? "처리 중..." : "지급하기"}
                </button>
                <button
                  type="button"
                  onClick={() => { setGrantUserId(null); setGrantMsg(""); }}
                  className="btn-ghost flex-1"
                >
                  닫기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 유저 삭제 확인 모달 ── */}
      {deleteUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-lg font-semibold text-gray-900">유저 삭제</p>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium">{users.find((u) => u.id === deleteUserId)?.email}</span>
              과 모든 관련 데이터가 영구 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => handleDelete(deleteUserId)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "삭제 확인"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteUserId(null)}
                className="btn-ghost flex-1"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
