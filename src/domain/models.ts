import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(40),
  color: z.string().min(4).max(16)
});
export type CategoryInput = z.infer<typeof CategorySchema>;

export const ExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  amount_cents: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().nullable(),
  method: z.enum(["pix", "debito", "credito", "dinheiro"]),
  description: z.string().max(140).optional()
});
export type ExpenseInput = z.infer<typeof ExpenseSchema>;
