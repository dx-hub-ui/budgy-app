"use client";

import { useEffect, useMemo } from "react";

import { BudgetAllocationView } from "@/domain/budget";

import { CategoryGroup } from "./CategoryGroup";

type BudgetGridProps = {
  categories: BudgetAllocationView[];
  selection: string[];
  focusedId: string | null;
  onToggleSelection: (id: string, multi?: boolean) => void;
  onReplaceSelection: (ids: string[]) => void;
  onFocus: (id: string | null) => void;
  onBudgetChange: (id: string, value: number) => void;
};

export function BudgetGrid({
  categories,
  selection,
  focusedId,
  onToggleSelection,
  onReplaceSelection,
  onFocus,
  onBudgetChange
}: BudgetGridProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, BudgetAllocationView[]>();
    for (const allocation of categories) {
      const group = allocation.group_name;
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(allocation);
    }
    return Array.from(map.entries());
  }, [categories]);

  const orderedIds = useMemo(() => categories.map((item) => item.id), [categories]);
  const selectionSet = useMemo(() => new Set(selection), [selection]);

  useEffect(() => {
    if (!focusedId) return;
    const row = document.querySelector<HTMLTableRowElement>(`tr[data-category-id='${focusedId}']`);
    if (row) {
      row.focus();
    }
  }, [focusedId, categories]);

  function handleSelectRow(id: string, multi?: boolean, range?: boolean) {
    const index = orderedIds.indexOf(id);
    if (index === -1) return;
    if (range && focusedId) {
      const anchorIndex = orderedIds.indexOf(focusedId);
      if (anchorIndex !== -1) {
        const [start, end] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
        const ids = orderedIds.slice(start, end + 1);
        onReplaceSelection(ids);
      }
    } else if (multi) {
      onToggleSelection(id, true);
    } else {
      onReplaceSelection([id]);
    }
    onFocus(id);
  }

  function handleKeyCommand(id: string, command: "up" | "down" | "edit" | "save" | "cancel") {
    const index = orderedIds.indexOf(id);
    if (index === -1) return;
    if (command === "down") {
      const next = orderedIds[index + 1] ?? orderedIds[index];
      onFocus(next);
      onReplaceSelection([next]);
      return;
    }
    if (command === "up") {
      const prev = orderedIds[index - 1] ?? orderedIds[index];
      onFocus(prev);
      onReplaceSelection([prev]);
      return;
    }
    if (command === "edit") {
      const input = document.querySelector<HTMLInputElement>(`tr[data-category-id='${id}'] input`);
      input?.focus();
      onFocus(id);
      onReplaceSelection([id]);
      return;
    }
    if (command === "cancel") {
      const row = document.querySelector<HTMLTableRowElement>(`tr[data-category-id='${id}']`);
      row?.focus();
      return;
    }
    if (command === "save") {
      const row = document.querySelector<HTMLTableRowElement>(`tr[data-category-id='${id}']`);
      row?.focus();
    }
  }

  return (
    <div className="space-y-4">
      {grouped.map(([group, allocations]) => (
        <CategoryGroup
          key={group}
          name={group}
          allocations={allocations}
          selectedIds={selectionSet}
          focusedId={focusedId}
          onSelectRow={handleSelectRow}
          onBudgetChange={onBudgetChange}
          onKeyCommand={handleKeyCommand}
        />
      ))}
    </div>
  );
}
