import { useState } from "react";
import { BudgetState, useBudgetsData } from "@/hooks/useBudgetsData";
import { formatCurrency, cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { AddBudgetDialog } from "../AddBudgetDialog";
import { PaymentMethod } from "@/hooks/useFinanceData";

interface CategoryBudgetListProps {
    budgets: BudgetState[];
    paymentMethods?: PaymentMethod[];
}

export function CategoryBudgetList({ budgets, paymentMethods = [] }: CategoryBudgetListProps) {
    const { refreshBudgets, saveBudget } = useBudgetsData();
    const [expandedCount, setExpandedCount] = useState(0);

    if (budgets.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No hay presupuestos configurados.</p>
                <p className="text-xs text-muted-foreground mt-1">Crea uno en Configuración</p>
            </div>
        );
    }

    return (
        <div className="hidden md:block bg-gradient-to-b from-[#F4F5F7] to-[#F4F5F7]/50 rounded-xl border-l border-r border-arquitectura-2/30 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                    <thead className="bg-gradient-to-r from-muted/40 to-muted/20">
                        <tr>
                            <th className="py-4 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-arquitectura-2/30">Categoría</th>
                            <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-arquitectura-2/30">Presupuesto</th>
                            <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-arquitectura-2/30">Gastado</th>
                            <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-arquitectura-2/30">Restante</th>
                            <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-arquitectura-2/30">Progreso</th>
                            <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-arquitectura-2/30">Editar</th>
                            <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{expandedCount > 0 ? 'Cerrar' : 'Abrir'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {budgets.map(budget => (
                            <CategoryBudgetRow
                                key={budget.budget.id}
                                budget={budget}
                                onSave={saveBudget}
                                onRefresh={refreshBudgets}
                                paymentMethods={paymentMethods}
                                onExpandChange={(isExpanded: boolean) => setExpandedCount(count => Math.max(0, count + (isExpanded ? 1 : -1)))}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CategoryBudgetRow({ budget, onSave, onRefresh, paymentMethods = [], onExpandChange }: { budget: BudgetState, onSave: any, onRefresh: any, paymentMethods: PaymentMethod[], onExpandChange: (expanded: boolean) => void }) {
    const [expanded, setExpanded] = useState(false);

    const toggleExpanded = () => {
        setExpanded(prev => {
            const next = !prev;
            onExpandChange(next);
            return next;
        });
    };

    return (
        <>
            <tr className={cn(
                "border-b border-arquitectura-2/30 hover:bg-muted/20 transition-colors cursor-pointer",
                expanded ? "bg-muted/10" : ""
            )} onClick={toggleExpanded}>
                <td className="px-4 py-3 border-r border-arquitectura-2/30">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", budget.categoryColor?.startsWith('#') ? '' : budget.categoryColor)} style={{ backgroundColor: budget.categoryColor?.startsWith('#') ? budget.categoryColor : undefined }} />
                        <span className="font-medium text-sm">{budget.categoryName}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
                    <span className="font-medium">{formatCurrency(budget.budget.amount)}</span>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
                    <span className="font-medium">{formatCurrency(budget.spent)}</span>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
                    <span className={cn("font-medium", budget.remaining >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {formatCurrency(budget.remaining)}
                    </span>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
                    <div className="text-xs font-bold">{budget.percentage.toFixed(0)}%</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
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
                        <button className="p-1 hover:bg-muted rounded-md transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </AddBudgetDialog>
                </td>
                <td className="px-4 py-3 text-center cursor-pointer hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}>
                    <span className="text-lg font-semibold">{expanded ? '−' : '+'}</span>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={7} className="p-0 bg-[#FCFDFE] border-b">
                        <div className="space-y-2 px-4 py-3">
                            {budget.transactions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No hay gastos recientes en este periodo.</p>
                            ) : (
                                <div className="overflow-x-auto max-h-40 overflow-y-auto">
                                    <table className="w-full min-w-full table-fixed text-xs">
                                        <thead className="bg-muted/60 sticky top-0">
                                            <tr>
                                                <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Fecha</th>
                                                <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Descripción</th>
                                                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Método</th>
                                                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {budget.transactions.slice(0, 5).map(tx => {
                                                const paymentMethod = paymentMethods.find(pm => pm.id === tx.payment_method_id);
                                                return (
                                                    <tr key={tx.id} className="border-t border-arquitectura-2/10 hover:bg-muted/5">
                                                        <td className="px-2 py-2 text-left text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</td>
                                                        <td className="px-2 py-2 text-left">{tx.description}</td>
                                                        <td className="px-2 py-2 text-center text-muted-foreground">{paymentMethod?.name || '-'}</td>
                                                        <td className="px-2 py-2 text-right font-semibold text-destructive">-{formatCurrency(tx.amount)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {budget.transactions.length > 5 && (
                                <p className="text-xs text-center text-muted-foreground">
                                    + {budget.transactions.length - 5} más...
                                </p>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
