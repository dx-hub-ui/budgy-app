"use client";

import { useState } from "react";

import { BudgetAllocationView } from "@/domain/budget";

import { CategoryRow } from "./CategoryRow";

type CategoryGroupProps = {
  name: string;
  allocations: BudgetAllocationView[];
  selectedIds: Set<string>;
  focusedId: string | null;
  onSelectRow: (id: string, multi?: boolean, range?: boolean) => void;
  onBudgetChange: (id: string, value: number) => void;
  onKeyCommand: (id: string, command: "up" | "down" | "edit" | "save" | "cancel") => void;
};

export function CategoryGroup({
  name,
  allocations,
  selectedIds,
  focusedId,
  onSelectRow,
  onBudgetChange,
  onKeyCommand
}: CategoryGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--cc-border)] bg-[var(--cc-surface)] shadow-[var(--cc-shadow-1)]">
      <header
        className="flex cursor-pointer items-center justify-between bg-[var(--cc-bg-elev)] px-4 py-3 text-sm font-semibold text-[var(--cc-text)]"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{name}</span>
        <span aria-hidden className="text-xs text-[var(--cc-text-muted)]">
          {open ? "Fechar" : "Abrir"}
        </span>
      </header>
      {open && (
        <table className="min-w-full border-collapse">
          <tbody>
            {allocations.map((allocation) => (
              <CategoryRow
                key={allocation.id}
                allocation={allocation}
                isSelected={selectedIds.has(allocation.id)}
                isFocused={focusedId === allocation.id}
                onSelect={onSelectRow}
                onBudgetChange={onBudgetChange}
                onKeyCommand={onKeyCommand}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
