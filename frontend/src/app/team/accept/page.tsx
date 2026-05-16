"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

type State = "loading" | "success" | "error";

function TeamAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState("");

  const inviteToken = searchParams.get("token");

  useEffect(() => {
    if (!token || !inviteToken) return;

    api<{ message: string; projectId: string }>(
      "POST",
      `/api/team/accept/${inviteToken}`,
      {},
      token,
    )
      .then((res) => {
        setProjectId(res.projectId);
        setState("success");
      })
      .catch((caught) => {
        setError(readError(caught, "초대 수락에 실패했습니다."));
        setState("error");
      });
  }, [token, inviteToken]);

  if (!inviteToken) {
    return (
      <AuthGuard>
        <div className="workspace-grid fade-up">
          <Surface className="py-16 text-center">
            <p className="text-lg font-semibold text-gray-900">유효하지 않은 초대 링크입니다</p>
            <p className="mt-2 text-sm text-gray-500">링크가 만료됐거나 잘못된 형식입니다.</p>
            <Link href="/community" className="btn-secondary mt-6 inline-block">홈으로 돌아가기</Link>
          </Surface>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <div className="mx-auto w-full max-w-md">
          <Surface className="py-12 text-center space-y-4">
            {state === "loading" && (
              <>
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                <p className="text-sm text-gray-500">초대를 처리하는 중입니다...</p>
              </>
            )}

            {state === "success" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                  <svg className="h-7 w-7 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-gray-900">팀에 합류했습니다!</p>
                <p className="text-sm text-gray-500">이제 프로젝트에서 협업할 수 있습니다.</p>
                <div className="flex justify-center gap-3 pt-2">
                  {projectId && (
                    <Link href={`/projects/${projectId}`} className="btn-primary px-6 py-2.5">
                      프로젝트 보기
                    </Link>
                  )}
                  <Link href="/community" className="btn-ghost px-6 py-2.5">
                    홈으로
                  </Link>
                </div>
              </>
            )}

            {state === "error" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-gray-900">초대 수락 실패</p>
                <p className="text-sm text-red-600">{error}</p>
                <Link href="/community" className="btn-secondary mt-2 inline-block px-6 py-2.5">
                  홈으로 돌아가기
                </Link>
              </>
            )}
          </Surface>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function TeamAcceptPage() {
  return (
    <Suspense fallback={null}>
      <TeamAcceptContent />
    </Suspense>
  );
}
