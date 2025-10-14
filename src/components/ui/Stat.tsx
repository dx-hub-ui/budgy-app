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
        "cc-card cc-stack-24 p-4 text-[var(--cc-text)] transition-colors",
        "dark:bg-[var(--card-bg-dark)]",
        className
      )}
      role="group"
      aria-label={`${label}: ${value}${delta ? ` (${delta.value})` : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{
              backgroundColor: "var(--brand-soft-bg)",
              color: "var(--brand)",
            }}
            aria-hidden
          >
            {icon}
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cc-text-muted)]">
              {label}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[22px] leading-[28px] font-semibold text-[var(--cc-text)]">
                {value}
              </span>
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium",
                    delta.positive
                      ? "border-[var(--cc-border)] bg-[var(--brand-soft-bg)] text-[var(--brand)]"
                      : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200"
                  )}
                >
                  {delta.value}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-[var(--cc-text-muted)] transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-surface)] dark:hover:bg-white/10 dark:focus-visible:ring-offset-[var(--cc-surface)]"
          aria-label={menuLabel}
        >
          <span aria-hidden>⋯</span>
        </button>
      </div>
    </div>
  );
}
