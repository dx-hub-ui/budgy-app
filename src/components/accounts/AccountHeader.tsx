"use client";

import { useMemo } from "react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "R$ 0,00";
  return currencyFormatter.format(value / 100);
}

type Metric = {
  id: string;
  label: string;
  valueCents: number;
  tone?: "positive" | "negative" | "neutral";
  helper?: string;
};

export type AccountMetric = Metric;

type Props = {
  name: string;
  subtitle?: string;
  metrics: Metric[];
  onReconcile?: () => void;
};

export type AccountHeaderProps = Props;

export default function AccountHeader({ name, subtitle, metrics, onReconcile }: Props) {
  const cards = useMemo(() => metrics, [metrics]);

  return (
    <header className="space-y-6 border-b border-[var(--cc-border)] pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--cc-text)]">{name}</h1>
            <span className="rounded-full bg-[var(--brand-soft-fill)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--cc-text)]">
              Conta ativa
            </span>
          </div>
          {subtitle && <p className="text-sm text-[var(--cc-text-muted)]">{subtitle}</p>}
        </div>
        {onReconcile && (
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center self-start rounded-lg bg-[var(--cc-accent)] px-4 text-sm font-semibold text-slate-900 transition hover:brightness-95"
            onClick={onReconcile}
          >
            Reconciliar
          </button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {cards.map((metric) => {
          const toneClass = metric.tone === "positive"
            ? "text-emerald-600"
            : metric.tone === "negative"
            ? "text-rose-600"
            : "text-[var(--cc-text)]";
          return (
            <div key={metric.id} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                {metric.label}
              </p>
              <p className={`text-2xl font-semibold ${toneClass}`}>{formatCurrency(metric.valueCents)}</p>
              {metric.helper && <p className="text-xs text-[var(--cc-text-muted)]">{metric.helper}</p>}
            </div>
          );
        })}
      </div>
    </header>
  );
}
