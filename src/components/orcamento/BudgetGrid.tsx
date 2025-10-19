"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Plus } from "lucide-react";

import { fmtBRL, formatarInputMonetario, normalizarValorMonetario } from "@/domain/budgeting";
import { budgetPlannerSelectors, useBudgetPlannerStore } from "@/stores/budgetPlannerStore";

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type BudgetGridProps = {
  month: string;
  onEdit: (categoryId: string, value: number) => void;
  onOpenName: (categoryId: string) => void;
  onOpenDrawer: (categoryId: string) => void;
  onAddCategory: (groupName: string) => void;
  onOpenActivity: (categoryId: string, month: string) => void;
};

type CategoryRowProps = {
  name: string;
  activityCents: number;
  availableCents: number;
  assignedCents: number;
  onEdit: (value: number) => void;
  onOpenName: () => void;
  onOpenActivity: () => void;
};

function CategoryRow({
  name,
  activityCents,
  availableCents,
  assignedCents,
  onEdit,
  onOpenName,
  onOpenActivity
}: CategoryRowProps) {
  const [inputValue, setInputValue] = useState(formatarInputMonetario(assignedCents));
  const [rawValue, setRawValue] = useState(assignedCents);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const availableClass = availableCents > 0 ? "cc-pill-positive" : availableCents < 0 ? "cc-pill-negative" : "cc-pill-zero";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const cents = normalizarValorMonetario(event.target.value);
    setRawValue(cents);
    setInputValue(formatarInputMonetario(cents));
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onEdit(cents);
    }, 300);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onEdit(rawValue);
  };

  return (
    <div
      className="grid grid-cols-[minmax(200px,2.4fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(160px,1fr)] items-center border-b border-[var(--cc-border)] bg-[var(--cc-surface)] px-4 py-3 text-sm text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
      role="row"
    >
      <button
        type="button"
        className="text-left font-medium text-[var(--cc-text)]"
        onClick={(event) => {
          event.stopPropagation();
          onOpenName();
        }}
      >
        {name}
      </button>
      <div className="flex items-center">
        <input
          aria-label={`Atribuído para ${name}`}
          className="w-full rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-right font-semibold text-[var(--cc-text)] shadow-sm focus:border-[var(--ring)] focus:outline-none"
          value={inputValue}
          onChange={handleChange}
          onFocus={(event) => event.target.select()}
          onBlur={handleBlur}
          inputMode="numeric"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg px-3 py-1 text-right text-sm font-medium text-[var(--cc-text-muted)] transition hover:bg-[var(--cc-bg)]"
          onClick={(event) => {
            event.stopPropagation();
            onOpenActivity();
          }}
        >
          {fmtBRL(activityCents)}
        </button>
      </div>
      <div className="flex justify-end">
        <span className={classNames("cc-pill", availableClass)}>{fmtBRL(availableCents)}</span>
      </div>
    </div>
  );
}

export function BudgetGrid({
  month,
  onEdit,
  onOpenName,
  onOpenDrawer,
  onAddCategory,
  onOpenActivity
}: BudgetGridProps) {
  const groups = budgetPlannerSelectors.useGroups();
  const allocations = useBudgetPlannerStore((state) => state.allocations.byCategoryIdMonth);

  const handleEdit = (categoryId: string) => (value: number) => {
    onEdit(categoryId, value);
  };

  return (
    <div className="rounded-[var(--radius)] border border-[var(--cc-border)] bg-[var(--cc-surface)] shadow-[var(--shadow-1)]">
      <div className="grid grid-cols-[minmax(200px,2.4fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(160px,1fr)] border-b border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--cc-text-muted)]">
        <span>Categoria</span>
        <span className="text-right">Atribuído</span>
        <span className="text-right">Atividade</span>
        <span className="text-right">Disponível</span>
      </div>
      <div>
        {groups.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-[var(--cc-text-muted)]">
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          groups.map((group) => (
            <details key={group.name} open className="group">
              <summary className="cursor-pointer select-none border-b border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                <div className="flex items-center justify-between gap-2">
                  <span>{group.name}</span>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--cc-border)] bg-[var(--cc-bg)] text-[var(--cc-text-muted)] transition hover:border-[var(--ring)] hover:text-[var(--ring)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddCategory(group.name);
                    }}
                    aria-label={`Adicionar categoria em ${group.name}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </summary>
              <div role="rowgroup">
                {group.categories.map((category) => {
                  const allocation = allocations[category.id]?.[month];
                  const assigned = allocation?.assigned_cents ?? 0;
                  const activity = allocation?.activity_cents ?? 0;
                  const available = allocation?.available_cents ?? 0;
                  return (
                    <div
                      key={category.id}
                      role="row"
                      onClick={() => onOpenDrawer(category.id)}
                      className="cursor-pointer"
                    >
                      <CategoryRow
                        name={category.name}
                        activityCents={activity}
                        availableCents={available}
                        assignedCents={assigned}
                        onEdit={handleEdit(category.id)}
                        onOpenName={() => onOpenName(category.id)}
                        onOpenActivity={() => onOpenActivity(category.id, month)}
                      />
                    </div>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
