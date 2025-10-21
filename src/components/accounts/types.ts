import type {
  listAccounts,
  listBudgetCategories,
  listExpenses,
  listPayees,
} from "@/domain/repo";

export type AccountRow = Awaited<ReturnType<typeof listAccounts>>[number];
export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>[number];
export type CategoryRow = Awaited<ReturnType<typeof listBudgetCategories>>[number];
export type PayeeRow = Awaited<ReturnType<typeof listPayees>>[number];
