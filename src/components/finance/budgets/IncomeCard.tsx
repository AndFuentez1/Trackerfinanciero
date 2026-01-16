import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinanceData } from "@/hooks/useFinanceData";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function IncomeCard() {
    const { summary } = useFinanceData();

    const { totalIncome, totalExpenses } = summary;
    const netFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;
    const expensePercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    return (
        <Card className="flex-1 min-h-[200px] p-6 border-emerald-200 bg-emerald-50/30 hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-emerald-800">Ingresos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
