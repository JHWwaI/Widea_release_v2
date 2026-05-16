"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { readError } from "@/lib/product";
import MeetingSummaryView, { TemplatePicker } from "@/components/MeetingSummaryView";
import { TEMPLATE_SAMPLES, MEETING_TEMPLATES, type MeetingTemplateKey, type TemplateSection } from "@/lib/meetingTemplates";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

/** docx 디자인 종류 — 백엔드 src/lib/meetingDocx.ts 의 MeetingDocxDesign 와 동기화 */
export type DocxDesign = "classic" | "minimal" | "business";

export const DOCX_DESIGN_LIST: Array<{
  key: DocxDesign;
  label: string;
  description: string;
  emoji: string;
}> = [
  { key: "classic", label: "클래식", description: "헤딩+글머리+표 (기본)", emoji: "📝" },
  { key: "minimal", label: "미니멀", description: "라인 중심·인쇄용", emoji: "✒️" },
  { key: "business", label: "비즈니스", description: "전 섹션 표·결재 문서", emoji: "📊" },
];

/** 인증 헤더 + binary 응답 → 브라우저 다운로드 트리거 */
async function fetchAndDownload(url: string, fallbackName: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    let msg = `다운로드 실패 (${res.status})`;
    try { msg = (await res.json()).error ?? msg; } catch {}
    alert(msg);
    return;
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  // Content-Disposition의 파일명을 클라이언트에서 다시 파싱하는 건 복잡하므로 fallback 사용
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

async function downloadBlankTemplate(
  templateKey: MeetingTemplateKey,
  design: DocxDesign,
  token: string,
) {
  if (!token) return;
  const tpl = MEETING_TEMPLATES[templateKey];
  await fetchAndDownload(
    `${API_BASE}/api/meetings/template/${templateKey}/blank.docx?design=${design}`,
    `${tpl.label}_회의록_양식_${design}.docx`,
    token,
  );
}

async function downloadFilledNote(
  id: string,
  title: string,
  design: DocxDesign,
  token: string,
) {
  if (!token) return;
  await fetchAndDownload(
    `${API_BASE}/api/meetings/${id}/docx?design=${design}`,
    `${title}_${design}.docx`,
    token,
  );
}

/** 디자인 선택 카드 그룹 — 회의록 작성/결과 영역에서 공용 */
export function DesignPicker({
  value,
  onChange,
}: {
  value: DocxDesign;
  onChange: (d: DocxDesign) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {DOCX_DESIGN_LIST.map((d) => {
        const active = d.key === value;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onChange(d.key)}
            className={`flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
              active
                ? "border-white/25 bg-white/[0.08] text-zinc-100"
                : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <span className="text-xs font-bold">
              {d.emoji} {d.label}
            </span>
            <span className="text-[0.6rem] leading-tight text-zinc-500">{d.description}</span>
          </button>
        );
      })}
    </div>
  );
}

type MeetingNote = {
  id: string;
  title: string;
  source: "UPLOAD" | "LIVE_BROWSER" | "BOT";
  durationSec: number | null;
  transcriptText: string;
  summary: Record<string, unknown> | null;
  templateKey: MeetingTemplateKey | null;
  createdAt: string;
};

type Mode = "idle" | "uploading" | "doc-uploading" | "live-recording" | "paste" | "manual" | "saving" | "done";

/* ─────────────────────────────────────────────
   Web Speech API 타입 (브라우저)
   ───────────────────────────────────────────── */
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResult[];
};
type SpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  }
}

export default function MeetingNotesSection({
  roomCode,
  ideaId,
}: {
  roomCode?: string;
  ideaId?: string;
}) {
  const { token } = useAuth();
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState("");
  const [latestNote, setLatestNote] = useState<MeetingNote | null>(null);
  const [recordingTitle, setRecordingTitle] = useState("");
  const [templateKey, setTemplateKey] = useState<MeetingTemplateKey>("DEFAULT");
  const [docxDesign, setDocxDesign] = useState<DocxDesign>("classic");
  const [pasteText, setPasteText] = useState("");

  // Live recording state
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const liveStartedAtRef = useRef<number>(0);

  /* ─── D. 문서 파일 업로드 (PDF · DOCX · HWPX) ─── */
  async function onDocPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setError("");
    setMode("doc-uploading");
    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("title", recordingTitle.trim() || file.name.replace(/\.[^.]+$/, ""));
      if (ideaId) fd.append("ideaId", ideaId);
      if (roomCode) fd.append("roomCode", roomCode);
      fd.append("templateKey", templateKey);

      const res = await fetch(`${API_BASE}/api/meetings/parse-doc`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = txt;
        try { msg = JSON.parse(txt).error ?? txt; } catch {}
        throw new Error(msg || "문서 파싱 실패");
      }
      const json = (await res.json()) as { note: MeetingNote };
      setLatestNote(json.note);
      setMode("done");
    } catch (caught) {
      setError(readError(caught, "문서 파싱 실패"));
      setMode("idle");
    } finally {
      e.target.value = "";
    }
  }

  /* ─── A. 파일 업로드 ─── */
  async function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setError("");
    setMode("uploading");
    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("title", recordingTitle.trim() || `회의록 ${new Date().toLocaleString("ko-KR")}`);
      if (ideaId) fd.append("ideaId", ideaId);
      if (roomCode) fd.append("roomCode", roomCode);
      fd.append("templateKey", templateKey);

      const res = await fetch(`${API_BASE}/api/meetings/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "전사 실패");
      }
      const json = (await res.json()) as { note: MeetingNote };
      setLatestNote(json.note);
      setMode("done");
    } catch (caught) {
      setError(readError(caught, "전사·요약 실패"));
      setMode("idle");
    } finally {
      // input value 초기화
      e.target.value = "";
    }
  }

  /* ─── B. 실시간 자막 (Web Speech API) ─── */
  function startLiveRecording() {
    setError("");
    setLiveTranscript("");
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setError("이 브라우저는 실시간 자막을 지원하지 않습니다. Chrome/Edge 권장.");
      return;
    }
    const recog = new SR();
    recog.lang = "ko-KR";
    recog.continuous = true;
    recog.interimResults = false;
    let acc = "";
    recog.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          acc += (acc ? " " : "") + r[0].transcript;
        }
      }
      setLiveTranscript(acc);
    };
    recog.onerror = (e) => {
      console.error("[live] error:", e.error);
      if (e.error !== "no-speech") {
        setError(`자막 오류: ${e.error}`);
      }
    };
    recog.onend = () => {
      // 자동 종료 시 (예: 무음 길어짐) — 재시작
      if (mode === "live-recording") {
        try { recog.start(); } catch {}
      }
    };
    recog.start();
    recognitionRef.current = recog;
    liveStartedAtRef.current = Date.now();
    setMode("live-recording");
  }

  /* ─── C. 텍스트 붙여넣기 → 백엔드 요약만 ─── */
  async function processPastedText() {
    const text = pasteText.trim();
    if (!text || text.length < 30) {
      setError("텍스트가 너무 짧습니다 (30자 이상).");
      return;
    }
    setError("");
    setMode("saving");
    try {
      const res = await fetch(`${API_BASE}/api/meetings/save-live`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptText: text,
          title:
            recordingTitle.trim() ||
            `${MEETING_TEMPLATES[templateKey].label} 데모 ${new Date().toLocaleString("ko-KR")}`,
          ideaId,
          roomCode,
          templateKey,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "저장 실패");
      }
      const json = (await res.json()) as { note: MeetingNote };
      setLatestNote(json.note);
      setMode("done");
    } catch (caught) {
      setError(readError(caught, "처리 실패"));
      setMode("paste");
    }
  }

  async function stopLiveRecording() {
    const recog = recognitionRef.current;
    if (recog) {
      recog.onend = null;
      try { recog.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (!liveTranscript || liveTranscript.length < 10) {
      setMode("idle");
      setError("자막이 너무 짧습니다 (10자 이상 필요).");
      return;
    }
    setMode("saving");
    try {
      const durationSec = Math.round((Date.now() - liveStartedAtRef.current) / 1000);
      const res = await fetch(`${API_BASE}/api/meetings/save-live`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptText: liveTranscript,
          title: recordingTitle.trim() || `회의록 ${new Date().toLocaleString("ko-KR")}`,
          ideaId,
          roomCode,
          durationSec,
          templateKey,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "저장 실패");
      }
      const json = (await res.json()) as { note: MeetingNote };
      setLatestNote(json.note);
      setMode("done");
    } catch (caught) {
      setError(readError(caught, "저장 실패"));
      setMode("idle");
    }
  }

  // unmount cleanup
  useEffect(() => {
    return () => {
      const recog = recognitionRef.current;
      if (recog) {
        recog.onend = null;
        try { recog.stop(); } catch {}
      }
    };
  }, []);

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            자동 회의록
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            전사 원본 + AI 요약 둘 다 받아볼 수 있어요
          </p>
        </div>
        {ideaId ? (
          <Link
            href={`/workspace/${ideaId}#meetings`}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            워크스페이스 회의록 →
          </Link>
        ) : null}
      </header>

      {/* 제목 + 템플릿 */}
      {mode === "idle" || mode === "live-recording" || mode === "paste" || mode === "manual" ? (
        <div className="space-y-3">
          <input
            className="input"
            placeholder="회의 제목 (선택)"
            value={recordingTitle}
            onChange={(e) => setRecordingTitle(e.target.value)}
            disabled={mode === "live-recording"}
          />
          <TemplatePicker
            value={templateKey}
            onChange={setTemplateKey}
            disabled={mode === "live-recording"}
          />
          <div className="space-y-1.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
              문서 디자인
            </p>
            <DesignPicker value={docxDesign} onChange={setDocxDesign} />
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => downloadBlankTemplate(templateKey, docxDesign, token ?? "")}
              disabled={!token}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.7rem] font-semibold text-zinc-300 hover:border-white/20 hover:bg-white/[0.10]/[0.08] hover:text-zinc-200 disabled:opacity-40"
              title="회의 전 빈 양식 .docx로 다운로드"
            >
              📥 빈 양식 .docx 다운로드
            </button>
          </div>
        </div>
      ) : null}

      {/* 모드별 액션 */}
      {mode === "idle" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* A. 녹음 파일 업로드 */}
          <label className="group flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
            <span className="text-sm font-bold text-white">🎙 녹음 파일 업로드</span>
            <span className="text-xs leading-relaxed text-zinc-400">
              Whisper AI 전사 (정확도 높음)<br/>
              mp3 · m4a · wav · 최대 25MB
            </span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={onFilePick}
            />
            <span className="mt-1 text-xs font-semibold text-zinc-400">파일 선택</span>
          </label>

          {/* D. 문서 파일 업로드 */}
          <label className="group flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-sky-400/40 hover:bg-white/[0.05]">
            <span className="text-sm font-bold text-white">📄 문서 파일 업로드</span>
            <span className="text-xs leading-relaxed text-zinc-400">
              회의 메모·녹취록 문서를 바로 요약<br/>
              PDF · Word(.docx) · 한글(.hwpx) · 최대 25MB
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.hwpx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.hancom.hwpx"
              className="hidden"
              onChange={onDocPick}
            />
            <span className="mt-1 text-xs font-semibold text-sky-300">파일 선택</span>
          </label>

          {/* B. 실시간 자막 */}
          <button
            type="button"
            onClick={startLiveRecording}
            className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="text-sm font-bold text-white">🎤 실시간 자막</span>
            <span className="text-xs leading-relaxed text-zinc-400">
              지금 마이크로 받아쓰기 (Chrome/Edge)<br/>
              본인 목소리만 캡처됨
            </span>
            <span className="mt-1 text-xs font-semibold text-zinc-200">시작</span>
          </button>

          {/* C. 텍스트 붙여넣기 */}
          <button
            type="button"
            onClick={() => {
              setPasteText("");
              setMode("paste");
            }}
            className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="text-sm font-bold text-white">📋 텍스트 붙여넣기</span>
            <span className="text-xs leading-relaxed text-zinc-400">
              녹취 텍스트·노션 메모를 붙여넣어 곧장 템플릿으로 정리<br/>
              데모용 샘플 텍스트 제공
            </span>
            <span className="mt-1 text-xs font-semibold text-zinc-200">붙여넣기</span>
          </button>

          {/* E. 직접 작성 (템플릿 폼) */}
          <button
            type="button"
            onClick={() => setMode("manual")}
            className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-rose-400/40 hover:bg-white/[0.05] sm:col-span-2"
          >
            <span className="text-sm font-bold text-white">✍ 직접 작성 (템플릿 폼)</span>
            <span className="text-xs leading-relaxed text-zinc-400">
              녹취·AI 없이 회의 끝나고 바로 5종 템플릿 양식대로 입력해서 저장<br/>
              결정 사항·액션 아이템·다음 단계까지 한번에
            </span>
            <span className="mt-1 text-xs font-semibold text-rose-300">양식 열기</span>
          </button>
        </div>
      ) : null}

      {mode === "paste" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/[0.10]/[0.05] px-3 py-2 text-xs text-zinc-200">
            <span>
              <strong>{MEETING_TEMPLATES[templateKey].label}</strong> 템플릿으로 정리됩니다
            </span>
            <button
              type="button"
              onClick={() => setPasteText(TEMPLATE_SAMPLES[templateKey])}
              className="rounded-md bg-white/[0.08] px-2 py-1 text-[0.7rem] font-semibold text-zinc-100 hover:bg-white/[0.10]/25"
            >
              데모 샘플 채우기
            </button>
          </div>
          <textarea
            className="textarea min-h-[220px]"
            placeholder="여기에 회의 텍스트를 붙여넣으세요. 위 [데모 샘플 채우기] 버튼으로 템플릿별 예시를 바로 채울 수도 있어요."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span>{pasteText.length.toLocaleString()}자 (30자 이상)</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("idle");
                  setPasteText("");
                  setError("");
                }}
                className="text-zinc-400 hover:text-zinc-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={processPastedText}
                disabled={pasteText.trim().length < 30}
                className="rounded-lg bg-white/[0.10] px-4 py-1.5 text-xs font-bold text-zinc-900 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-white/[0.10]"
              >
                템플릿으로 정리하기 →
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "manual" ? (
        <ManualTemplateForm
          templateKey={templateKey}
          onCancel={() => {
            setMode("idle");
            setError("");
          }}
          onSave={async (summary) => {
            setError("");
            setMode("saving");
            try {
              const res = await fetch(`${API_BASE}/api/meetings/save-manual`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title:
                    recordingTitle.trim() ||
                    `${MEETING_TEMPLATES[templateKey].label} ${new Date().toLocaleString("ko-KR")}`,
                  ideaId,
                  roomCode,
                  templateKey,
                  summary,
                  transcriptText: summaryToTranscript(templateKey, summary),
                }),
              });
              if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "저장 실패");
              }
              const json = (await res.json()) as { note: MeetingNote };
              setLatestNote(json.note);
              setMode("done");
            } catch (caught) {
              setError(readError(caught, "저장 실패"));
              setMode("manual");
            }
          }}
        />
      ) : null}

      {mode === "uploading" ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.10]/[0.06] p-4 text-sm text-zinc-200">
          Whisper로 전사 중... (1시간 음성 = 약 1분 소요)
        </div>
      ) : null}

      {mode === "doc-uploading" ? (
        <div className="rounded-xl border border-sky-400/30 bg-sky-500/[0.06] p-4 text-sm text-sky-200">
          문서 텍스트 추출 + AI 요약 중...
        </div>
      ) : null}

      {mode === "live-recording" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-zinc-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            녹음 중 · 자동으로 받아쓰는 중
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-zinc-200">
            {liveTranscript || <span className="text-zinc-500">아직 음성을 받지 못했습니다...</span>}
          </div>
          <button
            type="button"
            onClick={stopLiveRecording}
            className="inline-flex rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
          >
            녹음 종료 + 회의록 저장
          </button>
        </div>
      ) : null}

      {mode === "saving" ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.10]/[0.06] p-4 text-sm text-zinc-200">
          저장 + AI 요약 중...
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {/* 결과 */}
      {mode === "done" && latestNote ? (
        <NoteResult
          note={latestNote}
          onReset={() => {
            setMode("idle");
            setLatestNote(null);
            setLiveTranscript("");
            setRecordingTitle("");
            setPasteText("");
            setError("");
          }}
        />
      ) : null}
    </section>
  );
}

function NoteResult({ note, onReset }: { note: MeetingNote; onReset: () => void }) {
  const { token } = useAuth();
  const [showFull, setShowFull] = useState(false);
  const [design, setDesign] = useState<DocxDesign>("classic");
  return (
    <div className="space-y-4 rounded-xl border border-white/15 bg-white/[0.10]/[0.04] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-zinc-200">회의록 생성 완료</p>
          <p className="mt-0.5 text-base font-bold text-white">{note.title}</p>
          <p className="text-xs text-zinc-500">
            {note.source === "UPLOAD" ? "업로드" : note.source === "LIVE_BROWSER" ? "실시간" : "봇"}
            {note.durationSec ? ` · ${Math.floor(note.durationSec / 60)}분 ${note.durationSec % 60}초` : ""}
            {" · "}{note.transcriptText.length}자
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadFilledNote(note.id, note.title, design, token ?? "")}
            disabled={!token}
            className="rounded-md border border-white/20 bg-white/[0.08] px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-100 hover:bg-white/[0.10]/25 disabled:opacity-40"
            title="템플릿 양식에 자동으로 채워진 .docx 다운로드"
          >
            📥 .docx 다운로드
          </button>
          <button type="button" onClick={onReset} className="text-xs text-zinc-400 hover:text-zinc-200">
            새 회의록
          </button>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
          📥 다운로드 디자인
        </p>
        <DesignPicker value={design} onChange={setDesign} />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <MeetingSummaryView templateKey={note.templateKey ?? undefined} summary={note.summary} />
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          className="flex w-full items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
        >
          <span>원본 Transcript</span>
          <span>{showFull ? "접기 ▴" : "펼치기 ▾"}</span>
        </button>
        {showFull ? (
          <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
            {note.transcriptText}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   직접 작성 폼 — 선택된 템플릿의 sections를 기반으로 동적 생성
   summary JSON을 그대로 만들어 백엔드에 저장
   ─────────────────────────────────────────────── */
type StringListField = string[];
type ActionItem = { owner: string; content: string };
type QaItem = { question: string; answer: string };
type SectionValue = StringListField | ActionItem[] | QaItem[];

function summaryToTranscript(
  templateKey: MeetingTemplateKey,
  summary: Record<string, SectionValue>,
): string {
  const tpl = MEETING_TEMPLATES[templateKey];
  const lines: string[] = [`[${tpl.label}] 직접 작성 회의록`, ""];
  for (const section of tpl.sections) {
    const value = summary[section.field];
    if (!Array.isArray(value) || value.length === 0) continue;
    lines.push(`■ ${section.label}`);
    if (section.kind === "stringList") {
      (value as string[]).forEach((s) => lines.push(`  · ${s}`));
    } else if (section.kind === "actionList") {
      (value as ActionItem[]).forEach((a) =>
        lines.push(`  · ${a.owner ? `[${a.owner}] ` : ""}${a.content}`),
      );
    } else if (section.kind === "qaList") {
      (value as QaItem[]).forEach((q) => {
        lines.push(`  Q. ${q.question}`);
        if (q.answer) lines.push(`  A. ${q.answer}`);
      });
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function ManualTemplateForm({
  templateKey,
  onCancel,
  onSave,
}: {
  templateKey: MeetingTemplateKey;
  onCancel: () => void;
  onSave: (summary: Record<string, SectionValue>) => void | Promise<void>;
}) {
  const tpl = MEETING_TEMPLATES[templateKey];

  // 빈 초깃값 (각 섹션마다 1개 행)
  const initial: Record<string, SectionValue> = {};
  for (const s of tpl.sections) {
    if (s.kind === "stringList") initial[s.field] = [""];
    else if (s.kind === "actionList") initial[s.field] = [{ owner: "", content: "" }];
    else if (s.kind === "qaList") initial[s.field] = [{ question: "", answer: "" }];
  }
  const [data, setData] = useState<Record<string, SectionValue>>(initial);

  function setField(field: string, value: SectionValue) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function buildAndSave() {
    const cleaned: Record<string, SectionValue> = {};
    for (const s of tpl.sections) {
      const v = data[s.field];
      if (s.kind === "stringList") {
        cleaned[s.field] = (v as string[]).map((x) => x.trim()).filter(Boolean);
      } else if (s.kind === "actionList") {
        cleaned[s.field] = (v as ActionItem[])
          .map((a) => ({ owner: a.owner.trim(), content: a.content.trim() }))
          .filter((a) => a.content);
      } else if (s.kind === "qaList") {
        cleaned[s.field] = (v as QaItem[])
          .map((q) => ({ question: q.question.trim(), answer: q.answer.trim() }))
          .filter((q) => q.question || q.answer);
      }
    }
    const total = tpl.sections.reduce(
      (acc, s) => acc + (cleaned[s.field] as unknown[]).length,
      0,
    );
    if (total === 0) {
      alert("최소 1개 항목은 입력해주세요.");
      return;
    }
    onSave(cleaned);
  }

  return (
    <div className="space-y-4 rounded-xl border border-rose-400/30 bg-rose-500/[0.04] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-rose-200">
          <strong>{tpl.label}</strong> {tpl.emoji} · {tpl.description}
        </p>
        <span className="text-[0.65rem] text-zinc-500">AI 호출 없음 · 입력 그대로 저장</span>
      </div>

      <div className="space-y-4">
        {tpl.sections.map((section) => (
          <ManualSection
            key={section.field}
            section={section}
            value={data[section.field]}
            onChange={(v) => setField(section.field, v)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          취소
        </button>
        <button
          type="button"
          onClick={buildAndSave}
          className="rounded-lg bg-rose-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-400"
        >
          회의록 저장 →
        </button>
      </div>
    </div>
  );
}

function ManualSection({
  section,
  value,
  onChange,
}: {
  section: TemplateSection;
  value: SectionValue;
  onChange: (v: SectionValue) => void;
}) {
  const headerLabel = `${section.emoji ? `${section.emoji} ` : ""}${section.label}`;

  if (section.kind === "stringList") {
    const items = value as string[];
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold text-zinc-200">{headerLabel}</p>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input"
              value={item}
              placeholder="한 줄 입력"
              onChange={(e) => {
                const next = items.slice();
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (items.length === 1) onChange([""]);
                else onChange(items.filter((_, idx) => idx !== i));
              }}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-rose-300"
              aria-label="삭제"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-200"
        >
          + 항목 추가
        </button>
      </div>
    );
  }

  if (section.kind === "actionList") {
    const items = value as ActionItem[];
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold text-zinc-200">{headerLabel}</p>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input w-32 shrink-0"
              value={item.owner}
              placeholder="담당자"
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], owner: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="input flex-1"
              value={item.content}
              placeholder="할 일 / 작업 내용"
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], content: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (items.length === 1) onChange([{ owner: "", content: "" }]);
                else onChange(items.filter((_, idx) => idx !== i));
              }}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-rose-300"
              aria-label="삭제"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { owner: "", content: "" }])}
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-200"
        >
          + 액션 추가
        </button>
      </div>
    );
  }

  // qaList
  const items = value as QaItem[];
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-zinc-200">{headerLabel}</p>
      {items.map((item, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-bold text-zinc-500">Q</span>
            <input
              className="input flex-1"
              value={item.question}
              placeholder="질문"
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], question: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (items.length === 1) onChange([{ question: "", answer: "" }]);
                else onChange(items.filter((_, idx) => idx !== i));
              }}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-rose-300"
              aria-label="삭제"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-bold text-zinc-500">A</span>
            <input
              className="input flex-1"
              value={item.answer}
              placeholder="답변 (없으면 비워두세요)"
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], answer: e.target.value };
                onChange(next);
              }}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { question: "", answer: "" }])}
        className="text-xs font-semibold text-zinc-400 hover:text-zinc-200"
      >
        + Q&amp;A 추가
      </button>
    </div>
  );
}
