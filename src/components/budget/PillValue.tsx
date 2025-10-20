// src/components/budget/PillValue.tsx
import { fmtBRL } from "@/domain/format";

export type PillTone = "positive" | "negative" | "neutral" | "info";

type PillValueProps = {
  label: string;
  value: number;
  tone?: PillTone;
  emphasize?: boolean;
  onAssign?: () => void;
};

export function PillValue({
  label,
  value,
  tone,
  emphasize = false,
  onAssign
}: PillValueProps) {
  if (emphasize) {
    // Compact “Ready to Assign” card
    return (
      <div
        className="inline-flex items-center gap-3 rounded-md border px-3 py-2 shadow-sm"
        style={{
          background: "var(--budget-ready-bg)",
          borderColor: "var(--budget-ready-border)",
          boxShadow: "var(--budget-ready-shadow)",
          maxWidth: "var(--budget-ready-max-width)",
        }}
      >
        <div className="flex flex-col leading-tight">
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--budget-ready-text-muted)",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--budget-ready-text)",
            }}
          >
            {fmtBRL(value)}
          </span>
        </div>
        <button
          type="button"
          onClick={onAssign}
          className="ml-auto rounded-md px-3 py-1 text-xs font-semibold focus:outline-none transition"
          style={{
            background: "var(--budget-ready-cta-bg)",
            color: "white",
            boxShadow: "var(--budget-ready-cta-shadow)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--budget-ready-cta-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--budget-ready-cta-bg)";
          }}
        >
          Assign ▾
        </button>
      </div>
    );
  }

  // Default small tone pills
  const toneMap = {
    positive: "bg-emerald-100 text-emerald-700 border-emerald-200",
    negative: "bg-rose-100 text-rose-700 border-rose-200",
    neutral: "bg-slate-200 text-slate-700 border-slate-300",
    info: "bg-sky-100 text-sky-700 border-sky-200",
  } as const;

  const resolvedTone =
    tone ?? (value > 0 ? "positive" : value < 0 ? "negative" : "neutral");
  const toneClass = toneMap[resolvedTone];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm font-medium shadow-sm ${toneClass}`}
      role="status"
    >
      <span>{label}</span>
      <span className="font-semibold">{fmtBRL(value)}</span>
    </div>
  );
}
