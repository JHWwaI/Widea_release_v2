"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";

type CollabRequest = {
  id: string;
  ideaId: string;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  grantRole: "EDITOR" | "VIEWER";
  createdAt: string;
  idea: { id: string; titleKo: string; oneLinerKo: string | null };
  requester: { id: string; name: string | null; email: string };
};

const STATUS_LABEL: Record<CollabRequest["status"], string> = {
  PENDING: "대기 중",
  ACCEPTED: "수락됨",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
};

const STATUS_COLOR: Record<CollabRequest["status"], string> = {
  PENDING: "text-zinc-200 bg-white/[0.06] ring-white/15",
  ACCEPTED: "text-zinc-200 bg-white/[0.06] ring-white/15",
  REJECTED: "text-rose-400 bg-rose-500/10 ring-rose-400/30",
  CANCELLED: "text-zinc-500 bg-white/[0.04] ring-white/10",
};

export default function CollabRequestsInbox() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ requests: CollabRequest[] }>(
        "GET",
        "/api/collab-requests/received",
        undefined,
        token,
      );
      setRequests(res.requests);
    } catch (caught) {
      setError(readError(caught, "협업 요청 불러오기 실패"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAction(requestId: string, status: "ACCEPTED" | "REJECTED") {
    if (!token) return;
    setProcessing(requestId);
    try {
      await api("PATCH", `/api/collab-requests/${requestId}`, { status }, token);
      refresh();
    } catch (caught) {
      setError(readError(caught, "처리 실패"));
    } finally {
      setProcessing(null);
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const past = requests.filter((r) => r.status !== "PENDING");

  return (
    <section className="space-y-4">
      <header>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          협업 요청
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">받은 워크스페이스 초대</h2>
        <p className="text-xs text-zinc-500">
          수락하면 해당 아이디어 워크스페이스에 편집 권한이 부여됩니다.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-4 text-center text-sm text-zinc-500">불러오는 중...</p>
      ) : pending.length === 0 && past.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
          아직 받은 협업 요청이 없습니다.
        </p>
      ) : (
        <div className="space-y-6">
          {/* 대기 중 */}
          {pending.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-200">대기 중 ({pending.length})</p>
              {pending.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  processing={processing === r.id}
                  onAccept={() => handleAction(r.id, "ACCEPTED")}
                  onReject={() => handleAction(r.id, "REJECTED")}
                />
              ))}
            </div>
          ) : null}

          {/* 처리 완료 */}
          {past.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500">처리 완료</p>
              {past.map((r) => (
                <RequestCard key={r.id} request={r} processing={false} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function RequestCard({
  request: r,
  processing,
  onAccept,
  onReject,
}: {
  request: CollabRequest;
  processing: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/workspace/${r.idea.id}`}
            className="block truncate text-sm font-bold text-white hover:text-zinc-200"
          >
            {r.idea.titleKo}
          </Link>
          {r.idea.oneLinerKo ? (
            <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{r.idea.oneLinerKo}</p>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${STATUS_COLOR[r.status]}`}>
          {STATUS_LABEL[r.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span>
          {r.requester.name || r.requester.email}
          <span className="text-zinc-600"> 으로부터</span>
        </span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-600">{formatRelativeTime(r.createdAt)}</span>
        <span className="text-zinc-600">·</span>
        <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-semibold text-zinc-400">
          {r.grantRole === "EDITOR" ? "편집자" : "뷰어"}
        </span>
      </div>

      {r.message ? (
        <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-zinc-300">
          {r.message}
        </p>
      ) : null}

      {r.status === "PENDING" && onAccept && onReject ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={processing}
            onClick={onAccept}
            className="rounded-lg bg-white/[0.10] px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.15] disabled:opacity-50"
          >
            {processing ? "처리 중..." : "수락"}
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={onReject}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] disabled:opacity-50"
          >
            거절
          </button>
        </div>
      ) : r.status === "ACCEPTED" ? (
        <Link
          href={`/workspace/${r.idea.id}`}
          className="inline-block rounded-lg border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.10]"
        >
          워크스페이스 열기 →
        </Link>
      ) : null}
    </div>
  );
}
