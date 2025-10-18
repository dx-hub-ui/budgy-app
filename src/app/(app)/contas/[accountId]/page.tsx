"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthGate";
import AccountHeader, { type AccountMetric } from "@/components/accounts/AccountHeader";
import AccountSidebar, { type SidebarGroup } from "@/components/accounts/AccountSidebar";
import AccountTransactionsTable, {
  type AccountTransaction,
  type CreateTransactionPayload,
} from "@/components/accounts/AccountTransactionsTable";
import { ExpenseSchema } from "@/domain/models";
import { createExpense, listAccounts, listCategories, listExpenses } from "@/domain/repo";

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
type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number];

function formatCurrency(valueCents: number) {
  return currencyHelper.format(valueCents / 100);
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
  const [focusSignal, setFocusSignal] = useState<number>(0);
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [showReconcileInfo, setShowReconcileInfo] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingInitial(true);
    setLoadingTransactions(true);
    setPageError(null);

    Promise.all([listAccounts(), listCategories(), listExpenses()])
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

  const transactions: AccountTransaction[] = useMemo(() => {
    if (!selectedAccount) return [];
    return expenses
      .filter((expense) => expense.account_id === selectedAccount.id)
      .map((expense) => {
        const category = expense.category_id ? categoriesMap.get(expense.category_id) : null;
        return {
          id: expense.id,
          date: expense.date,
          description: expense.description ?? "",
          categoryName: category?.name ?? null,
          memo: expense.memo ?? null,
          outflowCents: expense.direction === "outflow" ? expense.amount_cents : 0,
          inflowCents: expense.direction === "inflow" ? expense.amount_cents : 0,
        } satisfies AccountTransaction;
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
  const lastMovement = transactions[0]?.date ? dateHelper.format(new Date(`${transactions[0].date}T00:00:00`)) : null;

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
      date: payload.date,
      category_id: payload.categoryId,
      account_id: selectedAccount.id,
      method: baseMethod,
      description: payload.description,
      memo: payload.memo.length > 0 ? payload.memo : undefined,
      direction,
    };

    const parsed = ExpenseSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error("Os dados fornecidos para a transação são inválidos.");
    }

    await createExpense(parsed.data);
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
    <div className="h-full overflow-auto bg-[var(--cc-bg)]">
      <div className="mx-auto flex min-h-full w-full max-w-[1360px] gap-6 px-6 py-8">
        <AccountSidebar
          planName={planName}
          contact={contactEmail}
          totalBalanceCents={totalBalanceCents}
          groups={sidebarGroups}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6 pb-10">
          {pageError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )}

          {selectedAccount ? (
            <>
              <AccountHeader
                name={selectedAccount.name}
                subtitle={`Saldo projetado: ${formatCurrency(totalsByAccount.get(selectedAccount.id) ?? 0)}`}
                metrics={metrics}
                onAddTransaction={() => setFocusSignal(Date.now())}
                onAddTransfer={() => setShowTransferInfo((value) => !value)}
                onReconcile={() => setShowReconcileInfo((value) => !value)}
              />

              {(showTransferInfo || showReconcileInfo) && (
                <div className="space-y-3 rounded-3xl border border-[var(--cc-border)] bg-white/90 p-5 text-sm text-[var(--cc-text)]">
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

              <AccountTransactionsTable
                categories={categories.map((category) => ({ id: category.id, name: category.name }))}
                transactions={transactions}
                loading={loadingTransactions}
                onCreate={handleCreateTransaction}
                focusSignal={focusSignal}
              />
            </>
          ) : (
            <div className="rounded-3xl border border-[var(--cc-border)] bg-white/80 p-8 text-center text-sm text-[var(--cc-text-muted)]">
              Crie uma conta para começar a registrar suas movimentações.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
