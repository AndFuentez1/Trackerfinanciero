import { useState } from "react";
import { BudgetState, useBudgetsData } from "@/hooks/useBudgetsData";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, TrendingUp, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AddBudgetDialog } from "../AddBudgetDialog";

interface CategoryBudgetListProps {
    budgets: BudgetState[];
}

export function CategoryBudgetList({ budgets }: CategoryBudgetListProps) {
    const { refreshBudgets, saveBudget } = useBudgetsData();

    if (budgets.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No hay presupuestos configurados.</p>
                <p className="text-xs text-muted-foreground mt-1">Crea uno en Configuración</p>
            </div>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría</th>
                                <th className="w-1/6 px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presupuesto</th>
                                <th className="w-1/6 px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gastado</th>
                                <th className="w-1/6 px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restante</th>
                                <th className="w-1/6 px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progreso</th>
                                <th className="w-1/12 px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                                <th className="w-1/12 px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budgets.map(budget => (
                                <CategoryBudgetRow
                                    key={budget.budget.id}
                                    budget={budget}
                                    onSave={saveBudget}
                                    onRefresh={refreshBudgets}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function CategoryBudgetRow({ budget, onSave, onRefresh }: { budget: BudgetState, onSave: any, onRefresh: any }) {
    const [expanded, setExpanded] = useState(false);

    const getStatusColor = (status: 'ok' | 'warning' | 'overspent') => {
        switch (status) {
            case 'ok': return 'text-emerald-500';
            case 'warning': return 'text-amber-500';
            case 'overspent': return 'text-destructive';
            default: return 'text-primary';
        }
    };

    return (
        <>
            <tr className={cn(
                "border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer",
                expanded ? "bg-muted/10" : ""
            )} onClick={() => setExpanded(!expanded)}>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", budget.categoryColor?.startsWith('#') ? '' : budget.categoryColor)} style={{ backgroundColor: budget.categoryColor?.startsWith('#') ? budget.categoryColor : undefined }} />
                        <span className="font-medium text-sm">{budget.categoryName}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-center">
                    <span className="font-medium">{formatCurrency(budget.budget.amount)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                    <span className="font-medium">{formatCurrency(budget.spent)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                    <span className={cn("font-medium", budget.remaining >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {formatCurrency(budget.remaining)}
                    </span>
                </td>
                <td className="px-4 py-3 text-center">
                    <div className="space-y-1">
                        <div className="text-xs font-bold">{budget.percentage.toFixed(0)}%</div>
                        <Progress
                            value={Math.min(budget.percentage, 100)}
                            className="h-1"
                            indicatorClassName={cn(
                                budget.status === 'ok' ? "bg-emerald-500" :
                                    budget.status === 'warning' ? "bg-amber-500" : "bg-destructive"
                            )}
                        />
                    </div>
                </td>
                <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-bold flex items-center justify-center gap-1", getStatusColor(budget.status))}>
                        {budget.status === 'ok' && <CheckCircle2 className="h-3 w-3" />}
                        {budget.status === 'warning' && <AlertCircle className="h-3 w-3" />}
                        {budget.status === 'overspent' && <AlertCircle className="h-3 w-3" />}
                        {budget.status === 'ok' ? 'OK' : budget.status === 'warning' ? 'Cuidado' : 'Excedido'}
                    </span>
                </td>
                <td className="px-4 py-3 text-center">
                    <AddBudgetDialog
                        editingBudget={{
                            id: budget.budget.id,
                            category_id: budget.budget.category_id,
                            categoryName: budget.categoryName,
                            amount: budget.budget.amount
                        }}
                            monthOverride={budget.budget.month}
                        onAdd={async (data) => {
                            const result = await onSave(data);
                            onRefresh();
                            return result;
                        }}
                    >
                        <button className="p-1 hover:bg-muted rounded-md transition-colors">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </AddBudgetDialog>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={7} className="px-4 py-3 bg-muted/20 border-b">
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                Transacciones Recientes
                            </h4>
                            {budget.transactions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No hay gastos recientes en este periodo.</p>
                            ) : (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {budget.transactions.slice(0, 3).map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center text-xs p-2 rounded bg-background border">
                                            <div>
                                                <span className="font-medium">{tx.description}</span>
                                                <span className="text-muted-foreground ml-2">{new Date(tx.date).toLocaleDateString()}</span>
                                            </div>
                                            <span className="font-bold text-destructive">-{formatCurrency(tx.amount)}</span>
                                        </div>
                                    ))}
                                    {budget.transactions.length > 3 && (
                                        <p className="text-xs text-center text-muted-foreground">
                                            + {budget.transactions.length - 3} más...
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
