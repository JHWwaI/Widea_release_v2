"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatRelativeTime, readError } from "@/lib/product";
import MeetingNotesSection, {
  DesignPicker,
  type DocxDesign,
} from "@/components/MeetingNotesSection";
import MeetingSummaryView from "@/components/MeetingSummaryView";
import { MEETING_TEMPLATES, type MeetingTemplateKey } from "@/lib/meetingTemplates";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

async function downloadNoteDocx(id: string, title: string, design: DocxDesign, token: string) {
  if (!token) return;
  const res = await fetch(`${API_BASE}/api/meetings/${id}/docx?design=${design}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    alert("다운로드 실패");
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}_${design}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type NoteListItem = {
  id: string;
  title: string;
  source: "UPLOAD" | "LIVE_BROWSER" | "BOT";
  durationSec: number | null;
  ideaId: string | null;
  roomCode: string | null;
  summary: Record<string, unknown> | null;
  templateKey: MeetingTemplateKey | null;
  createdAt: string;
};

type NoteDetail = NoteListItem & { transcriptText: string };

const SOURCE_LABEL: Record<string, string> = {
  UPLOAD: "업로드",
  LIVE_BROWSER: "실시간",
  BOT: "봇",
};

/** 템플릿 종류 무관하게 summary 첫 두 문자열 항목으로 미리보기 만들기 */
function firstPreview(summary: Record<string, unknown>): string {
  for (const value of Object.values(summary)) {
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const obj = first as { content?: string; question?: string };
        if (typeof obj.content === "string") return obj.content;
        if (typeof obj.question === "string") return obj.question;
      }
    }
  }
  return "";
}

export default function WorkspaceMeetings({ ideaId }: { ideaId: string }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRecorder, setShowRecorder] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDesign, setDetailDesign] = useState<DocxDesign>("classic");

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api<{ notes: NoteListItem[] }>(
        "GET",
        `/api/meetings?ideaId=${encodeURIComponent(ideaId)}`,
        undefined,
        token,
      );
      setNotes(res.notes);
    } catch (caught) {
      setError(readError(caught, "회의록 불러오기 실패"));
    } finally {
      setLoading(false);
    }
  }, [token, ideaId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function openDetail(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api<{ note: NoteDetail }>(
        "GET",
        `/api/meetings/${id}`,
        undefined,
        token ?? undefined,
      );
      setDetail(res.note);
    } catch (caught) {
      setError(readError(caught, "회의록 상세 불러오기 실패"));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!window.confirm("회의록을 삭제하시겠습니까?")) return;
    try {
      await api("DELETE", `/api/meetings/${id}`, undefined, token);
      if (openId === id) {
        setOpenId(null);
        setDetail(null);
      }
      refresh();
    } catch (caught) {
      setError(readError(caught, "삭제 실패"));
    }
  }

  return (
    <section
      id="meetings"
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            회의록
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">이 아이디어의 회의 기록</h2>
          <p className="text-xs text-zinc-500">
            화상 회의 후 녹음 파일을 올리거나 실시간 자막을 켜면 AI가 요약·액션 아이템까지 정리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/collab/meet?ideaId=${encodeURIComponent(ideaId)}`}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.10]"
          >
            화상 회의 시작
          </Link>
          <button
            type="button"
            onClick={() => setShowRecorder((v) => !v)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
          >
            {showRecorder ? "녹음·업로드 닫기" : "+ 회의록 직접 추가"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {showRecorder ? (
        <div onAnimationEnd={() => refresh()}>
          <MeetingNotesSection ideaId={ideaId} />
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => {
                setShowRecorder(false);
                refresh();
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              완료 후 목록 새로고침 ↻
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-sm text-zinc-500">불러오는 중...</p>
      ) : notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
          아직 이 아이디어로 만든 회의록이 없습니다. 화상 회의를 시작하거나 녹음을 업로드하면 여기에 모입니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => {
            const isOpen = openId === n.id;
            return (
              <li
                key={n.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => openDetail(n.id)}
                  className="block w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-white">{n.title}</p>
                    <div className="flex items-center gap-1.5">
                      {n.templateKey && MEETING_TEMPLATES[n.templateKey] ? (
                        <span className="rounded bg-white/[0.08] px-2 py-0.5 text-[0.65rem] font-semibold text-zinc-200">
                          {MEETING_TEMPLATES[n.templateKey].label}
                        </span>
                      ) : null}
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[0.65rem] font-bold text-zinc-300">
                        {SOURCE_LABEL[n.source]}
                      </span>
                    </div>
                  </div>
                  {n.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                      {firstPreview(n.summary)}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[0.65rem] text-zinc-500">
                    <span>{formatRelativeTime(n.createdAt)}</span>
                    {n.durationSec ? (
                      <span>
                        · {Math.floor(n.durationSec / 60)}분 {n.durationSec % 60}초
                      </span>
                    ) : null}
                    {n.roomCode ? <span>· 회의방 {n.roomCode}</span> : null}
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-white/5 bg-black/20 p-4 space-y-3">
                    {detailLoading || !detail ? (
                      <p className="text-xs text-zinc-500">불러오는 중...</p>
                    ) : (
                      <>
                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <MeetingSummaryView
                            templateKey={detail.templateKey ?? undefined}
                            summary={detail.summary}
                          />
                        </div>

                        <details className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <summary className="cursor-pointer text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200">
                            원본 Transcript ({detail.transcriptText.length}자)
                          </summary>
                          <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
                            {detail.transcriptText}
                          </pre>
                        </details>

                        <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
                            📥 다운로드 디자인
                          </p>
                          <DesignPicker value={detailDesign} onChange={setDetailDesign} />
                        </div>

                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => downloadNoteDocx(detail.id, detail.title, detailDesign, token ?? "")}
                            className="rounded-md border border-white/20 bg-white/[0.08] px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-100 hover:bg-white/[0.10]/25"
                          >
                            📥 .docx 다운로드
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(detail.id)}
                            className="text-xs text-rose-300 hover:text-rose-200"
                          >
                            회의록 삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
