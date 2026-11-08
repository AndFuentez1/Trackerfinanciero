import { describe, it, expect } from 'vitest';
import { groupInvoiceItems, toTransactionDate, type InvoiceApprovalItem } from './invoiceGrouping';

const item = (description: string, total: number, category: string, category_id: string | null, payment_method_id = 'visa'): InvoiceApprovalItem =>
    ({ description, total, category, category_id, payment_method_id });

describe('groupInvoiceItems', () => {
    it('agrupa por categoría y método de pago, sumando sin errores de decimales', () => {
        const groups = groupInvoiceItems([
            item('Leche', 4500.1, 'Mercado', 'c1'),
            item('Pan', 3200.2, 'Mercado', 'c1'),
            item('Shampoo', 18000, 'Aseo', 'c2'),
            item('Huevos', 15000, 'Mercado', 'c1', 'debito'),
        ], 'Éxito');

        expect(groups).toHaveLength(3);
        const mercadoVisa = groups.find(g => g.category_id === 'c1' && g.payment_method_id === 'visa')!;
        expect(mercadoVisa.amount).toBe(7700.3);
        expect(mercadoVisa.description).toBe('Éxito: Leche, Pan');
    });

    it('resume descripciones largas', () => {
        const [g] = groupInvoiceItems(['A', 'B', 'C', 'D', 'E'].map(d => item(d, 1, 'Mercado', 'c1')));
        expect(g.description).toBe('A, B, C (+2)');
    });

    it('agrupa por nombre cuando aún no hay id de categoría (sin distinguir mayúsculas)', () => {
        const groups = groupInvoiceItems([item('X', 1, 'Mascotas', null), item('Y', 2, 'mascotas ', null)]);
        expect(groups).toHaveLength(1);
        expect(groups[0].amount).toBe(3);
    });
});

describe('toTransactionDate', () => {
    const fallback = new Date(2026, 10, 8);
    it('normaliza distintos formatos a yyyy-MM-dd', () => {
        expect(toTransactionDate('2025-03-04', fallback)).toBe('2025-03-04');
        expect(toTransactionDate(String(new Date(2025, 0, 15, 10).getTime()), fallback)).toBe('2025-01-15');
        expect(toTransactionDate('2025-02-10T12:00:00', fallback)).toBe('2025-02-10');
    });
    it('usa la fecha de respaldo si no hay o es inválida', () => {
        expect(toTransactionDate(undefined, fallback)).toBe('2026-11-08');
        expect(toTransactionDate('no es fecha', fallback)).toBe('2026-11-08');
    });
});
