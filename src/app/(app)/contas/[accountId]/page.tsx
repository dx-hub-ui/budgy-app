"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthGate";
import AccountHeader, { type AccountMetric } from "@/components/accounts/AccountHeader";
import AccountSidebar, { type SidebarGroup } from "@/components/accounts/AccountSidebar";
import { ymd } from "@/domain/format";
import { ExpenseSchema, UpdateExpenseSchema } from "@/domain/models";
import {
  createExpense,
  listAccounts,
  listBudgetCategories,
  listExpenses,
  updateExpense
} from "@/domain/repo";

const dateHelper = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const currencyHelper = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type AccountRow = Awaited<ReturnType<typeof listAccounts>>[number];
type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>[number];
type CategoryRow = Awaited<ReturnType<typeof listBudgetCategories>>[number];

type LedgerTransaction = {
  id: string;
  occurred_on: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  memo: string | null;
  outflowCents: number;
  inflowCents: number;
};

type DraftTransaction = {
  id: string;
  occurred_on: string;
  description: string;
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
  occurred_on: string;
  description: string | null;
  categoryId: string | null;
  memo: string | null;
  outflowCents: number;
  inflowCents: number;
};

function formatCurrency(valueCents: number) {
  return currencyHelper.format(valueCents / 100);
}

function newDraftTransaction(): DraftTransaction {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    occurred_on: ymd(new Date()),
    description: "",
    categoryId: null,
    memo: "",
    outflow: "",
    inflow: "",
    saving: false,
    error: null,
  };
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

function formatCurrencyInput(value: string) {
  if (!value) return "";
  const cents = parseCurrencyInput(value);
  if (cents === 0) return "";
  return currencyHelper.format(cents / 100);
}

type AccountLedgerProps = {
  categories: CategoryRow[];
  transactions: LedgerTransaction[];
  loading: boolean;
  addSignal?: number;
  onCreate: (payload: CreateTransactionPayload) => Promise<void>;
  onAssignCategory: (id: string, categoryId: string | null) => Promise<void>;
};

function AccountLedger({
  categories,
  transactions,
  loading,
  addSignal,
  onCreate,
  onAssignCategory
}: AccountLedgerProps) {
  const [drafts, setDrafts] = useState<DraftTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (!addSignal) return;
    setDrafts((prev) => [...prev, newDraftTransaction()]);
  }, [addSignal]);

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
      const description = (transaction.description ?? "").toLowerCase();
      const category = (transaction.categoryName ?? "").toLowerCase();
      const memo = (transaction.memo ?? "").toLowerCase();
      return (
        description.includes(term) || category.includes(term) || memo.includes(term)
      );
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
    activeTransaction && typeof activeTransaction.description === "string" &&
    activeTransaction.description.trim().length > 0
      ? activeTransaction.description
      : "Transação sem descrição";

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

    updateDraft(draft.id, { saving: true, error: null });

    try {
      const description = draft.description.trim();
      const memo = draft.memo.trim();
      await onCreate({
        occurred_on: draft.occurred_on,
        description: description.length > 0 ? description : null,
        categoryId: draft.categoryId,
        memo: memo.length > 0 ? memo : null,
        outflowCents,
        inflowCents,
      });
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

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]">
          Lançamentos
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <input
            type="search"
            className="h-10 flex-1 rounded-lg border border-[var(--cc-border)] px-3 text-sm shadow-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            placeholder="Buscar por descrição, categoria ou memo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="text-xs text-[var(--cc-text-muted)]">{filteredTransactions.length} itens</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--cc-border)] bg-white">
        <table className="min-w-full divide-y divide-[var(--cc-border)]">
          <thead className="bg-[var(--brand-soft-fill)]/40 text-[var(--cc-text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Data
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                Descrição
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
            {drafts.map((draft) => (
              <tr key={draft.id} className="bg-[var(--brand-soft-fill)]/20">
                <td className="px-4 py-2 text-sm">
                  <input
                    type="date"
                    className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                    value={draft.occurred_on}
                    onChange={(event) => updateDraft(draft.id, { occurred_on: event.target.value })}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                    placeholder="Quem recebeu?"
                    value={draft.description}
                    onChange={(event) => updateDraft(draft.id, { description: event.target.value })}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                    value={draft.categoryId ?? ""}
                    onChange={(event) =>
                      updateDraft(draft.id, { categoryId: event.target.value || null })
                    }
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
                    className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-sm"
                    placeholder="Observação"
                    value={draft.memo}
                    onChange={(event) => updateDraft(draft.id, { memo: event.target.value })}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-right text-sm"
                    placeholder="0,00"
                    value={draft.outflow}
                    onChange={(event) => updateDraft(draft.id, { outflow: event.target.value })}
                    onBlur={(event) => updateDraft(draft.id, { outflow: formatCurrencyInput(event.target.value) })}
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="h-9 w-full rounded-lg border border-[var(--cc-border)] px-2 text-right text-sm"
                    placeholder="0,00"
                    value={draft.inflow}
                    onChange={(event) => updateDraft(draft.id, { inflow: event.target.value })}
                    onBlur={(event) => updateDraft(draft.id, { inflow: formatCurrencyInput(event.target.value) })}
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--cc-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--cc-text)]"
                      onClick={() => saveDraft(draft)}
                      disabled={draft.saving}
                    >
                      {draft.saving ? "Salvando…" : "Salvar"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[var(--cc-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-muted)]"
                      onClick={() => removeDraft(draft.id)}
                      disabled={draft.saving}
                    >
                      Cancelar
                    </button>
                  </div>
                  {draft.error && (
                    <p className="pt-2 text-xs text-red-600" role="alert">
                      {draft.error}
                    </p>
                  )}
                </td>
              </tr>
            ))}

            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--cc-text-muted)]">
                  {loading ? "Carregando…" : "Nenhum lançamento encontrado."}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-[var(--cc-bg-elev)]">
                  <td className="px-4 py-3 text-sm text-[var(--cc-text)]">
                  {dateHelper.format(new Date(`${transaction.occurred_on}T00:00:00`))}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--cc-text)]">
                    {transaction.description || "—"}
                  </td>
                  <td
                    className="relative px-4 py-3 text-sm text-[var(--cc-text)]"
                    onDoubleClick={() => openPrompt(transaction, { showPicker: true })}
                  >
                    {transaction.categoryName ? (
                      transaction.categoryName
                    ) : (
                      <div className="relative">
                        <span className="text-[var(--cc-text-muted)]">Sem categoria</span>
                        <button
                          type="button"
                          className="absolute -top-2 left-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700 shadow"
                          onClick={() => openPrompt(transaction)}
                          aria-pressed={activePrompt === transaction.id}
                        >
                          Requer uma categoria
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--cc-text)]">
                    {transaction.memo || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-rose-600">
                    {transaction.outflowCents > 0 ? formatCurrency(transaction.outflowCents) : ""}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600">
                    {transaction.inflowCents > 0 ? formatCurrency(transaction.inflowCents) : ""}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--cc-text-muted)]">
                    —
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {activeTransaction && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-blue-200 bg-blue-600 text-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                  1 transação selecionada
                </p>
                <p className="text-sm font-semibold">{activeDescription}</p>
                <p className="text-xs text-blue-100">
                  {dateHelper.format(new Date(`${activeTransaction.occurred_on}T00:00:00`))}
                  {activeAmountLabel ? ` • ${activeAmountLabel}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    showCategoryPicker
                      ? "border-white bg-white text-blue-700 shadow-sm"
                      : "border-white/40 text-white hover:bg-white/10"
                  }`}
                  onClick={() => setShowCategoryPicker((value) => !value)}
                  aria-expanded={showCategoryPicker}
                  disabled={isAssigningActive}
                >
                  Categorizar
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    activeTransaction.categoryId === null
                      ? "border-white bg-white text-blue-700 shadow-sm"
                      : "border-white/40 text-white hover:bg-white/10"
                  }`}
                  onClick={() => handlePromptSelection(null)}
                  disabled={isAssigningActive}
                >
                  Sem categoria
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                  onClick={closePrompt}
                >
                  Fechar
                </button>
              </div>
            </div>
            {showCategoryPicker && (
              <div className="max-h-64 space-y-3 overflow-y-auto border-t border-blue-500/40 px-6 py-4">
                <button
                  type="button"
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    activeTransaction.categoryId === null
                      ? "bg-white text-blue-700 shadow-sm"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  onClick={() => handlePromptSelection(null)}
                  disabled={isAssigningActive}
                >
                  Sem categoria
                </button>
                {categoryGroups.map((group) => (
                  <div key={group.name} className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-blue-100">{group.name}</p>
                    <div className="space-y-1">
                      {group.items.map((category) => {
                        const isSelected = activeTransaction.categoryId === category.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isSelected
                                ? "bg-white text-blue-700 shadow-sm"
                                : "bg-white/10 text-white hover:bg-white/20"
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
              <div className="border-t border-blue-500/40 bg-white/20 px-6 py-3 text-xs" role="alert">
                {assignError}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function AccountPage() {
  const params = useParams<{ accountId?: string }>();
  const router = useRouter();
  const { displayName, user } = useAuth();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [addDraftSignal, setAddDraftSignal] = useState<number>(0);
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [showReconcileInfo, setShowReconcileInfo] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingInitial(true);
    setLoadingTransactions(true);
    setPageError(null);

    Promise.all([listAccounts(), listBudgetCategories(), listExpenses()])
      .then(([accountsData, categoriesData, expensesData]) => {
        if (!active) return;
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
      })
      .catch((error: any) => {
        if (!active) return;
        setPageError(error?.message ?? "Não foi possível carregar os dados de contas.");
      })
      .finally(() => {
        if (!active) return;
        setLoadingInitial(false);
        setLoadingTransactions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const accountIdParam = useMemo(() => {
    const raw = params?.accountId;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params?.accountId]);

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  const selectedAccount = useMemo(() => {
    if (accountIdParam && accountMap.has(accountIdParam)) {
      return accountMap.get(accountIdParam) ?? null;
    }
    return accounts.length > 0 ? accounts[0] : null;
  }, [accountIdParam, accountMap, accounts]);

  const selectedAccountId = selectedAccount?.id ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (selectedAccountId) {
      window.localStorage.setItem("cc_last_account", selectedAccountId);
    } else {
      window.localStorage.removeItem("cc_last_account");
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (!loadingInitial && accounts.length > 0) {
      if (!accountIdParam || !accountMap.has(accountIdParam)) {
        const fallback = accounts[0]?.id;
        if (fallback) {
          router.replace(`/contas/${fallback}`);
        }
      }
    }
  }, [loadingInitial, accounts, accountIdParam, accountMap, router]);

  const categoriesMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const totalsByAccount = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((expense) => {
      const key = expense.account_id ?? "sem-conta";
      const direction = expense.direction === "inflow" ? 1 : -1;
      const amount = Number.isFinite(expense.amount_cents) ? expense.amount_cents : 0;
      map.set(key, (map.get(key) ?? 0) + direction * amount);
    });
    return map;
  }, [expenses]);

  const totalBalanceCents = useMemo(() => {
    let total = 0;
    totalsByAccount.forEach((value) => {
      total += value;
    });
    return total;
  }, [totalsByAccount]);

  const sidebarGroups: SidebarGroup[] = useMemo(() => {
    const grouped = new Map<string, SidebarGroup>();
    accounts.forEach((account) => {
      const groupId = account.group_label.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
      const existing = grouped.get(groupId);
      const accountEntry = {
        id: account.id,
        name: account.name,
        href: `/contas/${account.id}`,
        balanceCents: totalsByAccount.get(account.id) ?? 0,
        isActive: selectedAccount?.id === account.id,
      };
      if (existing) {
        existing.accounts.push(accountEntry);
      } else {
        grouped.set(groupId, {
          id: groupId,
          label: account.group_label,
          accounts: [accountEntry],
        });
      }
    });
    return Array.from(grouped.values());
  }, [accounts, totalsByAccount, selectedAccount]);

  const transactions: LedgerTransaction[] = useMemo(() => {
    if (!selectedAccount) return [];
    return expenses
      .filter((expense) => expense.account_id === selectedAccount.id)
      .map((expense) => {
        const category = expense.category_id ? categoriesMap.get(expense.category_id) : null;
        return {
          id: expense.id,
          occurred_on: expense.occurred_on,
          description: expense.description ?? null,
          categoryId: expense.category_id ?? null,
          categoryName: category?.name ?? null,
          memo: expense.memo ?? null,
          outflowCents: expense.direction === "outflow" ? expense.amount_cents : 0,
          inflowCents: expense.direction === "inflow" ? expense.amount_cents : 0,
        } satisfies LedgerTransaction;
      });
  }, [expenses, selectedAccount, categoriesMap]);

  const totalOutflow = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.outflowCents, 0),
    [transactions],
  );
  const totalInflow = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.inflowCents, 0),
    [transactions],
  );
  const workingBalance = totalInflow - totalOutflow;
  const lastMovement = transactions[0]?.occurred_on
    ? dateHelper.format(new Date(`${transactions[0].occurred_on}T00:00:00`))
    : null;

  async function refreshExpenses() {
    setLoadingTransactions(true);
    try {
      const nextExpenses = await listExpenses();
      setExpenses(Array.isArray(nextExpenses) ? nextExpenses : []);
    } catch (error: any) {
      setPageError(error?.message ?? "Não foi possível atualizar as movimentações.");
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function handleCreateTransaction(payload: CreateTransactionPayload) {
    if (!selectedAccount) {
      throw new Error("Selecione uma conta antes de registrar uma transação.");
    }

    const direction = payload.outflowCents > 0 ? "outflow" : "inflow";
    const amountCents = direction === "outflow" ? payload.outflowCents : payload.inflowCents;
    if (amountCents <= 0) {
      throw new Error("Informe um valor válido para saída ou entrada.");
    }

    const baseMethod = selectedAccount.default_method ?? "debito";
    const candidate = {
      amount_cents: amountCents,
      occurred_on: payload.occurred_on,
      category_id: payload.categoryId,
      account_id: selectedAccount.id,
      method: baseMethod,
      description: payload.description,
      memo: payload.memo,
      direction,
    };

    const parsed = ExpenseSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error("Os dados fornecidos para a transação são inválidos.");
    }

    await createExpense(parsed.data);
    await refreshExpenses();
  }

  async function handleAssignCategory(expenseId: string, categoryId: string | null) {
    const parsed = UpdateExpenseSchema.safeParse({ category_id: categoryId });
    if (!parsed.success) {
      throw new Error("Selecione uma categoria válida.");
    }
    await updateExpense(expenseId, parsed.data);
    await refreshExpenses();
  }

  const planName = `Plano de ${displayName}`;
  const contactEmail = user?.email ?? null;

  const workingTone: NonNullable<AccountMetric["tone"]> = workingBalance >= 0 ? "positive" : "negative";

  const metrics: AccountMetric[] = [
    {
      id: "working",
      label: "Saldo atual",
      valueCents: workingBalance,
      tone: workingTone,
      helper: lastMovement ? `Última movimentação em ${lastMovement}` : undefined,
    },
    {
      id: "inflow",
      label: "Entradas registradas",
      valueCents: totalInflow,
      tone: "positive",
      helper: `${transactions.filter((transaction) => transaction.inflowCents > 0).length} entradas`,
    },
    {
      id: "outflow",
      label: "Saídas registradas",
      valueCents: totalOutflow,
      tone: "negative",
      helper: `${transactions.filter((transaction) => transaction.outflowCents > 0).length} saídas`,
    },
  ];

  return (
    <div className="flex h-full bg-white">
      <AccountSidebar
        planName={planName}
        contact={contactEmail}
        totalBalanceCents={totalBalanceCents}
        groups={sidebarGroups}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto px-6 py-6">
          {pageError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )}

          {selectedAccount ? (
            <>
              <AccountHeader
                name={selectedAccount.name}
                subtitle={`Saldo projetado: ${formatCurrency(totalsByAccount.get(selectedAccount.id) ?? 0)}`}
                metrics={metrics}
                onAddTransaction={() => setAddDraftSignal(Date.now())}
                onAddTransfer={() => setShowTransferInfo((value) => !value)}
                onReconcile={() => setShowReconcileInfo((value) => !value)}
              />

              {(showTransferInfo || showReconcileInfo) && (
                <div className="space-y-4 rounded-lg border border-[var(--cc-border)] bg-[var(--brand-soft-fill)]/20 p-5 text-sm text-[var(--cc-text)]">
                  {showTransferInfo && (
                    <div>
                      <h2 className="text-base font-semibold">Como registrar uma transferência</h2>
                      <p className="mt-2 text-sm text-[var(--cc-text-muted)]">
                        Registre duas transações reais: uma saída na conta de origem e uma entrada na conta de destino. Use o memo
                        para identificar a transferência e mantenha os valores idênticos para que o saldo total permaneça
                        equilibrado.
                      </p>
                    </div>
                  )}
                  {showReconcileInfo && (
                    <div>
                      <h2 className="text-base font-semibold">Conciliação rápida</h2>
                      <p className="mt-2 text-sm text-[var(--cc-text-muted)]">
                        Compare o saldo atual ({formatCurrency(workingBalance)}) com o extrato do banco. Marque entradas e saídas
                        pendentes como reconciliadas ajustando o memo das transações. Quando os valores coincidirem, sua conta
                        estará conciliada.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <AccountLedger
                categories={categories}
                transactions={transactions}
                loading={loadingTransactions}
                addSignal={addDraftSignal}
                onCreate={handleCreateTransaction}
                onAssignCategory={handleAssignCategory}
              />
            </>
          ) : (
            <div className="rounded-lg border border-[var(--cc-border)] bg-white p-8 text-center text-sm text-[var(--cc-text-muted)]">
              Crie uma conta para começar a registrar suas movimentações.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
