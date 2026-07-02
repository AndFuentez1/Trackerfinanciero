import { Card, CardContent } from "@/shared/ui/card";
import { TrendingUp } from "lucide-react";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { useFormatCurrency } from "@/features/finance/hooks/useFormatCurrency";
import { Progress } from "@/shared/ui/progress";
import { parseISO } from "date-fns";
import { useFinance } from "@/features/finance/context/FinanceContext";
import { CURRENCIES } from "@/features/finance/constants/currencyConstants";
import { useDecimalPlaces } from "@/features/finance/hooks/useDecimalPlaces";
import { isBudgetMonthInScope } from "@/features/finance/utils/periodFilters";

interface IncomeCardProps {
    budgetYear: number | 'all';
    budgetMonth: number | 'all' | 'active';
}

export function IncomeCard({ budgetYear, budgetMonth }: IncomeCardProps) {
    const { allTransactions } = useFinanceData();
    const { currency } = useFormatCurrency();
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
        if (parts.length === 1) { return formatted; }

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

    const filteredTransactions = (allTransactions || []).filter(t => {
        const tDate = parseISO(t.date);
        const tYear = tDate.getFullYear();
        const tMonth = tDate.getMonth() + 1;

        const yearMatch = budgetYear === 'all' || (typeof budgetYear === 'number' && tYear === budgetYear);
        if (!yearMatch) { return false; }

        const monthMatch = isBudgetMonthInScope({
            year: tYear,
            month: tMonth,
            selectedYear: budgetYear,
            selectedMonth: budgetMonth,
        });
        if (!monthMatch) { return false; }

        return true;
    });

    const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;
    const expensePercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    return (
        <Card className="flex h-full min-h-[360px] flex-col p-6 bg-card hover:shadow-md transition-shadow overflow-hidden">
            <div className="flex flex-col gap-1 pb-4">
                <div className="flex items-start gap-4">
                    <div className="flex shrink-0 items-center justify-center p-1">
                        <TrendingUp className="h-5 w-5 text-primary" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                            Balance
                        </p>
                    </div>
                </div>
            </div>
            <CardContent className="space-y-6 flex-1 flex flex-col">
                {/* Main Metric: Savings Rate */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-base font-medium text-muted-foreground">Tasa de Ahorro</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-foreground">
                                {savingsRate.toFixed(decimalPlaces)}%
                            </span>
                        </div>
                    </div>
                    <Progress
                        value={Math.max(0, Math.min(savingsRate, 100))}
                        className="h-3"
                        indicatorClassName={savingsRate >= 0 ? "bg-emerald-500" : "bg-red-500"}
                    />
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-base text-muted-foreground font-medium">Ingresos Reales</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency70(totalIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-base text-muted-foreground font-medium">Gastos Reales</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency70(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-base text-muted-foreground font-medium">Flujo Neto</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-foreground">
                                {formatCurrency70(netFlow)}
                            </span>

                        </div>
                    </div>
                </div>

                {/* Bottom Message */}
                <div className="text-center pt-2 border-t border-border">
                    <p className="text-base text-muted-foreground font-medium">
                        Has gastado {expensePercentage.toFixed(decimalPlaces)}% de tus ingresos totales
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}







