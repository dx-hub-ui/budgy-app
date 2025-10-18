import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(40),
  color: z.string().min(4).max(16)
});
export type CategoryInput = z.infer<typeof CategorySchema>;

export const BudgetCategorySchema = z.object({
  id: z.string().uuid().optional(),
  group_name: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  icon: z.string().max(64).nullable().optional(),
  sort: z.number().int().min(0).optional()
});
export type BudgetCategoryInput = z.infer<typeof BudgetCategorySchema>;

export const AccountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  type: z.enum(["cash", "checking", "credit", "savings", "investment", "other"]),
  default_method: z.enum(["pix", "debito", "credito", "dinheiro"]).nullable().optional(),
  group_label: z.string().min(1).max(80),
  sort: z.number().int().min(0).optional(),
  is_closed: z.boolean().optional()
});
export type AccountInput = z.infer<typeof AccountSchema>;

export const ExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  amount_cents: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().nullable(),
  account_id: z.string().uuid().nullable().optional(),
  method: z.enum(["pix", "debito", "credito", "dinheiro"]),
  description: z.string().max(140).optional(),
  memo: z.string().max(280).optional(),
  direction: z.enum(["outflow", "inflow"]).optional()
});
export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const UpdateExpenseSchema = z
  .object({
    amount_cents: z.number().int().positive().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    category_id: z.string().uuid().nullable().optional(),
    account_id: z.string().uuid().nullable().optional(),
    method: z.enum(["pix", "debito", "credito", "dinheiro"]).optional(),
    description: z.string().max(140).optional(),
    memo: z.string().max(280).nullable().optional(),
    direction: z.enum(["outflow", "inflow"]).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar"
  });
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
