"use client";

type ActionsBarProps = {
  onCopyPrevious: () => void;
  onDistributeAvg: () => void;
  onSave: () => void;
  disabled?: boolean;
};

export function ActionsBar({ onCopyPrevious, onDistributeAvg, onSave, disabled }: ActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="h-10 rounded-md border px-4 text-sm font-medium"
        style={{ borderColor: "var(--cc-border)" }}
        onClick={onCopyPrevious}
        disabled={disabled}
      >
        Copiar mês anterior
      </button>
      <button
        type="button"
        className="h-10 rounded-md border px-4 text-sm font-medium"
        style={{ borderColor: "var(--cc-border)" }}
        onClick={onDistributeAvg}
        disabled={disabled}
      >
        Distribuir por média 3m
      </button>
      <button
        type="button"
        className="h-10 rounded-md bg-[var(--cc-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        onClick={onSave}
        disabled={disabled}
      >
        Salvar
      </button>
    </div>
  );
}
