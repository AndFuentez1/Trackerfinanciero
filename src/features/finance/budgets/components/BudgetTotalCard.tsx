import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useFormatCurrency } from "@/features/finance/hooks/useFormatCurrency";
import { TotalBudgetState } from "@/features/finance/hooks/useBudgetsData";
import { cn } from "@/core/utils";
import { Progress } from "@/shared/ui/progress";
import { useFinance } from "@/features/finance/context/FinanceContext";
import { CURRENCIES } from "@/features/finance/constants/currencyConstants";
import { useDecimalPlaces } from "@/features/finance/hooks/useDecimalPlaces";
import { TrendingDown } from 'lucide-react';

interface BudgetTotalCardProps {
    totalBudget: TotalBudgetState;
}

export function BudgetTotalCard({ totalBudget }: BudgetTotalCardProps) {
    const { totalBudgeted, totalSpent, totalRemaining, percentage } = totalBudget;
    const { formatCurrencySmall, currency } = useFormatCurrency();
    const { currency: ctxCurrency } = useFinance();
    const decimalPlaces = useDecimalPlaces();

    const formatCurrency70 = (value: number) => {
        const currCode = ctxCurrency || currency || 'COP';
        const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;
        const decimals = decimalPlaces;

        const formatted = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currCode,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            currencyDisplay: 'code',
        }).format(value).replace(currCode, symbol);

        if (decimals === 0) {
            return (
                <span className="inline-flex items-baseline gap-1">
                    <span style={{ fontSize: '0.7em' }}>{symbol}</span>
                    <span>{formatted.replace(symbol, '').trim()}</span>
                </span>
            );
        }

        const parts = formatted.split(',');
        if (parts.length === 1) return formatted;

        const integerPart = parts[0].replace(symbol, '').trim();
        const decimalPart = parts[1];

        return (
            <span className="inline-flex items-baseline gap-[2px]">
                <span style={{ fontSize: '0.7em' }}>{symbol}</span>
                <span>
                    {integerPart}
                    <span className="opacity-85" style={{ fontSize: '0.7em' }}>,{decimalPart}</span>
                </span>
            </span>
        );
    };

    // Calculate actual expenses excluding transfers
    const actualExpenses = totalSpent; // Assuming totalSpent already excludes transfers based on the hook
    const difference = totalBudgeted - actualExpenses;
    const isOverBudget = actualExpenses > totalBudgeted;

    return (
        <Card className="flex h-full min-h-[360px] flex-col p-6 bg-card hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-primary">Presupuesto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Bar and Percentage */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Ejecución del Presupuesto</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-foreground">
                                {percentage.toFixed(decimalPlaces)}%
                            </span>
                            {isOverBudget && <TrendingDown className="h-5 w-5 text-red-500" />}
                        </div>
                    </div>
                    <Progress
                        value={Math.min(percentage, 100)}
                        className="h-3"
                        indicatorClassName={isOverBudget ? "bg-red-500" : "bg-blue-500"}
                    />
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground font-medium">Presupuestado</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency70(totalBudgeted)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground font-medium">Gastos Reales</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency70(actualExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground font-medium">Diferencia</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-foreground">
                                {formatCurrency70(difference)}
                            </span>

                        </div>
                    </div>
                </div>

                {/* Bottom Message */}
                <div className="text-center pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">
                        Has gastado {percentage.toFixed(decimalPlaces)}% de tu presupuesto
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}






