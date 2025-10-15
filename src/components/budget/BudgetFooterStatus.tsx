type BudgetFooterStatusProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lastAction: string | null;
};

export function BudgetFooterStatus({ canUndo, canRedo, onUndo, onRedo, lastAction }: BudgetFooterStatusProps) {
  return (
    <footer className="mt-6 flex flex-wrap items-center justify-between rounded-xl border border-[var(--cc-border)] bg-[var(--cc-surface)] px-4 py-3 text-sm text-[var(--cc-text)] shadow-[var(--cc-shadow-1)]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-md border border-[var(--cc-border)] px-3 py-1 font-medium text-[var(--cc-text)] transition hover:border-[var(--cc-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Desfazer
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-md border border-[var(--cc-border)] px-3 py-1 font-medium text-[var(--cc-text)] transition hover:border-[var(--cc-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refazer
        </button>
      </div>
      <p className="text-xs text-[var(--cc-text-muted)]">
        {lastAction ? `Última ação: ${lastAction}` : "Nenhuma ação registrada"}
      </p>
    </footer>
  );
}
