import { useState } from "react";
import type { Budget } from '@/features/finance/types/financeTypes';
import type { BudgetState } from "@/features/finance/hooks/useBudgetsData";
import { useBudgetsData } from "@/features/finance/hooks/useBudgetsData";
import { cn } from "@/core/utils";
import { Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { AddBudgetDialog } from "./AddBudgetDialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";

import type { PaymentMethod } from "@/features/finance/hooks/useFinanceData";
import { useFormatCurrency } from "@/features/finance/hooks/useFormatCurrency";
import { useFinance } from "@/features/finance/context/FinanceContext";
import { CURRENCIES } from "@/features/finance/constants/currencyConstants";
import { useDecimalPlaces } from "@/features/finance/hooks/useDecimalPlaces";

interface CategoryBudgetListProps {
    budgets: BudgetState[];
    paymentMethods?: PaymentMethod[];
}

export function CategoryBudgetList({ budgets, paymentMethods = [] }: CategoryBudgetListProps) {
    const { refreshBudgets, saveBudget, deleteBudget } = useBudgetsData();

    const [expandedCount, setExpandedCount] = useState(0);

    if (budgets.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No hay presupuestos configurados.</p>
                <p className="text-base text-muted-foreground mt-1">Crea uno en Configuración</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="hidden md:block bg-gray-50/50 dark:bg-muted/20 rounded-xl border-l border-r border-arquitectura-2/30 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                        <thead className="bg-gradient-to-r from-muted/40 to-muted/20">
                            <tr>
                                <th className="py-4 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">Categoría</th>
                                <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">Presupuesto</th>
                                <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">Gastado</th>
                                <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">Restante</th>
                                <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">Progreso</th>
                                <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">Editar</th>
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

            <div className="grid grid-cols-1 gap-4 md:hidden">
                {budgets.map(budget => (
                    <CategoryBudgetMobileCard
                        key={budget.budget.id}
                        budget={budget}
                        onSave={saveBudget}
                        onDelete={deleteBudget}
                        onRefresh={refreshBudgets}
                        paymentMethods={paymentMethods}
                    />
                ))}
            </div>
        </div>
    );
}

function CategoryBudgetMobileCard({
    budget,
    onSave,
    onDelete,
    onRefresh,
    paymentMethods
}: {
    budget: BudgetState,
    onSave: (budget: any) => Promise<any>,
    onDelete: (id: string) => Promise<any>,
    onRefresh: () => void,
    paymentMethods: PaymentMethod[]
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
            useGrouping: true,
        }).format(Number(value)).replace(currCode, symbol);

        if (decimals === 0) {
            return (
                <span className="inline-flex items-baseline gap-1">
                    <span style={{ fontSize: '0.8em' }}>{symbol}</span>
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
                <span style={{ fontSize: '0.8em' }}>{symbol}</span>
                <span>
                    {integerPart}
                    <span className="opacity-85" style={{ fontSize: '0.8em' }}>,{decimalPart}</span>
                </span>
            </span>
        );
    };

    return (
        <Card className="overflow-hidden bg-card/50 border border-border shadow-sm">
            <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", budget.categoryColor?.startsWith('#') ? '' : budget.categoryColor)} style={{ backgroundColor: budget.categoryColor?.startsWith('#') ? budget.categoryColor : undefined }} />
                        <span className="font-semibold text-base">{budget.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                                size="sm"
                                className="h-8 w-8 px-0 border-primary/20 text-primary hover:bg-primary/10 rounded-lg shadow-sm"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </AddBudgetDialog>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 px-0 text-muted-foreground hover:bg-muted/30"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col bg-muted/20 p-2 rounded-lg">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Presupuesto</span>
                        <span className="font-bold">{formatCurrency80(budget.budget.amount)}</span>
                    </div>
                    <div className="flex flex-col bg-muted/20 p-2 rounded-lg">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Total Gastado</span>
                        <span className="font-bold">{formatCurrency80(budget.spent)}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-muted-foreground">Restante</span>
                        <span className={cn("font-bold", budget.remaining >= 0 ? "text-emerald-600" : "text-destructive")}>
                            {formatCurrency80(budget.remaining)}
                        </span>
                    </div>
                    <Progress
                        value={Math.min(budget.percentage, 100)}
                        className="h-2"
                        indicatorClassName={budget.percentage > 100 ? "bg-destructive" : budget.percentage > 85 ? "bg-orange-500" : "bg-primary"}
                    />
                    <div className="text-right text-xs font-bold text-muted-foreground">{budget.percentage.toFixed(decimalPlaces)}%</div>
                </div>

                {expanded && (
                    <div className="mt-2 pt-3 border-t border-border space-y-2">
                        {budget.transactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-2">No hay gastos recientes en este periodo.</p>
                        ) : (
                            budget.transactions.slice(0, 5).map(tx => {
                                const pm = paymentMethods.find(p => p.id === tx.payment_method_id);
                                return (
                                    <div key={tx.id} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{tx.description}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()} • {pm?.name || '-'}</span>
                                        </div>
                                        <span className="font-bold text-destructive">-{formatCurrencySmall(tx.amount)}</span>
                                    </div>
                                );
                            })
                        )}
                        {budget.transactions.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground pt-1">+ {budget.transactions.length - 5} más...</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
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
    onSave: (budget: { category_id: string; category?: string; category_name?: string; amount: number; month?: string }) => Promise<any>,
    onDelete: (id: string) => Promise<any>,
    onRefresh: () => void,
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
            useGrouping: true,
        }).format(Number(value)).replace(currCode, symbol);

        if (decimals === 0) {
            return (
                <span className="inline-flex items-baseline gap-1">
                    <span style={{ fontSize: '0.8em' }}>{symbol}</span>
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
                "border-b border-border hover:bg-muted/20 transition-colors cursor-pointer",
                expanded ? "bg-muted/10" : "",
                (budget.categoryName === 'Ahorros' || budget.categoryName === 'Savings') && !expanded ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
            )} onClick={toggleExpanded}>
                <td className="px-4 py-3 border-r border-border">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", budget.categoryColor?.startsWith('#') ? '' : budget.categoryColor)} style={{ backgroundColor: budget.categoryColor?.startsWith('#') ? budget.categoryColor : undefined }} />
                        <span className="font-medium text-sm">{budget.categoryName}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-center border-r border-border">
                    <span className="font-medium text-sm">{formatCurrency80(budget.budget.amount)}</span>
                </td>
                <td className="px-4 py-3 text-center border-r border-border">
                    <span className="font-medium text-sm">{formatCurrency80(budget.spent)}</span>
                </td>
                <td className="px-4 py-3 text-center border-r border-border">
                    <span className={cn("font-medium text-sm", budget.remaining >= 0 ? "text-emerald-600" : "text-destructive")}>
                        {formatCurrency80(budget.remaining)}
                    </span>
                </td>
                <td className="px-4 py-3 text-center border-r border-border">
                    <div className="text-sm font-bold">{budget.percentage.toFixed(decimalPlaces)}%</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-border">
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
                <td className="px-4 py-3 text-center border-border">
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
                                <p className="text-base text-muted-foreground">No hay gastos recientes en este periodo.</p>
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







