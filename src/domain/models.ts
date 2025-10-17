import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(40),
  color: z.string().min(4).max(16)
});
export type CategoryInput = z.infer<typeof CategorySchema>;

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
