"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readError, userTypeOptions } from "@/lib/product";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  FOUNDER: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  EXPERT: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
};

export default function SelectTypePage() {
  const router = useRouter();
  const { user, loading, setUserType } = useAuth();
  const [selected, setSelected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.userType) router.replace("/idea-match");
  }, [loading, router, user]);

  async function handleSubmit(value?: string) {
    const role = value ?? selected;
    if (!role) return;
    setError("");
    setSubmitting(true);
    try {
      await setUserType(role);
      if (role === "EXPERT") {
        router.push("/mypage/expert");
      } else {
        router.push("/idea-match");
      }
    } catch (caught) {
      setError(readError(caught, "역할 설정에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Minimal header */}
      <header className="flex h-16 items-center border-b border-gray-200 bg-white/80 px-6 backdrop-blur-sm">
        <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
          Widea
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl space-y-10">
          {/* Header */}
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              한 번만 설정
            </span>
            <h1 className="text-3xl font-bold text-gray-900">어떤 관점으로 시작할까요?</h1>
            <p className="text-sm text-gray-500">
              역할에 따라 추천 액션과 워크플로우가 달라집니다.
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Role cards */}
          <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
            {userTypeOptions.map((option) => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setSelected(option.value);
                    void handleSubmit(option.value);
                  }}
                  className={`group relative rounded-2xl border-2 p-6 text-left transition-all ${
                    active
                      ? "border-blue-500 bg-white shadow-md shadow-blue-100"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  {active ? (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                  ) : null}

                  <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                    active ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                  }`}>
                    {ROLE_ICONS[option.value]}
                  </div>

                  <p className={`text-base font-bold ${active ? "text-blue-700" : "text-gray-900"}`}>
                    {option.label}
                  </p>
                  <p className={`mt-1.5 text-xs leading-relaxed ${active ? "text-blue-600" : "text-gray-500"}`}>
                    {option.hint}
                  </p>
                </button>
              );
            })}
          </div>

          {submitting ? (
            <p className="text-center text-sm text-gray-500">설정 중…</p>
          ) : (
            <p className="text-center text-xs text-gray-400">역할을 선택하면 자동으로 다음 단계로 이동합니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
