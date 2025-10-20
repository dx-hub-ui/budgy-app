"use client";

import type { BudgetCategory } from "@/stores/budgetPlannerStore";

type HiddenCategoriesModalProps = {
  open: boolean;
  categories: BudgetCategory[];
  onClose: () => void;
  onUnhide: (categoryId: string) => void | Promise<void>;
  processingId: string | null;
};

export function HiddenCategoriesModal({
  open,
  categories,
  onClose,
  onUnhide,
  processingId
}: HiddenCategoriesModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-categorias-ocultas"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius)] border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 text-[var(--cc-text)] shadow-[var(--shadow-2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 id="modal-categorias-ocultas" className="text-lg font-semibold">
              Categorias ocultas
            </h2>
            <p className="mt-1 text-sm text-[var(--cc-text-muted)]">
              Reexiba uma categoria para voltar a vê-la na sua lista mensal.
            </p>
          </div>
          <button
            type="button"
            className="btn-link text-sm font-semibold"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-[var(--cc-border)] bg-[var(--cc-bg-elev)] p-6 text-center text-sm text-[var(--cc-text-muted)]">
            Nenhuma categoria oculta no momento.
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--cc-surface)] text-lg">
                    {category.icon ?? "🏷️"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--cc-text)]">{category.name}</p>
                    <p className="mt-1 text-xs text-[var(--cc-text-muted)]">{category.group_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--cc-border)] px-3 py-1.5 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onUnhide(category.id)}
                  disabled={processingId === category.id}
                >
                  {processingId === category.id ? "Reexibindo…" : "Reexibir"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
