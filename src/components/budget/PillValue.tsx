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
  const resolvedTone: PillTone = tone ?? (value > 0 ? "positive" : value < 0 ? "negative" : "neutral");

  if (emphasize) {
    const emphasizeStyles: Record<
      PillTone,
      {
        container: string;
        label: string;
        amount: string;
        button: string;
      }
    > = {
      positive: {
        container:
          "flex min-w-[220px] max-w-[260px] items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-100 px-4 py-3 shadow-[var(--cc-shadow-2)]",
        label: "text-xs font-semibold uppercase tracking-wide text-emerald-700",
        amount: "text-2xl font-bold text-emerald-900",
        button:
          "ml-auto rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-[var(--cc-shadow-1)] transition-colors hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      },
      negative: {
        container:
          "flex min-w-[220px] max-w-[260px] items-center gap-4 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 shadow-[var(--cc-shadow-2)]",
        label: "text-xs font-semibold uppercase tracking-wide text-rose-700",
        amount: "text-2xl font-bold text-rose-900",
        button:
          "ml-auto rounded-md bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-[var(--cc-shadow-1)] transition-colors hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
      },
      neutral: {
        container:
          "flex min-w-[220px] max-w-[260px] items-center gap-4 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 shadow-[var(--cc-shadow-2)]",
        label: "text-xs font-semibold uppercase tracking-wide text-slate-700",
        amount: "text-2xl font-bold text-slate-900",
        button:
          "ml-auto rounded-md bg-slate-500 px-3 py-1 text-xs font-semibold text-white shadow-[var(--cc-shadow-1)] transition-colors hover:bg-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
      },
      info: {
        container:
          "flex min-w-[220px] max-w-[260px] items-center gap-4 rounded-lg border border-sky-200 bg-sky-100 px-4 py-3 shadow-[var(--cc-shadow-2)]",
        label: "text-xs font-semibold uppercase tracking-wide text-sky-700",
        amount: "text-2xl font-bold text-sky-900",
        button:
          "ml-auto rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white shadow-[var(--cc-shadow-1)] transition-colors hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      }
    };

    const { container, label: labelStyles, amount, button } = emphasizeStyles[resolvedTone];

    return (
      <div className={container} role="status">
        <div className="flex flex-col leading-tight">
          <span className={labelStyles}>{label}</span>
          <span className={amount}>{fmtBRL(value)}</span>
        </div>
        <button type="button" className={button}>
          Atribuir
        </button>
      </div>
    );
  }

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
