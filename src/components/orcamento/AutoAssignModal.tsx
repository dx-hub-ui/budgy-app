"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { fmtBRL } from "@/domain/budgeting";

export type AutoAssignCategory = {
  id: string;
  name: string;
  group: string;
  assignedCents: number;
  isHidden: boolean;
  isDeleted: boolean;
};

export type AutoAssignModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignments: Array<{ categoryId: string; value: number }>) => Promise<void> | void;
  categories: AutoAssignCategory[];
  readyToAssignCents: number;
  isSubmitting?: boolean;
};

export function AutoAssignModal({
  open,
  onClose,
  onConfirm,
  categories,
  readyToAssignCents,
  isSubmitting = false
}: AutoAssignModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const defaults = categories
      .filter((category) => !category.isHidden && !category.isDeleted)
      .map((category) => category.id);
    setSelectedIds(new Set(defaults));
  }, [categories, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const selectedCategories = useMemo(() => {
    return categories.filter((category) => selectedIds.has(category.id));
  }, [categories, selectedIds]);

  const distribution = useMemo(() => {
    if (readyToAssignCents <= 0) return [] as Array<{ categoryId: string; addCents: number }>;
    if (selectedCategories.length === 0) return [] as Array<{ categoryId: string; addCents: number }>;
    const baseShare = Math.floor(readyToAssignCents / selectedCategories.length);
    let remainder = readyToAssignCents % selectedCategories.length;
    return selectedCategories.map((category) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return {
        categoryId: category.id,
        addCents: baseShare + extra
      };
    });
  }, [readyToAssignCents, selectedCategories]);

  const previewMap = useMemo(() => {
    const map = new Map<string, { addCents: number; totalCents: number }>();
    distribution.forEach(({ categoryId, addCents }) => {
      const category = categories.find((item) => item.id === categoryId);
      if (!category) return;
      map.set(categoryId, {
        addCents,
        totalCents: category.assignedCents + addCents
      });
    });
    return map;
  }, [categories, distribution]);

  const handleToggle = (categoryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(categories.map((category) => category.id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (distribution.length === 0) return;
    const assignments = distribution.map(({ categoryId, addCents }) => {
      const category = categories.find((item) => item.id === categoryId);
      const currentAssigned = category?.assignedCents ?? 0;
      return { categoryId, value: currentAssigned + addCents };
    });
    await onConfirm(assignments);
  };

  if (!open) return null;

  const selectedCount = selectedIds.size;
  const readyBRL = fmtBRL(readyToAssignCents);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-assign-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-[var(--radius)] border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 text-[var(--cc-text)] shadow-[var(--shadow-2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 id="auto-assign-modal-title" className="text-lg font-semibold">
            Distribuir automaticamente
          </h2>
          <p className="text-sm text-[var(--cc-text-muted)]">
            Distribua {readyBRL} entre as categorias selecionadas. Ajuste a seleção para controlar como o saldo será aplicado.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--cc-text-muted)]">
          <span>
            {selectedCount} {selectedCount === 1 ? "categoria selecionada" : "categorias selecionadas"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full border border-[var(--cc-border)] px-3 py-1 text-xs font-semibold text-[var(--cc-text)] transition hover:border-[var(--ring)] hover:text-[var(--ring)]"
              onClick={handleSelectAll}
            >
              Selecionar todas
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--cc-border)] px-3 py-1 text-xs font-semibold text-[var(--cc-text)] transition hover:border-[var(--ring)] hover:text-[var(--ring)]"
              onClick={handleClearAll}
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-80 overflow-y-auto rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-bg-elev)]">
          <ul className="divide-y divide-[var(--cc-border)] text-sm">
            {categories.map((category) => {
              const preview = previewMap.get(category.id);
              return (
                <li key={category.id} className="flex items-center gap-4 px-4 py-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(category.id)}
                      onChange={() => handleToggle(category.id)}
                    />
                    <span className="text-[var(--cc-text)]">
                      <span className="block font-medium">{category.name}</span>
                      <span className="block text-xs text-[var(--cc-text-muted)]">{category.group}</span>
                    </span>
                  </label>
                  <div className="ml-auto text-right">
                    {preview ? (
                      <div className="flex flex-col items-end text-xs text-[var(--cc-text-muted)]">
                        <span className="text-sm font-semibold text-[var(--cc-text)]">
                          + {fmtBRL(preview.addCents)}
                        </span>
                        <span>
                          Novo total: <strong>{fmtBRL(preview.totalCents)}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--cc-text-muted)]">
                        Atual: <strong>{fmtBRL(category.assignedCents)}</strong>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button type="button" className="btn-link" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={distribution.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Distribuindo..." : "Confirmar distribuição"}
          </button>
        </div>
      </form>
    </div>
  );
}
