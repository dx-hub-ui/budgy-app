import { type ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type StatDelta = {
  value: string;
  positive: boolean;
};

type StatProps = {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: StatDelta;
  className?: string;
  menuLabel?: string;
  onMenuClick?: () => void;
};

export default function Stat({
  icon,
  label,
  value,
  delta,
  className,
  menuLabel = "Abrir menu de opções",
  onMenuClick,
}: StatProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[var(--radius)] border bg-[var(--card-bg-light)] p-5 shadow-[var(--shadow)]",
        "text-[var(--cc-text)] transition-colors",
        "dark:bg-[var(--card-bg-dark)]",
        className
      )}
      style={{ borderColor: "var(--cc-border)" }}
      role="group"
      aria-label={`${label}: ${value}${delta ? ` (${delta.value})` : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-4">
          <span
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{
              backgroundColor: "rgba(52, 195, 143, 0.12)",
              color: "var(--brand)",
            }}
            aria-hidden
          >
            {icon}
          </span>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                {label}
              </span>
              {delta && (
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    delta.positive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                  )}
                >
                  {delta.value}
                </span>
              )}
            </div>
            <span className="text-xl font-semibold text-[var(--cc-text)]">{value}</span>
          </div>
        </div>
        <span
          role="presentation"
          className="relative"
        >
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg text-[var(--muted)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg-light)] hover:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:ring-offset-[var(--card-bg-dark)]"
            aria-label={menuLabel}
          >
            <span aria-hidden>⋯</span>
          </button>
        </span>
      </div>
    </div>
  );
}
