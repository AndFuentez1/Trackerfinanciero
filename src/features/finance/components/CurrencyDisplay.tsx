import { cn } from '@/core/utils';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES, DEFAULT_CURRENCY_CODE, DEFAULT_LOCALE } from '@/features/finance/constants/currencyConstants';

interface CurrencyDisplayProps {
    amount: number;
    currencyCode?: string;
    className?: string;
    variant?: 'default' | 'large' | 'small';
    hideSymbol?: boolean;
}

export function CurrencyDisplay({
    amount,
    currencyCode,
    className,
    variant = 'default',
    hideSymbol = false
}: CurrencyDisplayProps) {
    const decimalPlaces = useDecimalPlaces();
    const { currency: ctxCurrency } = useFinance();

    // Use provided currency or context currency or default
    const activeCurrency = currencyCode || ctxCurrency || DEFAULT_CURRENCY_CODE;

    const getCurrencySymbol = (code: string): string => {
        const curr = CURRENCIES.find(c => c.code === code);
        return curr?.symbol || code;
    };

    const symbol = getCurrencySymbol(activeCurrency);

    const formatParts = (value: number) => {
        const absValue = Math.abs(value);

        // Format number to get proper separators
        const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(absValue);

        // Split integer and decimal parts
        const parts = formatted.split(',');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? parts[1] : null;

        return { integerPart, decimalPart };
    };

    const { integerPart, decimalPart } = formatParts(amount);
    const isNegative = amount < 0;

    // Sizes based on variant
    const symbolClass = variant === 'large' ? 'text-xl align-top mt-1' : 'text-[0.7em] align-top';

    return (
        <span className={cn("inline-flex items-baseline font-semibold whitespace-nowrap", className)}>
            {isNegative && <span className="mr-0.5">-</span>}

            {!hideSymbol && (
                <span className={cn("opacity-80 mr-0.5", symbolClass)}>
                    {symbol}
                </span>
            )}

            <span>{integerPart}</span>

            {decimalPart && (
                <span className="text-[0.7em] align-top ml-[1px] opacity-80">
                    ,{decimalPart}
                </span>
            )}
        </span>
    );
}
