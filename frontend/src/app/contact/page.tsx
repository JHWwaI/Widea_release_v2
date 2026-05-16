"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { PageHeader, Surface } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

export default function ContactPage() {
  const { token } = useAuth();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api("POST", "/api/contact", { subject: form.subject, message: form.message }, token ?? undefined);
      setSent(true);
      setForm({ subject: "", message: "" });
    } catch (caught) {
      setError(readError(caught, "문의 전송에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <div className="workspace-grid fade-up">
        <PageHeader
          eyebrow="고객 지원"
          title="문의하기"
          description="서비스 이용 중 궁금한 점이나 문제가 있으시면 아래 양식으로 문의해주세요."
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Surface className="space-y-5">
            <div>
              <p className="eyebrow">문의 양식</p>
              <h2 className="text-2xl font-semibold text-gray-900">문의 양식</h2>
            </div>

            {sent ? (
              <div className="rounded-xl border border-emerald-100 bg-white/[0.06] p-6 text-center">
                <p className="text-lg font-semibold text-emerald-800">문의가 접수되었습니다</p>
                <p className="mt-2 text-sm text-zinc-700">
                  빠른 시일 내에 답변드리겠습니다.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="btn-secondary mt-4 text-sm"
                >
                  추가 문의하기
                </button>
              </div>
            ) : (
              <>
                {error ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div>
                    <label htmlFor="subject" className="field-label">제목</label>
                    <input
                      id="subject"
                      value={form.subject}
                      onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className="input"
                      placeholder="문의 제목을 입력해주세요"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="field-label">내용</label>
                    <textarea
                      id="message"
                      value={form.message}
                      onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                      className="textarea min-h-[160px]"
                      placeholder="문의 내용을 상세히 적어주세요"
                      required
                    />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary w-full">
                    {submitting ? "전송 중..." : "문의 보내기"}
                  </button>
                </form>
              </>
            )}
          </Surface>

          <Surface className="space-y-5">
            <div>
              <p className="eyebrow">빠른 도움말</p>
              <h2 className="text-2xl font-semibold text-gray-900">자주 묻는 질문</h2>
            </div>

            <div className="grid gap-3">
              {[
                {
                  q: "크레딧은 어떻게 충전하나요?",
                  a: "구독 및 결제 페이지에서 플랜을 업그레이드하면 크레딧이 자동 지급됩니다.",
                },
                {
                  q: "아이디어 분석에 크레딧이 얼마나 소모되나요?",
                  a: "Idea Match: 10 cr, Blueprint: 5 cr, Discovery: 2 cr이 각각 차감됩니다.",
                },
                {
                  q: "생성된 아이디어의 정확도는 어느 정도인가요?",
                  a: "AI가 969개 이상의 글로벌 사례를 분석하여 도출하지만, 실제 창업 전 반드시 자체 검증이 필요합니다.",
                },
                {
                  q: "팀원을 추가할 수 있나요?",
                  a: "TEAM 또는 ENTERPRISE 플랜에서 팀 기능을 지원할 예정입니다.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">{item.q}</p>
                  <p className="mt-1.5 text-sm text-gray-500">{item.a}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-blue-100 bg-white/[0.06] p-4">
              <p className="text-sm font-semibold text-blue-800">직접 연락</p>
              <p className="mt-1 text-sm text-blue-600">
                support@widea.kr
              </p>
            </div>
          </Surface>
        </div>
      </div>
    </AuthGuard>
  );
}
