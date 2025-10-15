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
  const baseStyles = toneStyles[resolvedTone];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm font-medium shadow-[var(--cc-shadow-1)] ${
        emphasize ? "text-base" : ""
      } ${baseStyles}`}
      role="status"
    >
      <span>{label}</span>
      <span className="font-semibold">{fmtBRL(value)}</span>
    </div>
  );
}
