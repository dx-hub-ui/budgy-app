"use client";

import { useMemo } from "react";
import { RefreshCcw } from "lucide-react";

import GhostButton from "@/components/ui/GhostButton";

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
  badgeLabel?: string | null;
};

export type AccountHeaderProps = Props;

export default function AccountHeader({ name, subtitle, metrics, onReconcile, badgeLabel }: Props) {
  const cards = useMemo(() => metrics, [metrics]);
  const badgeText = badgeLabel === undefined ? "Conta ativa" : badgeLabel;
  const showBadge = typeof badgeText === "string" && badgeText.trim().length > 0;

  return (
    <header className="space-y-3 border-b border-[var(--cc-border)] pb-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-[var(--cc-text)]">{name}</h1>
            {showBadge ? (
              <span className="rounded-full bg-[var(--brand-soft-fill)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                {badgeText}
              </span>
            ) : null}
          </div>
          {subtitle && <p className="text-xs text-[var(--cc-text-muted)]">{subtitle}</p>}
        </div>
        {onReconcile && (
          <GhostButton icon={RefreshCcw} onClick={onReconcile} variant="primary" className="self-start">
            Reconciliar
          </GhostButton>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((metric) => {
          const toneClass = metric.tone === "positive"
            ? "text-emerald-600"
            : metric.tone === "negative"
            ? "text-rose-600"
            : "text-[var(--cc-text)]";
          return (
            <div key={metric.id} className="space-y-1">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                {metric.label}
              </p>
              <p className={`text-lg font-semibold ${toneClass}`}>{formatCurrency(metric.valueCents)}</p>
              {metric.helper && <p className="text-[0.7rem] text-[var(--cc-text-muted)]">{metric.helper}</p>}
            </div>
          );
        })}
      </div>
    </header>
  );
}
