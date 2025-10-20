// src/components/budget/PillValue.tsx
import { fmtBRL } from "@/domain/format";

export type PillTone = "positive" | "negative" | "neutral" | "info";

type PillValueProps = {
  label: string;
  value: number;
  tone?: PillTone;
  emphasize?: boolean;
  onAssign?: () => void;
  ctaLabel?: string;
};

const toneStyles: Record<PillTone, string> = {
  positive: "bg-emerald-100 text-emerald-700 border-emerald-200",
  negative: "bg-rose-100 text-rose-700 border-rose-200",
  neutral: "bg-slate-200 text-slate-700 border-slate-300",
  info: "bg-sky-100 text-sky-700 border-sky-200"
};

export function PillValue({
  label,
  value,
  tone,
  emphasize = false,
  onAssign,
  ctaLabel = "Assign"
}: PillValueProps) {
  const resolvedTone: PillTone = tone ?? (value > 0 ? "positive" : value < 0 ? "negative" : "neutral");

  // Emphasized version redesigned to match the green "Ready to Assign" card
  if (emphasize) {
    return (
      <div
        className="inline-flex items-center gap-3 rounded-lg border px-3 py-2 shadow-sm"
        role="status"
        style={{
          background: "var(--budget-ready-bg)",
          borderColor: "var(--budget-ready-border)",
          boxShadow: "var(--budget-ready-shadow)",
          maxWidth: "var(--budget-ready-max-width)"
        }}
      >
        <div className="flex flex-col leading-tight">
          <span
            className="uppercase tracking-wide"
            style={{
              fontSize: "var(--budget-label-size)",
              letterSpacing: "var(--budget-label-tracking)",
              color: "var(--budget-ready-text-muted)"
            }}
          >
            {label}
          </span>
          <span
            className="tabular font-semibold"
            style={{ fontSize: "var(--budget-ready-amount-size)", color: "var(--budget-ready-text)" }}
          >
            {fmtBRL(value)}
          </span>
        </div>

        <button
          type="button"
          onClick={onAssign}
          className="ml-auto inline-flex items-center gap-2 rounded-md px-3 py-1 font-semibold focus:outline-none"
          style={{
            background: "var(--budget-ready-cta-bg)",
            color: "var(--cc-white)",
            boxShadow: "var(--budget-ready-cta-shadow)",
            fontSize: "var(--budget-cta-size)",
            letterSpacing: "var(--budget-cta-tracking)"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--budget-ready-cta-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--budget-ready-cta-bg)")}
        >
          {ctaLabel}
          <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 7l5 6 5-6H5z" fill="currentColor" />
          </svg>
        </button>
      </div>
    );
  }

  // Small pill version unchanged
  const baseStyles = toneStyles[resolvedTone];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm font-medium shadow-[var(--cc-shadow-1)] ${baseStyles}`}
      role="status"
    >
      <span>{label}</span>
      <span className="font-semibold">{fmtBRL(value)}</span>
    </div>
  );
}
