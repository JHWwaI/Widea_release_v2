"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { connectWS } from "@/lib/ws";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/select-type", "/billing/success", "/billing/fail"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, token } = useAuth();

  // 토큰 변경마다 WS 재연결 (로그아웃 시 끊김)
  useEffect(() => {
    connectWS(token ?? null);
  }, [token]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 데스크탑(≥1024px)에서는 기본 노출, 모바일은 닫힘
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    // 모바일 오버레이만 페이지 이동 시 닫기
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    // 사이드바 자동 토글 X — 사용자가 햄버거 메뉴로만 직접 토글
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("widea_sidebar_visible");
    if (saved !== null) setSidebarVisible(saved === "1");
  }, []);

  // ngrok 무료 플랜 브라우저 경고 우회 — 전역 fetch에 헤더 자동 부착
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
    if (!apiBase || !apiBase.includes("ngrok")) return;
    const originalFetch = window.fetch.bind(window);
    if ((window as unknown as { __ngrokPatched?: boolean }).__ngrokPatched) return;
    (window as unknown as { __ngrokPatched?: boolean }).__ngrokPatched = true;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("ngrok")) {
        const headers = new Headers(init?.headers);
        if (!headers.has("ngrok-skip-browser-warning")) headers.set("ngrok-skip-browser-warning", "true");
        return originalFetch(input, { ...init, headers });
      }
      return originalFetch(input, init);
    };
  }, []);

  // Service Worker — 시연 안정성 위해 비활성. 기존 등록은 강제 unregister.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    }).catch(() => {});
    // 기존 캐시도 제거
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, []);

  const isPublicPage = PUBLIC_ROUTES.includes(pathname);

  if (isPublicPage) return <>{children}</>;

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="flex items-center gap-3 rounded-2xl px-6 py-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          <span
            className="inline-flex h-2 w-2 rounded-full"
            style={{
              background: "var(--ink-3)",
              animation: "pulse-glow 1.5s ease infinite",
            }}
          />
          <span className="text-sm" style={{ color: "var(--ink-3)" }}>
            Widea 워크스페이스를 불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  const handleMenuToggle = user
    ? () => {
        if (window.innerWidth < 1024) {
          setSidebarOpen((v) => !v);
        } else {
          setSidebarVisible((v) => {
            const next = !v;
            localStorage.setItem("widea_sidebar_visible", next ? "1" : "0");
            return next;
          });
        }
      }
    : undefined;

  const handleNavClick = () => {
    // 모바일 오버레이만 닫기. 데스크탑 사이드바는 햄버거 메뉴로만 토글한다.
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {!user ? <Navbar onMenuToggle={handleMenuToggle} /> : null}
      {user ? (
        <Sidebar
          open={sidebarOpen}
          visible={sidebarVisible}
          onClose={handleNavClick}
          onToggle={handleMenuToggle}
        />
      ) : null}
      <main
        className={[
          "px-3 pb-6 sm:px-4",
          user ? "pt-12 lg:pt-8" : "pt-[calc(var(--navbar-height)+0.25rem)]",
          user && sidebarVisible
            ? "lg:pl-[calc(var(--sidebar-width)+0.5rem)] lg:pr-3 transition-[padding] duration-300"
            : user
              ? "lg:pl-[4rem] lg:pr-5 transition-[padding] duration-300"
              : "lg:px-5 transition-[padding] duration-300",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
