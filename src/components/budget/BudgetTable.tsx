"use client";

import { fmtBRL } from "@/domain/format";

export type BudgetTableItem = {
  id: string;
  category_id: string | null;
  name: string;
  color?: string | null;
  budgeted_cents: number;
  activity_cents: number;
  available_cents: number;
  rollover: boolean;
  prev_available_cents: number;
};

type BudgetTableProps = {
  items: BudgetTableItem[];
  onEdit: (id: string, patch: Partial<BudgetTableItem>) => void;
  onToggleRollover: (id: string) => void;
};

function usageTone(item: BudgetTableItem) {
  if (item.available_cents < 0) return "text-red-600";
  const ratio = item.budgeted_cents > 0 ? item.activity_cents / item.budgeted_cents : 0;
  if (ratio > 0.9) return "text-red-600";
  if (ratio > 0.6) return "text-amber-600";
  return "text-green-600";
}

function availableLabel(item: BudgetTableItem) {
  const prev = item.rollover ? item.prev_available_cents : 0;
  const source = prev !== 0 ? `Saldo anterior ${fmtBRL(prev)}` : "Sem saldo anterior";
  return `${source}. Rollover ${item.rollover ? "ativado" : "desligado"}.`;
}

export function BudgetTable({ items, onEdit, onToggleRollover }: BudgetTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--cc-text-muted)]">
            <th className="pb-3 pr-3">Categoria</th>
            <th className="pb-3 pr-3">Orçado</th>
            <th className="pb-3 pr-3">Gasto</th>
            <th className="pb-3 pr-3">Disponível</th>
            <th className="pb-3">Rollover</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t" style={{ borderColor: "var(--cc-border)" }}>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded"
                    style={{ background: item.color ?? "var(--cc-primary)" }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-[var(--cc-text)]">
                    {item.name}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-3 align-middle">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  style={{ borderColor: "var(--cc-border)" }}
                  value={Number((item.budgeted_cents / 100).toFixed(2))}
                  onChange={(event) => {
                    const value = event.target.value === "" ? 0 : Number(event.target.value);
                    const cents = Math.round(value * 100);
                    onEdit(item.id, { budgeted_cents: cents });
                  }}
                  aria-label={`Valor orçado para ${item.name}`}
                />
              </td>
              <td className="py-3 pr-3 align-middle text-sm text-[var(--cc-text)]">
                {fmtBRL(item.activity_cents)}
              </td>
              <td className={`py-3 pr-3 align-middle text-sm font-semibold ${usageTone(item)}`}>
                <span aria-label={availableLabel(item)}>{fmtBRL(item.available_cents)}</span>
              </td>
              <td className="py-3 align-middle">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--cc-text)]">
                  <input
                    type="checkbox"
                    checked={item.rollover}
                    onChange={() => onToggleRollover(item.id)}
                    aria-label={`Ativar rollover para ${item.name}`}
                  />
                  <span>{item.rollover ? "Sim" : "Não"}</span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
