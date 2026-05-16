"use client";

/**
 * Jitsi Meet 임베드 — 워크스페이스마다 독립 회의실.
 * 음성·화상·화면공유·채팅 전부 무료.
 * 같은 ideaId면 같은 회의실 자동 입장.
 */

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiAPI;
  }
}

type JitsiAPI = {
  dispose: () => void;
  executeCommand: (cmd: string, ...args: unknown[]) => void;
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Jitsi script load failed"));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

export default function VirtualMeeting({
  roomId,
  displayName,
  onClose,
}: {
  roomId: string;
  displayName: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        const safe = `widea-office-${roomId}`.replace(/[^a-zA-Z0-9-]/g, "-");
        const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName: safe,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: true,
            startWithVideoMuted: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              "microphone", "camera", "desktop", "chat",
              "raisehand", "tileview", "hangup", "settings", "fullscreen",
            ],
            SHOW_JITSI_WATERMARK: false,
            DEFAULT_BACKGROUND: "#0a0b10",
            DISABLE_VIDEO_BACKGROUND: true,
          },
        });
        apiRef.current = api;
        api.addListener("readyToClose", () => onClose());
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "회의 로드 실패");
      });
    return () => {
      cancelled = true;
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore */ }
        apiRef.current = null;
      }
    };
  }, [roomId, displayName, onClose]);

  return (
    <div className="absolute inset-y-3 right-3 z-[65] flex w-[420px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-zinc-400">회의</p>
          <p className="text-sm font-bold text-white">음성·화상·화면 공유</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-300 hover:bg-white/[0.08]"
        >
          닫기
        </button>
      </header>
      <div className="relative flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-rose-300">
            {error}
          </div>
        ) : (
          <>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
                회의실 연결 중...
              </div>
            ) : null}
            <div ref={containerRef} className="h-full w-full" />
          </>
        )}
      </div>
    </div>
  );
}
