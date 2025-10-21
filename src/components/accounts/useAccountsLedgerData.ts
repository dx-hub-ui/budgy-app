"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import {
  listAccounts,
  listBudgetCategories,
  listExpenses,
  listPayees,
} from "@/domain/repo";

import type { AccountRow, CategoryRow, ExpenseRow, PayeeRow } from "./types";

export function sortPayeesList(items: PayeeRow[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

type AccountsLedgerData = {
  accounts: AccountRow[];
  categories: CategoryRow[];
  expenses: ExpenseRow[];
  payees: PayeeRow[];
  loadingInitial: boolean;
  loadingTransactions: boolean;
  pageError: string | null;
  setPageError: (value: string | null) => void;
  setPayees: Dispatch<SetStateAction<PayeeRow[]>>;
  refreshExpenses: () => Promise<void>;
};

export function useAccountsLedgerData(): AccountsLedgerData {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [payees, setPayees] = useState<PayeeRow[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const refreshExpenses = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const data = await listExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setPageError(error?.message ?? "Não foi possível atualizar as transações.");
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingInitial(true);
    setLoadingTransactions(true);
    setPageError(null);

    const payeesPromise = listPayees()
      .then((data) => ({ data, error: null }))
      .catch((error: any) => ({ data: null, error }));

    Promise.all([listAccounts(), listBudgetCategories(), listExpenses(), payeesPromise])
      .then(([accountsData, categoriesData, expensesData, payeesResult]) => {
        if (!active) return;
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
        if (payeesResult?.error) {
          const message =
            payeesResult.error?.message ?? "Não foi possível carregar os beneficiários.";
          setPageError((prev) => prev ?? message);
        } else if (Array.isArray(payeesResult?.data)) {
          setPayees(sortPayeesList(payeesResult.data));
        } else {
          setPayees([]);
        }
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

  return {
    accounts,
    categories,
    expenses,
    payees,
    loadingInitial,
    loadingTransactions,
    pageError,
    setPageError,
    setPayees,
    refreshExpenses,
  };
}
