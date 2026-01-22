import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useBudgetsData } from "@/hooks/useBudgetsData";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { parseISO, isWithinInterval } from "date-fns";

export function IncomeCard() {
    const { transactions, allTransactions } = useFinanceData();
    const { budgetYear, budgetMonth, setBudgetPeriod, availableYears } = useBudgetsData();

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
            if (!yearMatch) return false;
            
            // Check month filter
            const monthMatch = budgetMonth === 'all' || (typeof budgetMonth === 'number' && tMonth === budgetMonth);
            if (!monthMatch) return false;
            
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
        <Card className="flex h-full min-h-[360px] flex-col p-6 border-emerald-200 bg-emerald-50/30 hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-3">
                    <CardTitle className="text-lg font-bold text-emerald-800">Balance</CardTitle>
                    <div className="flex flex-col gap-2">
                        <Select
                            value={selectedMonth}
                            onValueChange={(val) => setBudgetPeriod(budgetYear, val === 'all' ? 'all' : Number(val) + 1)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedYear}
                            onValueChange={(val) => setBudgetPeriod(val === 'all' ? 'all' : Number(val), budgetMonth)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los años</SelectItem>
                                {availableYears.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col">
                {/* Main Metric: Savings Rate */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-emerald-700">Tasa de Ahorro</span>
                        <span className={cn("text-xl font-bold", savingsRate >= 0 ? "text-emerald-600" : "text-red-600")}>
                            {savingsRate.toFixed(0)}%
                        </span>
                    </div>
                    <Progress
                        value={Math.max(0, Math.min(savingsRate, 100))}
                        className="h-3"
                        indicatorClassName={savingsRate >= 0 ? "bg-emerald-500" : "bg-red-500"}
                    />
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                        <span className="text-sm text-emerald-600 font-medium">Ingresos Reales</span>
                        <span className="text-lg font-bold text-emerald-800">{formatCurrency(totalIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                        <span className="text-sm text-emerald-600 font-medium">Gastos Reales</span>
                        <span className="text-lg font-bold text-emerald-800">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-emerald-600 font-medium">Flujo Neto</span>
                        <span className={cn("text-lg font-bold", netFlow >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(netFlow)}
                        </span>
                    </div>
                </div>

                {/* Bottom Message */}
                <div className="text-center pt-2 border-t border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium">
                        Has gastado {expensePercentage.toFixed(0)}% de tus ingresos totales
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
