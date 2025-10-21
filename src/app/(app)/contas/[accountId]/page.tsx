"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthGate";
import AccountHeader, { type AccountMetric } from "@/components/accounts/AccountHeader";
import AccountLedger, {
  type CreateTransactionPayload,
  type LedgerTransaction,
} from "@/components/accounts/AccountLedger";
import { useAccountsLedgerData } from "@/components/accounts/useAccountsLedgerData";
import { usePayeeActions } from "@/components/accounts/usePayeeActions";
import { ExpenseSchema, UpdateExpenseSchema } from "@/domain/models";
import { createExpense, updateExpense } from "@/domain/repo";

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

export default function AccountPage() {
  const params = useParams<{ accountId?: string }>();
  const router = useRouter();
  const { orgId } = useAuth();

  const {
    accounts,
    categories,
    expenses,
    payees,
    loadingInitial,
    loadingTransactions,
    pageError,
    setPayees,
    refreshExpenses,
  } = useAccountsLedgerData();

  const { create: createPayeeAction, rename: renamePayeeAction, remove: deletePayeeAction } =
    usePayeeActions(payees, setPayees);

  const [addDraftSignal, setAddDraftSignal] = useState<number>(0);
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [showReconcileInfo, setShowReconcileInfo] = useState(false);

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

  const transactions: LedgerTransaction[] = useMemo(() => {
    if (!selectedAccount) return [];
    return expenses
      .filter((expense) => expense.account_id === selectedAccount.id)
      .map((expense) => {
        const category = expense.category_id ? categoriesMap.get(expense.category_id) : null;
        const payee = (expense as any)?.payee as { id?: string; name?: string } | null;
        const payeeName = payee?.name ?? expense.description ?? null;
        const payeeId = (payee?.id ?? (expense as any)?.payee_id) ?? null;
        return {
          id: expense.id,
          occurred_on: expense.occurred_on,
          accountId: expense.account_id ?? null,
          accountName: selectedAccount.name,
          payeeId,
          payeeName,
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

  async function handleCreateTransaction(payload: CreateTransactionPayload) {
    if (!selectedAccount) {
      throw new Error("Selecione uma conta antes de registrar uma transação.");
    }

    if (!orgId) {
      throw new Error(
        "Não foi possível identificar a organização atual. Atualize a página e tente novamente.",
      );
    }

    const direction = payload.outflowCents > 0 ? "outflow" : "inflow";
    const amountCents = direction === "outflow" ? payload.outflowCents : payload.inflowCents;
    if (amountCents <= 0) {
      throw new Error("Informe um valor válido para saída ou entrada.");
    }

    if (!payload.payeeId) {
      throw new Error("Selecione ou crie um beneficiário antes de salvar a transação.");
    }

    const baseMethod = selectedAccount.default_method ?? "debito";
    const candidate = {
      amount_cents: amountCents,
      occurred_on: payload.occurred_on,
      category_id: payload.categoryId,
      account_id: selectedAccount.id,
      method: baseMethod,
      description: payload.payeeName,
      memo: payload.memo,
      payee_id: payload.payeeId,
      direction,
    };

    const parsed = ExpenseSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new Error("Os dados fornecidos para a transação são inválidos.");
    }

    await createExpense({ ...parsed.data, org_id: orgId });
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
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-white">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {pageError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {selectedAccount ? (
          <>
            <AccountHeader
              name={selectedAccount.name}
              subtitle={`Saldo projetado: ${formatCurrency(
                totalsByAccount.get(selectedAccount.id) ?? 0,
              )}`}
              metrics={metrics}
              onReconcile={() => setShowReconcileInfo((value) => !value)}
            />

            {(showTransferInfo || showReconcileInfo) && (
              <div className="space-y-3 rounded-md border border-[var(--cc-border)] bg-[var(--brand-soft-fill)]/25 px-4 py-4 text-sm text-[var(--cc-text)]">
                {showTransferInfo && (
                  <div>
                    <h2 className="text-sm font-semibold">Como registrar uma transferência</h2>
                    <p className="mt-1 text-sm text-[var(--cc-text-muted)]">
                      Registre duas transações: uma saída na conta de origem e uma entrada na conta de destino.
                      Use o memo para identificar a transferência e mantenha valores idênticos para preservar o
                      saldo consolidado.
                    </p>
                  </div>
                )}
                {showReconcileInfo && (
                  <div>
                    <h2 className="text-sm font-semibold">Conciliação rápida</h2>
                    <p className="mt-1 text-sm text-[var(--cc-text-muted)]">
                      Compare o saldo atual ({formatCurrency(workingBalance)}) com o extrato do banco. Ajuste
                      memos ou categorias conforme necessário até que os valores coincidam.
                    </p>
                  </div>
                )}
              </div>
            )}

            <AccountLedger
              accountOptions={selectedAccount ? [{ id: selectedAccount.id, name: selectedAccount.name }] : []}
              defaultAccountId={selectedAccount.id}
              categories={categories}
              transactions={transactions}
              loading={loadingTransactions}
              addSignal={addDraftSignal}
              showAccountColumn={false}
              onCreate={handleCreateTransaction}
              onAssignCategory={handleAssignCategory}
              onAddTransaction={() => setAddDraftSignal(Date.now())}
              onAddTransfer={() => setShowTransferInfo((value) => !value)}
              payees={payees}
              onCreatePayee={createPayeeAction}
              onRenamePayee={renamePayeeAction}
              onDeletePayee={deletePayeeAction}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-md border border-[var(--cc-border)] bg-[var(--brand-soft-fill)]/40 px-6 py-10 text-center text-sm text-[var(--cc-text-muted)]">
              Nenhuma conta selecionada. Utilize o menu de contas na barra lateral para escolher uma conta ou
              criar uma nova.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
