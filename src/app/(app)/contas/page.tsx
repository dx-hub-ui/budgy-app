"use client";

import { useMemo, useState } from "react";

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

export default function AccountsIndexPage() {
  const { orgId } = useAuth();
  const {
    accounts,
    categories,
    expenses,
    payees,
    loadingTransactions,
    pageError,
    setPayees,
    refreshExpenses,
  } = useAccountsLedgerData();

  const { create: createPayeeAction, rename: renamePayeeAction, remove: deletePayeeAction } =
    usePayeeActions(payees, setPayees);

  const [addDraftSignal, setAddDraftSignal] = useState<number>(0);

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const categoriesMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const accountOptions = useMemo(() => accounts.map((account) => ({ id: account.id, name: account.name })), [accounts]);
  const defaultAccountId = accountOptions[0]?.id ?? null;

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

  const transactions: LedgerTransaction[] = useMemo(
    () =>
      expenses.map((expense) => {
        const category = expense.category_id ? categoriesMap.get(expense.category_id) : null;
        const account = expense.account_id ? accountMap.get(expense.account_id) : null;
        const payee = (expense as any)?.payee as { id?: string; name?: string } | null;
        const payeeName = payee?.name ?? expense.description ?? null;
        const payeeId = (payee?.id ?? (expense as any)?.payee_id) ?? null;
        return {
          id: expense.id,
          occurred_on: expense.occurred_on,
          accountId: expense.account_id ?? null,
          accountName: account?.name ?? null,
          payeeId,
          payeeName,
          categoryId: expense.category_id ?? null,
          categoryName: category?.name ?? null,
          memo: expense.memo ?? null,
          outflowCents: expense.direction === "outflow" ? expense.amount_cents : 0,
          inflowCents: expense.direction === "inflow" ? expense.amount_cents : 0,
        } satisfies LedgerTransaction;
      }),
    [expenses, categoriesMap, accountMap],
  );

  const totalOutflow = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.outflowCents, 0),
    [transactions],
  );
  const totalInflow = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.inflowCents, 0),
    [transactions],
  );
  const workingBalance = useMemo(
    () => Array.from(totalsByAccount.values()).reduce((sum, value) => sum + value, 0),
    [totalsByAccount],
  );
  const lastMovement = transactions[0]?.occurred_on
    ? dateHelper.format(new Date(`${transactions[0].occurred_on}T00:00:00`))
    : null;

  async function handleCreateTransaction(payload: CreateTransactionPayload) {
    if (!orgId) {
      throw new Error(
        "Não foi possível identificar a organização atual. Atualize a página e tente novamente.",
      );
    }

    const accountId = payload.accountId;
    if (!accountId) {
      throw new Error("Selecione uma conta válida antes de salvar.");
    }

    const account = accountMap.get(accountId);
    if (!account) {
      throw new Error("Conta selecionada não está disponível.");
    }

    const direction = payload.outflowCents > 0 ? "outflow" : "inflow";
    const amountCents = direction === "outflow" ? payload.outflowCents : payload.inflowCents;
    if (amountCents <= 0) {
      throw new Error("Informe um valor válido para saída ou entrada.");
    }

    if (!payload.payeeId) {
      throw new Error("Selecione ou crie um beneficiário antes de salvar a transação.");
    }

    const baseMethod = account.default_method ?? "debito";
    const candidate = {
      amount_cents: amountCents,
      occurred_on: payload.occurred_on,
      category_id: payload.categoryId,
      account_id: account.id,
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
      label: "Saldo consolidado",
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

  const allowAddDraft = accountOptions.length > 0;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-white">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {pageError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <AccountHeader
          name="Todas as contas"
          subtitle={`${accounts.length} contas conectadas`}
          badgeLabel="Resumo geral"
          metrics={metrics}
        />

        <AccountLedger
          accountOptions={accountOptions}
          defaultAccountId={defaultAccountId}
          categories={categories}
          transactions={transactions}
          loading={loadingTransactions}
          addSignal={addDraftSignal}
          showAccountColumn
          onCreate={handleCreateTransaction}
          onAssignCategory={handleAssignCategory}
          onAddTransaction={allowAddDraft ? () => setAddDraftSignal(Date.now()) : undefined}
          payees={payees}
          onCreatePayee={createPayeeAction}
          onRenamePayee={renamePayeeAction}
          onDeletePayee={deletePayeeAction}
        />
      </div>
    </div>
  );
}
