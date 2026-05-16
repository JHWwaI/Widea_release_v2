"use client";

import { useEffect, useState } from "react";

type Step = "select" | "card" | "processing" | "done" | "error";

const CARD_BRANDS = [
  { id: "shinhan", name: "신한카드", color: "#0046FF" },
  { id: "samsung", name: "삼성카드", color: "#1428A0" },
  { id: "hyundai", name: "현대카드", color: "#000000" },
  { id: "kb",      name: "KB국민",   color: "#FFB81C" },
  { id: "lotte",   name: "롯데카드", color: "#ED1C24" },
  { id: "woori",   name: "우리카드", color: "#0071CE" },
  { id: "hana",    name: "하나카드", color: "#008C95" },
  { id: "bc",      name: "BC카드",   color: "#E60012" },
];

interface MockTossModalProps {
  open: boolean;
  planLabel: string;
  amountKRW: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function MockTossModal({ open, planLabel, amountKRW, onClose, onConfirm }: MockTossModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [brand, setBrand] = useState<string>("");
  const [cardNum, setCardNum] = useState("4330 1234 5678 9012");
  const [exp, setExp]         = useState("12 / 30");
  const [cvc, setCvc]         = useState("000");
  const [pwd, setPwd]         = useState("00");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("select");
      setBrand("");
      setErrorMsg("");
    }
  }, [open]);

  if (!open) return null;

  async function handlePay() {
    setStep("processing");
    setErrorMsg("");
    // 시각적 처리 시간 (실제 결제처럼)
    await new Promise((r) => setTimeout(r, 1400));
    try {
      await onConfirm();
      setStep("done");
      // 1초 뒤 모달 닫기
      setTimeout(() => onClose(), 900);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "결제 처리 실패");
      setStep("error");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== "processing") onClose(); }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Toss 스타일 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "#0064FF" }}
            >
              T
            </div>
            <span className="text-sm font-bold text-gray-900">toss payments</span>
            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-700">
              TEST
            </span>
          </div>
          {step !== "processing" ? (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700"
              aria-label="닫기"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* 결제 정보 */}
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">결제 금액</span>
            <span className="text-xl font-bold text-gray-900">
              {amountKRW.toLocaleString("ko-KR")}원
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{planLabel} 구독 (월간)</p>
        </div>

        {/* Step 본문 */}
        <div className="min-h-[280px] px-5 py-5">
          {step === "select" && (
            <>
              <p className="mb-3 text-sm font-semibold text-gray-900">카드사 선택</p>
              <div className="grid grid-cols-4 gap-2">
                {CARD_BRANDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setBrand(b.id); setStep("card"); }}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-2 py-3 transition-colors hover:border-blue-400 hover:bg-white/[0.06]"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded text-[0.6rem] font-bold text-white"
                      style={{ background: b.color }}
                    >
                      {b.name[0]}
                    </span>
                    <span className="text-[0.7rem] font-medium text-gray-700">{b.name}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-center text-[0.7rem] text-gray-400">
                테스트 환경 — 실제 카드 청구는 일어나지 않습니다.
              </p>
            </>
          )}

          {step === "card" && (
            <>
              <button
                type="button"
                onClick={() => setStep("select")}
                className="mb-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              >
                ← 카드사 변경
              </button>
              <p className="mb-3 text-sm font-semibold text-gray-900">
                {CARD_BRANDS.find((b) => b.id === brand)?.name} 정보 입력
              </p>
              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-gray-500">카드번호</label>
                  <input
                    value={cardNum}
                    onChange={(e) => setCardNum(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono tracking-wider text-gray-900 focus:border-blue-400 focus:outline-none"
                    inputMode="numeric"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-medium text-gray-500">유효기간 MM / YY</label>
                    <input
                      value={exp}
                      onChange={(e) => setExp(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-medium text-gray-500">CVC</label>
                    <input
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-900 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-gray-500">비밀번호 앞 2자리</label>
                  <input
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    type="password"
                    maxLength={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handlePay}
                className="mt-5 w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#0064FF" }}
              >
                {amountKRW.toLocaleString("ko-KR")}원 결제하기
              </button>
              <p className="mt-3 text-center text-[0.7rem] text-gray-400">
                🔒 SSL 보안 결제 · 테스트 환경
              </p>
            </>
          )}

          {step === "processing" && (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3">
              <div
                className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200"
                style={{ borderTopColor: "#0064FF" }}
              />
              <p className="text-sm font-medium text-gray-700">결제를 처리하는 중입니다</p>
              <p className="text-xs text-gray-400">잠시만 기다려주세요...</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">결제가 완료되었습니다</p>
              <p className="text-xs text-gray-500">{planLabel} 플랜이 활성화되었습니다</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <svg className="h-7 w-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">결제 실패</p>
              <p className="text-xs text-gray-500">{errorMsg}</p>
              <button
                type="button"
                onClick={() => setStep("card")}
                className="mt-2 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
