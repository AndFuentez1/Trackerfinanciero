import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { useBudgetsData } from "@/features/finance/hooks/useBudgetsData";
import { useFormatCurrency } from "@/features/finance/hooks/useFormatCurrency";
import { cn } from "@/core/utils";
import { Progress } from "@/shared/ui/progress";
import { parseISO, isWithinInterval } from "date-fns";
import { useFinance } from "@/features/finance/context/FinanceContext";
import { CURRENCIES } from "@/features/finance/constants/currencyConstants";
import { useDecimalPlaces } from "@/features/finance/hooks/useDecimalPlaces";

export function IncomeCard() {
    const { transactions, allTransactions } = useFinanceData();
    const { budgetYear, budgetMonth, setBudgetPeriod, availableYears } = useBudgetsData();
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

    const selectedMonth = budgetMonth === 'all' ? 'all' : (budgetMonth - 1).toString();
    const selectedYear = budgetYear === 'all' ? 'all' : budgetYear.toString();

    // Use all transactions when filtering by 'all', otherwise use the filtered transactions
    const transactionsToFilter = budgetYear === 'all' ? allTransactions : transactions;

    const monthOptions = [
        { value: 'all', label: 'Todo el año' },
        { value: '0', label: 'Enero' },
        { value: '1', label: 'Febrero' },
        { value: '2', label: 'Marzo' },
        { value: '3', label: 'Abril' },
        { value: '4', label: 'Mayo' },
        { value: '5', label: 'Junio' },
        { value: '6', label: 'Julio' },
        { value: '7', label: 'Agosto' },
        { value: '8', label: 'Septiembre' },
        { value: '9', label: 'Octubre' },
        { value: '10', label: 'Noviembre' },
        { value: '11', label: 'Diciembre' },
    ];

    // Filter transactions by selected month/year
    const getFilteredTransactions = () => {
        return transactionsToFilter.filter(t => {
            const tDate = parseISO(t.date);
            const tYear = tDate.getFullYear();
            const tMonth = tDate.getMonth() + 1;

            // Check year filter
            const yearMatch = budgetYear === 'all' || (typeof budgetYear === 'number' && tYear === budgetYear);
            if (!yearMatch) { return false; }

            // Check month filter
            const monthMatch = budgetMonth === 'all' || (typeof budgetMonth === 'number' && tMonth === budgetMonth);
            if (!monthMatch) { return false; }

            return true;
        });
    };

    const filteredTransactions = getFilteredTransactions();

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
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-primary">Balance</CardTitle>
            </CardHeader>
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







