import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx, humanizeKey } from "@/lib/product";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#A1A1AA", letterSpacing: "0.16em" }}>{eyebrow}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className="font-bold text-white"
            style={{ fontSize: "clamp(1.5rem, 2.4vw + 0.6rem, 2.25rem)", letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          {badge}
        </div>
        <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: "#a1a1aa" }}>
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  titleId,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  titleId?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-1.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#A1A1AA", letterSpacing: "0.16em" }}>{eyebrow}</p>
        ) : null}
        <h2 id={titleId} className="text-lg font-bold text-white sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Surface({
  children,
  className,
  muted = false,
  ...props
}: {
  children: ReactNode;
  muted?: boolean;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx("rounded-2xl", className)}
      style={
        muted
          ? { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", padding: "1.25rem" }
          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "1.5rem" }
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "default" | "accent" | "warm";
}) {
  const styles = {
    default: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" },
    accent: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" },
    warm: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" },
  };
  return (
    <div className="space-y-2 rounded-2xl p-5" style={styles[tone]}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#A8AACC" }}>{label}</p>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>{hint}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
}) {
  const styles = {
    neutral: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", color: "#A8AACC" },
    accent: { background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.22)", color: "#93AFFE" },
    success: { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)", color: "#6EE7B7" },
    warning: { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)", color: "#FCD34D" },
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold"
      style={styles[tone]}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-8 text-left"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px dashed rgba(255,255,255,0.1)" }}
    >
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="max-w-xl text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-5"
      role="status"
      aria-live="polite"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <span
        className="inline-flex h-2 w-2 animate-pulse rounded-full"
        style={{ background: "linear-gradient(135deg, #4F6EF7, #6366F1)" }}
      />
      <span className="text-sm" style={{ color: "var(--ink-3)" }}>{label}</span>
    </div>
  );
}

export function StructuredData({ data }: { data: unknown }) {
  if (data === null || data === undefined || data === "") {
    return <p className="text-sm" style={{ color: "var(--ink-3)" }}>No data available yet.</p>;
  }

  if (Array.isArray(data)) {
    const isSimple = data.every(
      (entry) =>
        entry === null ||
        entry === undefined ||
        typeof entry === "string" ||
        typeof entry === "number" ||
        typeof entry === "boolean",
    );

    if (isSimple) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.map((entry, index) => (
            <span
              key={`${entry}-${index}`}
              className="rounded-md px-2.5 py-1 text-xs font-medium"
              style={{ background: "rgba(79,110,247,0.1)", color: "#93AFFE" }}
            >
              {String(entry)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {data.map((entry, index) => (
          <div
            key={index}
            className="space-y-2 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>
              Item {index + 1}
            </p>
            <StructuredData data={entry} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
          <div
            key={key}
            className="space-y-2 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>
              {humanizeKey(key)}
            </p>
            <StructuredData data={value} />
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm leading-relaxed text-white">{String(data)}</p>;
}
