"use client";

import { useEffect, useRef, useState } from "react";

import type { BudgetCategory } from "@/stores/budgetPlannerStore";

export type CategoryNameModalProps = {
  category: BudgetCategory;
  onCancel: () => void;
  onConfirm: (name: string) => void;
  onHide: () => void;
  onDelete: () => void;
};

export function CategoryNameModal({ category, onCancel, onConfirm, onHide, onDelete }: CategoryNameModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm(value);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel, onConfirm, value]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-editar-categoria"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 text-[var(--cc-text)] shadow-[var(--shadow-2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="modal-editar-categoria" className="mb-4 text-lg font-semibold">
          Editar nome da categoria
        </h2>
        <div className="mb-6">
          <label htmlFor="categoria-nome" className="mb-2 block text-sm font-medium text-[var(--cc-text-muted)]">
            Nome
          </label>
          <input
            id="categoria-nome"
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-lg border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-2 text-[var(--cc-text)] shadow-sm focus:border-[var(--ring)] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
              onClick={onHide}
            >
              Ocultar
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--state-danger)] px-3 py-2 text-sm font-semibold text-[var(--state-danger)] transition hover:bg-[var(--state-danger)] hover:text-white"
              onClick={() => setConfirmingDelete(true)}
            >
              Excluir
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--cc-border)] px-3 py-2 text-sm font-semibold text-[var(--cc-text)] transition hover:bg-[var(--cc-bg-elev)]"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="cc-btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
              onClick={() => onConfirm(value)}
            >
              OK
            </button>
          </div>
        </div>

        {confirmingDelete ? (
          <div className="mt-6 rounded-lg border border-[var(--state-danger)] bg-[var(--state-danger)]/5 p-4 text-sm text-[var(--cc-text)]">
            <p className="font-semibold text-[var(--state-danger)]">Excluir categoria</p>
            <p className="mt-2 text-[var(--cc-text)]">
              Esta ação moverá a categoria para a lixeira. Você pode recuperá-la depois, mas as atribuições serão perdidas.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-link"
                onClick={() => setConfirmingDelete(false)}
              >
                Manter categoria
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--state-danger)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-90"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete();
                }}
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
