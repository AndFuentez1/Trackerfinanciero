import { formatLocalDate, parseLocalDate } from '@/core/utils';

/** Producto de una factura listo para aprobar (categoría y método de pago ya resueltos). */
export interface InvoiceApprovalItem {
    description: string;
    total: number;
    category_id: string | null;
    category: string;
    payment_method_id: string;
}

/** Una transacción por (categoría, método de pago) con la suma de sus productos. */
export interface InvoiceTransactionGroup {
    key: string;
    category_id: string | null;
    category: string;
    payment_method_id: string;
    amount: number;
    description: string;
    items: InvoiceApprovalItem[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Agrupa los productos de una factura por categoría y método de pago.
 * Descripción: "Tienda: prod1, prod2 (+N)" (máx. 200 caracteres) para reconocer la compra en el historial.
 */
export function groupInvoiceItems(items: InvoiceApprovalItem[], store?: string | null): InvoiceTransactionGroup[] {
    const groups = new Map<string, InvoiceTransactionGroup>();
    for (const item of items) {
        const categoryKey = item.category_id || item.category.trim().toLowerCase();
        const key = `${categoryKey}|${item.payment_method_id}`;
        const existing = groups.get(key);
        if (existing) {
            existing.amount = round2(existing.amount + item.total);
            existing.items.push(item);
        } else {
            groups.set(key, {
                key,
                category_id: item.category_id,
                category: item.category,
                payment_method_id: item.payment_method_id,
                amount: round2(item.total),
                description: '',
                items: [item],
            });
        }
    }

    const prefix = store?.trim() ? `${store.trim()}: ` : '';
    for (const group of groups.values()) {
        const names = group.items.map(i => i.description.trim()).filter(Boolean);
        const shown = names.slice(0, 3).join(', ');
        const extra = names.length > 3 ? ` (+${names.length - 3})` : '';
        group.description = `${prefix}${shown || group.category}${extra}`.slice(0, 200);
    }
    return [...groups.values()];
}

/**
 * Fecha de la transacción en formato yyyy-MM-dd (hora local).
 * Acepta yyyy-MM-dd, ISO, fecha RFC del correo ("Mon, 3 Nov 2025 10:00:00 -0500") o epoch en ms.
 */
export function toTransactionDate(value?: string | number | null, fallback: Date = new Date()): string {
    if (value === null || value === undefined || value === '') { return formatLocalDate(fallback); }
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return parseLocalDate(raw) ? raw : formatLocalDate(fallback);
    }
    const date = /^\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
    return Number.isNaN(date.getTime()) ? formatLocalDate(fallback) : formatLocalDate(date);
}
