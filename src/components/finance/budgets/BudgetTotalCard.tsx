import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TotalBudgetState } from "@/hooks/useBudgetsData";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BudgetTotalCardProps {
    totalBudget: TotalBudgetState;
}

export function BudgetTotalCard({ totalBudget }: BudgetTotalCardProps) {
    const { totalBudgeted, totalSpent, totalRemaining, percentage } = totalBudget;

    // Calculate actual expenses excluding transfers
    const actualExpenses = totalSpent; // Assuming totalSpent already excludes transfers based on the hook
    const difference = totalBudgeted - actualExpenses;
    const isOverBudget = actualExpenses > totalBudgeted;

    return (
        <Card className="flex h-full min-h-[360px] flex-col p-6 border-blue-200 bg-blue-50/30 hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-blue-800">Presupuesto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Bar and Percentage */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-700">Ejecución del Presupuesto</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-foreground">
                                {percentage.toFixed(0)}%
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
                    <div className="flex justify-between items-center py-2 border-b border-blue-100">
                        <span className="text-sm text-blue-600 font-medium">Presupuestado</span>
                        <span className="text-lg font-bold text-blue-800">{formatCurrency(totalBudgeted)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100">
                        <span className="text-sm text-blue-600 font-medium">Gastos Reales</span>
                        <span className="text-lg font-bold text-blue-800">{formatCurrency(actualExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-blue-600 font-medium">Diferencia</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-foreground">
                                {formatCurrency(difference)}
                            </span>
                            {difference >= 0 ? 
                                <TrendingUp className="h-5 w-5 text-emerald-500" /> : 
                                <TrendingDown className="h-5 w-5 text-red-500" />
                            }
                        </div>
                    </div>
                </div>

                {/* Bottom Message */}
                <div className="text-center pt-2 border-t border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">
                        Has gastado {percentage.toFixed(0)}% de tu presupuesto
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
