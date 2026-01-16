import * as z from "zod";

export const insertTransactionSchema = z.object({
    type: z.enum(["income", "expense", "investment", "saving", "transfer_out", "transfer_in", "loan"]),
    category: z.string().min(1, "La categoría es requerida"),
    category_id: z.string().optional().nullable(),
    amount: z.coerce
        .number()
        .min(0.01, "El monto debe ser mayor a 0"),
    description: z.string().min(1, "La descripción es requerida"),
    date: z.string(),
    payment_method_id: z.string().nullable().optional(),
});

export type TransactionFormValues = z.infer<typeof insertTransactionSchema>;

export const budgetSchema = z.object({
    category_id: z.string().min(1, "La categoría es requerida"),
    category: z.string().min(1, "El nombre de la categoría es requerido"),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;
