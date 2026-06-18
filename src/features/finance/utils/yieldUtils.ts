export type YieldPeriod = 'annual' | 'monthly';

const YIELD_DECIMALS = 2;

/** Siempre 2 decimales para tasas de interés/rendimiento, independiente de decimal_places del perfil. */
export function formatYieldPercent(value: number): string {
    return `${value.toFixed(YIELD_DECIMALS).replace('.', ',')}%`;
}

export function formatYieldLabel(value: number, period: YieldPeriod = 'annual'): string {
    const periodLabel = period === 'monthly' ? 'mensual' : 'anual';
    return `${formatYieldPercent(value)} ${periodLabel}`;
}

/** Tasa mensual efectiva (decimal, p. ej. 0.004074 para ~5% EA). */
export function getMonthlyEffectiveRate(ratePercent: number, period: YieldPeriod = 'annual'): number {
    if (ratePercent <= 0) {
        return 0;
    }
    if (period === 'monthly') {
        return ratePercent / 100;
    }
    const annual = ratePercent / 100;
    return Math.pow(1 + annual, 1 / 12) - 1;
}

/** Interés mensual sobre un saldo dado la tasa configurada y su periodo. */
export function calculateMonthlyInterest(balance: number, ratePercent: number, period: YieldPeriod = 'annual'): number {
    if (balance <= 0 || ratePercent <= 0) {
        return 0;
    }
    const monthlyRate = getMonthlyEffectiveRate(ratePercent, period);
    return balance * monthlyRate;
}

export function normalizeYieldPeriod(value: unknown): YieldPeriod {
    return value === 'monthly' ? 'monthly' : 'annual';
}
