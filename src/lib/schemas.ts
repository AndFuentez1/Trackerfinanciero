import * as z from "zod";
import { parseLocalDate } from "@/core/utils";
import { subYears, addYears, isWithinInterval } from "date-fns";

export const insertTransactionSchema = z.object({
    type: z.enum(["income", "expense", "investment", "saving", "savings", "transfer_out", "transfer_in", "loan", "other"]),
    category: z.string().nullable().optional(),
    category_id: z.string().optional().nullable(),
    amount: z.coerce
        .number()
        .min(0.01, "El monto debe ser mayor a 0"),
    description: z.string().nullable().optional(),
    date: z.string().refine((val) => {
        // Validar formato yyyy-MM-dd
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;

        // Validar que sea fecha real
        const parsed = parseLocalDate(val);
        if (!parsed) return false;

        // Validar rango razonable (10 años atrás, 1 año adelante)
        const now = new Date();
        const minDate = subYears(now, 10);
        const maxDate = addYears(now, 1);

        return isWithinInterval(parsed, { start: minDate, end: maxDate });
    }, {
        message: "Fecha inválida o fuera de rango permitido (10 años atrás - 1 año adelante)"
    }),
    payment_method_id: z.string().nullable().optional(),
    to_payment_method_id: z.string().nullable().optional(),
    installments: z.coerce.number().min(1).default(1),
});

export type TransactionFormValues = z.infer<typeof insertTransactionSchema>;

export const budgetSchema = z.object({
    category_id: z.string().min(1, "La categoría es requerida"),
    category: z.string().min(1, "El nombre de la categoría es requerido"),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;
