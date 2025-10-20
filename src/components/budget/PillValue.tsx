import { fmtBRL } from "@/domain/format";

export type PillTone = "positive" | "negative" | "neutral" | "info";

type PillValueProps = {
  label: string;
  value: number;
  tone?: PillTone;
  emphasize?: boolean;
};

const toneStyles: Record<PillTone, string> = {
  positive: "bg-emerald-100 text-emerald-700 border-emerald-200",
  negative: "bg-rose-100 text-rose-700 border-rose-200",
  neutral: "bg-slate-200 text-slate-700 border-slate-300",
  info: "bg-sky-100 text-sky-700 border-sky-200"
};

export function PillValue({ label, value, tone, emphasize = false }: PillValueProps) {
  if (emphasize) {
    return (
      <div
        className="flex min-w-[220px] max-w-[260px] items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-100 px-4 py-3 shadow-[var(--cc-shadow-2)]"
        role="status"
      >
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{label}</span>
          <span className="text-2xl font-bold text-emerald-900">{fmtBRL(value)}</span>
        </div>
        <button
          type="button"
          className="ml-auto rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-[var(--cc-shadow-1)] transition-colors hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Atribuir
        </button>
      </div>
    );
  }

  const resolvedTone: PillTone = tone ?? (value > 0 ? "positive" : value < 0 ? "negative" : "neutral");
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
