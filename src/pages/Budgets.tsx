import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetsData } from "@/hooks/useBudgetsData";
import { useFinanceData } from "@/hooks/useFinanceData";
import { formatCurrency } from "@/lib/utils";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, LogOut, Wallet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InsightsPanel } from "@/components/finance/InsightsPanel";

import { BudgetTotalCard } from "@/components/finance/budgets/BudgetTotalCard";
import { CategoryBudgetList } from "@/components/finance/budgets/CategoryBudgetList";
import { IncomeCard } from "@/components/finance/budgets/IncomeCard";
import { AddBudgetDialog } from '@/components/finance/AddBudgetDialog';
import { FutureExpensesList } from "@/components/finance/budgets/FutureExpensesList";

export default function BudgetsPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { totalBudget, budgets, loading: budgetsLoading, refreshBudgets, saveBudget, lastModification } = useBudgetsData();
    const { insights } = useFinanceData();

    // Filter only budget-related insights
    const budgetInsights = insights.filter(i => i.id.startsWith('budget-'));

    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse">Cargando...</div></div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <PieChart className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-semibold">Presupuesto Mensual</h1>
                        {lastModification && (
                            <p className="text-[10px] text-muted-foreground mt-1 hidden sm:block">
                                Última modificación: {format(lastModification, "dd/MM/yyyy HH:mm:ss", { locale: es })}
                            </p>
                        )}
                    </div>
                    <div className="z-20">
                        <AddBudgetDialog onAdd={saveBudget} />
                    </div>
                </div>
            </header>

            <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Top Section: Total Budget & Income (Side by Side on desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <BudgetTotalCard totalBudget={totalBudget} />
                    </div>

                    <div className="space-y-4">
                        <IncomeCard />
                    </div>
                </div>

                <Separator className="my-6" />

                {/* Category Budgets Grid */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-muted-foreground" />
                            Presupuestos por Categoría
                        </h2>
                    </div>

                    <CategoryBudgetList budgets={budgets} />
                </div>

                <Separator className="my-6" />

                {/* Budget Alerts Section */}
                {budgetInsights.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-warning" />
                                Alertas de Presupuesto
                            </h2>
                        </div>
                        <InsightsPanel insights={budgetInsights} />
                    </div>
                )}

                {budgetInsights.length > 0 && <Separator className="my-6" />}

                {/* Future Expenses Section */}
                <div>
                    <FutureExpensesList />
                </div>
            </main>
        </div>
    );
}
