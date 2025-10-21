"use client";

import { useEffect, useMemo, useState } from "react";

import ManagePayeesModal from "@/components/payees/ManagePayeesModal";
import { ymd } from "@/domain/format";

import type { CategoryRow, PayeeRow, AccountRow } from "./types";

type AccountOption = Pick<AccountRow, "id" | "name">;

type LedgerTransaction = {
  id: string;
  occurred_on: string;
  accountId: string | null;
  accountName: string | null;
  payeeId: string | null;
  payeeName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  memo: string | null;
  outflowCents: number;
  inflowCents: number;
};

export type { LedgerTransaction };

type DraftTransaction = {
  id: string;
  occurred_on: string;
  accountId: string | null;
  payeeInput: string;
  payeeId: string | null;
  categoryId: string | null;
  memo: string;
  outflow: string;
  inflow: string;
  saving: boolean;
  error: string | null;
};

type CategoryGroup = {
  name: string;
  items: CategoryRow[];
};

type CreateTransactionPayload = {
  accountId: string;
  occurred_on: string;
  payeeId: string;
  payeeName: string;
  categoryId: string | null;
  memo: string | null;
  outflowCents: number;
  inflowCents: number;
};

export type { CreateTransactionPayload };

type AccountLedgerProps = {
  accountOptions: AccountOption[];
  defaultAccountId?: string | null;
  categories: CategoryRow[];
  transactions: LedgerTransaction[];
  loading: boolean;
  addSignal?: number;
  showAccountColumn?: boolean;
  onCreate: (payload: CreateTransactionPayload) => Promise<void>;
  onAssignCategory: (id: string, categoryId: string | null) => Promise<void>;
  onAddTransaction?: () => void;
  onAddTransfer?: () => void;
  payees: PayeeRow[];
  onCreatePayee: (name: string) => Promise<PayeeRow>;
  onRenamePayee: (id: string, name: string) => Promise<PayeeRow | void>;
  onDeletePayee: (id: string) => Promise<void>;
};

const dateHelper = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const currencyHelper = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(valueCents: number) {
  return currencyHelper.format(valueCents / 100);
}

function parseCurrencyInput(value: string) {
  if (!value) return 0;
  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function newDraftTransaction(defaultAccountId?: string | null): DraftTransaction {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    occurred_on: ymd(new Date()),
    accountId: defaultAccountId ?? null,
    payeeInput: "",
    payeeId: null,
    categoryId: null,
    memo: "",
    outflow: "",
    inflow: "",
    saving: false,
    error: null,
  };
}

export default function AccountLedger({
  accountOptions,
  defaultAccountId,
  categories,
  transactions,
  loading,
  addSignal,
  showAccountColumn,
  onCreate,
  onAssignCategory,
  onAddTransaction,
  onAddTransfer,
  payees,
  onCreatePayee,
  onRenamePayee,
  onDeletePayee,
}: AccountLedgerProps) {
  const [drafts, setDrafts] = useState<DraftTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [activePayeeDraftId, setActivePayeeDraftId] = useState<string | null>(null);
  const [managePayeesOpen, setManagePayeesOpen] = useState(false);

  const payeesById = useMemo(() => {
    const map = new Map<string, PayeeRow>();
    payees.forEach((payee) => {
      if (payee?.id) {
        map.set(payee.id, payee);
      }
    });
    return map;
  }, [payees]);

  useEffect(() => {
    if (!addSignal) return;
    setDrafts((prev) => [newDraftTransaction(defaultAccountId), ...prev]);
  }, [addSignal, defaultAccountId]);

  const accountMap = useMemo(() => new Map(accountOptions.map((account) => [account.id, account])), [accountOptions]);

  function findPayeeByName(name: string) {
    const normalized = name.trim();
    if (!normalized) return null;
    const match = payees.find(
      (payee) => payee.name.localeCompare(normalized, "pt-BR", { sensitivity: "accent" }) === 0,
    );
    return match ?? null;
  }

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, CategoryRow[]>();
    categories.forEach((category) => {
      const key = category.group_name ?? "Outras";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(category);
    });
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const term = search.toLowerCase();
    return transactions.filter((transaction) => {
      const payee = (transaction.payeeName ?? "").toLowerCase();
      const category = (transaction.categoryName ?? "").toLowerCase();
      const memo = (transaction.memo ?? "").toLowerCase();
      const account = (transaction.accountName ?? "").toLowerCase();
      return payee.includes(term) || category.includes(term) || memo.includes(term) || account.includes(term);
    });
  }, [transactions, search]);

  const activeTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === activePrompt) ?? null,
    [transactions, activePrompt],
  );

  useEffect(() => {
    if (!activePrompt) {
      setShowCategoryPicker(false);
      setAssignError(null);
    }
  }, [activePrompt]);

  function openPrompt(transaction: LedgerTransaction, options?: { showPicker?: boolean }) {
    setActivePrompt(transaction.id);
    setShowCategoryPicker(Boolean(options?.showPicker));
    setAssignError(null);
  }

  function closePrompt() {
    setActivePrompt(null);
    setShowCategoryPicker(false);
    setAssignError(null);
  }

  const isAssigningActive = activeTransaction ? assigningId === activeTransaction.id : false;

  async function handlePromptSelection(categoryId: string | null) {
    if (!activeTransaction) return;
    await handleAssignCategory(activeTransaction, categoryId);
  }

  const activeDescription =
    activeTransaction && typeof activeTransaction.payeeName === "string" &&
    activeTransaction.payeeName.trim().length > 0
      ? activeTransaction.payeeName
      : "Beneficiário não informado";

  const activeAmountLabel = activeTransaction
    ? activeTransaction.inflowCents > 0
      ? `Entrada de ${formatCurrency(activeTransaction.inflowCents)}`
      : activeTransaction.outflowCents > 0
        ? `Saída de ${formatCurrency(activeTransaction.outflowCents)}`
        : null
    : null;

  function updateDraft(id: string, patch: Partial<DraftTransaction>) {
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }

  async function handleQuickPayeeCreate(name: string, draftId: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await onCreatePayee(trimmed);
      updateDraft(draftId, { payeeId: created.id, payeeInput: created.name, error: null });
      setActivePayeeDraftId((current) => (current === draftId ? null : current));
    } catch (error: any) {
      updateDraft(draftId, {
        error: error?.message ?? "Não foi possível criar o beneficiário informado.",
      });
    }
  }

  function handlePayeeSelect(draftId: string, payee: PayeeRow) {
    updateDraft(draftId, { payeeId: payee.id, payeeInput: payee.name, error: null });
    setActivePayeeDraftId((current) => (current === draftId ? null : current));
  }

  async function saveDraft(draft: DraftTransaction) {
    const outflowCents = parseCurrencyInput(draft.outflow);
    const inflowCents = parseCurrencyInput(draft.inflow);

    if (outflowCents === 0 && inflowCents === 0) {
      updateDraft(draft.id, { error: "Preencha saída ou entrada" });
      return;
    }

    if (outflowCents > 0 && inflowCents > 0) {
      updateDraft(draft.id, { error: "Use apenas saída ou entrada" });
      return;
    }

    const payeeInput = draft.payeeInput.trim();
    if (payeeInput.length === 0) {
      updateDraft(draft.id, { error: "Informe um beneficiário" });
      return;
    }

    const selectedAccountId = draft.accountId ?? defaultAccountId ?? null;
    if (!selectedAccountId) {
      updateDraft(draft.id, { error: "Selecione uma conta" });
      return;
    }

    const selectedAccount = accountMap.get(selectedAccountId);
    if (!selectedAccount) {
      updateDraft(draft.id, { error: "Conta inválida" });
      return;
    }

    updateDraft(draft.id, { saving: true, error: null });

    try {
      const memo = draft.memo.trim();
      let selectedPayee = draft.payeeId ? payeesById.get(draft.payeeId) ?? null : null;
      if (!selectedPayee) {
        selectedPayee = findPayeeByName(payeeInput);
      }
      if (!selectedPayee) {
        selectedPayee = await onCreatePayee(payeeInput);
      }
      if (!selectedPayee) {
        throw new Error("Não foi possível salvar o beneficiário informado.");
      }
      await onCreate({
        accountId: selectedAccount.id,
        occurred_on: draft.occurred_on,
        payeeId: selectedPayee.id,
        payeeName: selectedPayee.name,
        categoryId: draft.categoryId,
        memo: memo.length > 0 ? memo : null,
        outflowCents,
        inflowCents,
      });
      setActivePayeeDraftId((current) => (current === draft.id ? null : current));
      removeDraft(draft.id);
    } catch (error: any) {
      updateDraft(draft.id, {
        saving: false,
        error: error?.message ?? "Não foi possível salvar",
      });
    }
  }

  async function handleAssignCategory(transaction: LedgerTransaction, categoryId: string | null) {
    setAssignError(null);
    setAssigningId(transaction.id);
    try {
      await onAssignCategory(transaction.id, categoryId);
      closePrompt();
    } catch (error: any) {
      setAssignError(error?.message ?? "Falha ao atualizar a categoria");
    } finally {
      setAssigningId(null);
    }
  }

  const hasAccountColumn = Boolean(showAccountColumn);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--cc-text-muted)]">
          <span className="uppercase tracking-wide text-xs">Lançamentos</span>
          {onAddTransaction && (
            <button type="button" className="ghost-button" onClick={onAddTransaction}>
              Adicionar transação
            </button>
          )}
          {onAddTransfer && (
            <button type="button" className="ghost-button" onClick={onAddTransfer}>
              Adicionar transferência
            </button>
          )}
        </div>
        <div className="flex w-full items-center gap-2 text-sm text-[var(--cc-text-muted)] lg:w-auto">
          <input
            type="search"
            className="h-9 flex-1 rounded-md border border-[var(--cc-border)] bg-white px-3 text-sm shadow-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            placeholder="Buscar por conta, beneficiário, categoria ou memo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="text-xs">{filteredTransactions.length} itens</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--cc-border)] bg-white">
        <table className="min-w-full divide-y divide-[var(--cc-border)] text-sm">
          <thead className="bg-[var(--brand-soft-fill)]/40 text-[var(--cc-text-muted)]">
            <tr>
              {hasAccountColumn && (
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Conta
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Data
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Beneficiário
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Categoria
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Memo
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                Saída
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                Entrada
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cc-border)]">
            {drafts.map((draft) => {
              const normalizedPayeeInput = draft.payeeInput.trim().toLowerCase();
              const existingPayee = findPayeeByName(draft.payeeInput);
              const matchingPayees = (
                normalizedPayeeInput
                  ? payees.filter((payee) => payee.name.toLowerCase().includes(normalizedPayeeInput))
                  : payees
              ).slice(0, 6);
              const showCreateOption = normalizedPayeeInput.length > 0 && !existingPayee;

              return (
                <tr key={draft.id} className="bg-[var(--brand-soft-fill)]/20">
                  {hasAccountColumn && (
                    <td className="px-4 py-2">
                      <select
                        className="h-9 w-full rounded-md border border-[var(--cc-border)] px-2 text-sm"
                        value={draft.accountId ?? ""}
                        onChange={(event) => updateDraft(draft.id, { accountId: event.target.value || null })}
                      >
                        <option value="">Selecionar</option>
                        {accountOptions.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-4 py-2 text-sm">
                    <input
                      type="date"
                      className="h-9 w-full rounded-md border border-[var(--cc-border)] px-2 text-sm"
                      value={draft.occurred_on}
                      onChange={(event) => updateDraft(draft.id, { occurred_on: event.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="relative">
                      <input
                        type="text"
                        className="h-9 w-full rounded-md border border-[var(--cc-border)] px-2 text-sm"
                        placeholder="Quem recebeu?"
                        value={draft.payeeInput}
                        onFocus={() => {
                          setActivePayeeDraftId(draft.id);
                        }}
                        onChange={(event) => {
                          setActivePayeeDraftId(draft.id);
                          updateDraft(draft.id, { payeeInput: event.target.value, payeeId: null });
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setActivePayeeDraftId((current) => (current === draft.id ? null : current));
                          }, 120);
                        }}
                      />
                      {activePayeeDraftId === draft.id ? (
                        <div className="absolute left-0 right-0 top-full z-30 mt-2 w-full min-w-[16rem] rounded-lg border border-[var(--cc-border)] bg-white shadow-2xl">
                          <div className="p-3">
                            {showCreateOption ? (
                              <button
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  void handleQuickPayeeCreate(draft.payeeInput, draft.id);
                                }}
                                className="block w-full rounded-md bg-[var(--brand-soft-fill)]/30 px-3 py-2 text-left text-sm font-medium text-[var(--cc-text)] transition hover:bg-[var(--brand-soft-fill)]/60"
                              >
                                Criar &ldquo;{draft.payeeInput.trim()}&rdquo; beneficiário
                              </button>
                            ) : null}
                            <div className="mt-3 rounded-md border border-[var(--cc-border)] bg-[var(--brand-soft-fill)]/15 p-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
                                Beneficiários salvos
                              </div>
                              <div className="mt-2 max-h-48 overflow-y-auto">
                                {matchingPayees.length === 0 ? (
                                  <p className="text-xs text-[var(--cc-text-muted)]">Nenhum beneficiário encontrado.</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {matchingPayees.map((payee) => (
                                      <li key={payee.id}>
                                        <button
                                          type="button"
                                          onMouseDown={(event) => {
                                            event.preventDefault();
                                            handlePayeeSelect(draft.id, payee);
                                          }}
                                          className="w-full rounded px-2 py-1 text-left text-sm text-[var(--cc-text)] transition hover:bg-[var(--brand-soft-fill)]/60"
                                        >
                                          {payee.name}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setManagePayeesOpen(true);
                                setActivePayeeDraftId(null);
                              }}
                              className="mt-3 w-full rounded-md border border-[var(--cc-border)] px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)] transition hover:bg-[var(--brand-soft-fill)]/40"
                            >
                              Gerenciar beneficiários
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="h-9 w-full rounded-md border border-[var(--cc-border)] px-2 text-sm"
                      value={draft.categoryId ?? ""}
                      onChange={(event) => updateDraft(draft.id, { categoryId: event.target.value || null })}
                    >
                      <option value="">Sem categoria</option>
                      {categoryGroups.map((group) => (
                        <optgroup key={group.name} label={group.name}>
                          {group.items.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-md border border-[var(--cc-border)] px-2 text-sm"
                      placeholder="Opcional"
                      value={draft.memo}
                      onChange={(event) => updateDraft(draft.id, { memo: event.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-md border border-[var(--cc-border)] px-2 text-sm"
                      placeholder="0,00"
                      value={draft.outflow}
                      onChange={(event) => updateDraft(draft.id, { outflow: event.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="h-9 w-full rounded-md border border-[var(--cc-border)] px-2 text-sm"
                      placeholder="0,00"
                      value={draft.inflow}
                      onChange={(event) => updateDraft(draft.id, { inflow: event.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={draft.saving}
                        onClick={() => saveDraft(draft)}
                      >
                        Salvar
                      </button>
                      <button type="button" className="ghost-button" onClick={() => removeDraft(draft.id)}>
                        Cancelar
                      </button>
                    </div>
                    {draft.error ? (
                      <p className="mt-2 text-left text-xs text-red-600" role="alert">
                        {draft.error}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}

            {filteredTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={hasAccountColumn ? 8 : 7}
                  className="px-6 py-12 text-center text-sm text-[var(--cc-text-muted)]"
                >
                  {loading ? "Carregando transações…" : "Nenhuma transação encontrada."}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => {
                const occurredAt = new Date(transaction.occurred_on + "T00:00:00");
                const formattedDate = Number.isFinite(occurredAt.getTime())
                  ? dateHelper.format(occurredAt)
                  : transaction.occurred_on;
                const needsCategory = transaction.categoryId === null;

                return (
                  <tr key={transaction.id} className="align-top">
                    {hasAccountColumn && (
                      <td className="px-4 py-3 text-sm text-[var(--cc-text)]">
                        {transaction.accountName ?? "—"}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--cc-text)]">
                      {formattedDate}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--cc-text)]">
                      {transaction.payeeName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--cc-text)]">
                      <button
                        type="button"
                        className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                          needsCategory
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[var(--brand-soft-fill)]/60 text-[var(--cc-text)]"
                        }`}
                        onClick={() => openPrompt(transaction, { showPicker: true })}
                      >
                        {transaction.categoryName ?? "Sem categoria"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--cc-text-muted)]">
                      {transaction.memo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-rose-600">
                      {transaction.outflowCents > 0 ? formatCurrency(transaction.outflowCents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-600">
                      {transaction.inflowCents > 0 ? formatCurrency(transaction.inflowCents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => openPrompt(transaction)}
                        >
                          Categorizar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {activeTransaction ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50">
          <div className="flex flex-col gap-3 border-b border-blue-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-blue-800">{activeDescription}</div>
              {activeAmountLabel ? (
                <div className="text-xs text-blue-700">{activeAmountLabel}</div>
              ) : null}
              {activeTransaction.accountName && hasAccountColumn ? (
                <div className="text-xs text-blue-700">{activeTransaction.accountName}</div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="ghost-button"
                onClick={() => openPrompt(activeTransaction, { showPicker: true })}
                disabled={isAssigningActive}
              >
                Escolher categoria
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => handlePromptSelection(null)}
                disabled={isAssigningActive}
              >
                Sem categoria
              </button>
              <button type="button" className="ghost-button" onClick={closePrompt}>
                Fechar
              </button>
            </div>
          </div>
          {showCategoryPicker && (
            <div className="max-h-64 space-y-3 overflow-y-auto border-b border-blue-200 px-4 py-3">
              <button
                type="button"
                className={`block w-full rounded-md px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  activeTransaction.categoryId === null
                    ? "bg-white text-blue-700 shadow-sm"
                    : "bg-white/40 text-blue-800 hover:bg-white/70"
                }`}
                onClick={() => handlePromptSelection(null)}
                disabled={isAssigningActive}
              >
                Sem categoria
              </button>
              {categoryGroups.map((group) => (
                <div key={group.name} className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-blue-600">{group.name}</p>
                  <div className="space-y-1">
                    {group.items.map((category) => {
                      const isSelected = activeTransaction.categoryId === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`block w-full rounded-md px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected
                              ? "bg-white text-blue-700 shadow-sm"
                              : "bg-white/40 text-blue-800 hover:bg-white/70"
                          }`}
                          onClick={() => handlePromptSelection(category.id)}
                          disabled={isAssigningActive}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {assignError && (
            <div className="px-4 py-3 text-xs text-blue-800" role="alert">
              {assignError}
            </div>
          )}
        </div>
      ) : null}

      <ManagePayeesModal
        open={managePayeesOpen}
        payees={payees}
        onClose={() => {
          setManagePayeesOpen(false);
          setActivePayeeDraftId(null);
        }}
        onRename={async (id, name) => {
          await onRenamePayee(id, name);
        }}
        onDelete={onDeletePayee}
        onCreate={onCreatePayee}
      />
    </section>
  );
}
