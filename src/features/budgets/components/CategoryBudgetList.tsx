import { useState } from "react";
import { BudgetState, useBudgetsData } from "@/hooks/useBudgetsData";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { AddBudgetDialog } from "./AddBudgetDialog";
import { Button } from "@/components/ui/button";
import { PaymentMethod } from "@/hooks/useFinanceData";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useFinance } from "@/contexts/FinanceContext";
import { CURRENCIES } from "@/hooks/currencyConstants";
import { useDecimalPlaces } from "@/hooks/useDecimalPlaces";

interface CategoryBudgetListProps {
    budgets: BudgetState[];
    paymentMethods?: PaymentMethod[];
}

export function CategoryBudgetList({ budgets, paymentMethods = [] }: CategoryBudgetListProps) {
    const { refreshBudgets, saveBudget, deleteBudget } = useBudgetsData();
    const { formatCurrencySmall } = useFormatCurrency();
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
        <div className="hidden md:block bg-gradient-to-b from-card to-card/50 rounded-xl border-l border-r border-arquitectura-2/30 overflow-hidden shadow-md">
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
                                onDelete={deleteBudget}
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

function CategoryBudgetRow({
    budget,
    onSave,
    onDelete,
    onRefresh,
    paymentMethods = [],
    onExpandChange
}: {
    budget: BudgetState,
    onSave: any,
    onDelete: any,
    onRefresh: any,
    paymentMethods: PaymentMethod[],
    onExpandChange: (expanded: boolean) => void
}) {
    const [expanded, setExpanded] = useState(false);
    const { formatCurrencySmall, currency } = useFormatCurrency();
    const { currency: ctxCurrency } = useFinance();
    const decimalPlaces = useDecimalPlaces();

    const formatCurrency80 = (value: number) => {
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
                    <span style={{ fontSize: '0.8em' }}>{symbol}</span>
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
                <span style={{ fontSize: '0.8em' }}>{symbol}</span>
                <span>
                    {integerPart}
                    <span className="opacity-85" style={{ fontSize: '0.8em' }}>,{decimalPart}</span>
                </span>
            </span>
        );
    };

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
                    <span className="font-medium text-sm">{formatCurrency80(budget.budget.amount)}</span>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
                    <span className="font-medium text-sm">{formatCurrency80(budget.spent)}</span>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
                    <span className={cn("font-medium text-sm", budget.remaining >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {formatCurrency80(budget.remaining)}
                    </span>
                </td>
                <td className="px-4 py-3 text-center border-r border-arquitectura-2/30">
                    <div className="text-sm font-bold">{budget.percentage.toFixed(decimalPlaces)}%</div>
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
                        onDelete={onDelete}
                    >
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-sm border-primary/80"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </AddBudgetDialog>
                </td>
                <td className="px-4 py-3 text-center border-arquitectura-2/30">
                    <button
                        className="w-8 h-8 rounded-sm border border-primary/80 flex items-center justify-center mx-auto hover:bg-primary/10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
                    >
                        <span className="text-lg font-semibold leading-none text-black">{expanded ? '−' : '+'}</span>
                    </button>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={7} className="p-0 bg-card/50 border-b">
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
                                                        <td className="px-2 py-2 text-right font-semibold text-destructive">-{formatCurrencySmall(tx.amount)}</td>
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
