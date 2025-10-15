"use client";

import { KeyboardEvent, useMemo } from "react";

import { BudgetAllocationView } from "@/domain/budget";
import { fmtBRL } from "@/domain/format";

import { FieldCurrency } from "../ui/FieldCurrency";
import { PillTone, PillValue } from "./PillValue";

type CategoryRowProps = {
  allocation: BudgetAllocationView;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (id: string, multi?: boolean, range?: boolean) => void;
  onBudgetChange: (id: string, value: number) => void;
  onKeyCommand: (id: string, command: "up" | "down" | "edit" | "save" | "cancel") => void;
};

function formatGoal(allocation: BudgetAllocationView) {
  const goal = allocation.goal;
  if (!goal) return null;
  const amount = fmtBRL(goal.amount_cents);
  if (goal.goal_type === "MFG") {
    return `Meta mensal ${amount}`;
  }
  if (goal.goal_type === "TBD" && goal.target_month) {
    const date = new Date(goal.target_month);
    const target = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    return `Meta até ${target} (${amount})`;
  }
  return `Meta de saldo ${amount}`;
}

export function CategoryRow({
  allocation,
  isSelected,
  isFocused,
  onSelect,
  onBudgetChange,
  onKeyCommand
}: CategoryRowProps) {
  const goalLabel = useMemo(() => formatGoal(allocation), [allocation]);

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      onKeyCommand(allocation.id, "down");
      return;
    }
    if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      onKeyCommand(allocation.id, "up");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onKeyCommand(allocation.id, "save");
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onKeyCommand(allocation.id, "cancel");
      return;
    }
    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      onKeyCommand(allocation.id, "edit");
    }
  }

  const availableTone: PillTone =
    allocation.available_cents > 0 ? "positive" : allocation.available_cents < 0 ? "negative" : "neutral";

  return (
    <tr
      data-category-id={allocation.id}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`group cursor-pointer border-b border-[var(--cc-border)] transition-colors focus:outline-none ${
        isSelected ? "bg-emerald-50" : "hover:bg-[var(--cc-bg-elev)]"
      }`}
      onClick={(event) => onSelect(allocation.id, event.metaKey || event.ctrlKey, event.shiftKey)}
    >
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-1 inline-flex h-3 w-3 rounded-full"
            style={{ backgroundColor: allocation.color ?? "var(--cc-accent)" }}
          />
          <div>
            <div className={`text-sm font-medium ${isFocused ? "text-[var(--cc-accent)]" : "text-[var(--cc-text)]"}`}>
              {allocation.name}
            </div>
            {goalLabel && <div className="text-xs text-[var(--cc-text-muted)]">{goalLabel}</div>}
          </div>
        </div>
      </td>
      <td className="w-40 px-4 py-3 align-middle">
        <FieldCurrency
          value={allocation.budgeted_cents}
          onChange={(value) => onBudgetChange(allocation.id, value)}
          aria-label={`Valor orçado para ${allocation.name}`}
          className="bg-[var(--cc-surface)] text-right font-medium text-[var(--cc-text)] focus:ring-2 focus:ring-[var(--cc-accent)]"
        />
      </td>
      <td className="w-32 px-4 py-3 text-right text-sm font-medium text-[var(--cc-text-muted)]">
        {fmtBRL(allocation.activity_cents)}
      </td>
      <td className="w-40 px-4 py-3 text-right">
        <PillValue label="Disponível" value={allocation.available_cents} tone={availableTone} />
      </td>
    </tr>
  );
}
