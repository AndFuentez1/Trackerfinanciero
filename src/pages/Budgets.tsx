import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetsData } from "@/hooks/useBudgetsData";
import { useFinanceData } from "@/hooks/useFinanceData";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SkeletonLoader } from "@/components/common/skeletons/SkeletonLoader";
import { PieChart, LogOut, Wallet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { InsightsPanel } from "@/features/dashboard/components/InsightsPanel";

import { BudgetTotalCard } from "@/features/budgets/components/BudgetTotalCard";
import { CategoryBudgetList } from "@/features/budgets/components/CategoryBudgetList";
import { IncomeCard } from "@/features/budgets/components/IncomeCard";
import { AddBudgetDialog } from '@/features/budgets/components/AddBudgetDialog';
import { AddTransactionDialog } from '@/features/transactions/components/AddTransactionDialog';
import { FutureExpensesList } from "@/features/budgets/components/FutureExpensesList";

// import { Sidebar } from '@/components/Sidebar'; // Removed to fix double sidebar

export default function BudgetsPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const {
        totalBudget,
        budgets,
        loading: budgetsLoading,
        refreshBudgets,
        saveBudget,
        lastModification,
        budgetYear,
        budgetMonth,
        setBudgetPeriod,
        availableYears,
    } = useBudgetsData();
    const {
        insights,
        addTransaction,
        categories,
        paymentMethods,
        addTransfer,
    } = useFinanceData();

    // Filter only budget-related insights
    const budgetInsights = insights.filter(i => i.id.startsWith('budget-'));

    const isLoading = authLoading || budgetsLoading;

    if (isLoading) {
        return <SkeletonLoader tab="budgets" fullPage withLayoutWrapper />;
    }
    if (!user) return null;

    return (
        <div className="min-h-screen bg-background/30">
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <PieChart className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-semibold">Presupuesto Mensual</h1>
                    </div>
                    <div className="z-20 flex gap-2 flex-wrap justify-center sm:justify-start">
                        <AddTransactionDialog
                            onAdd={addTransaction}
                            categories={categories}
                            paymentMethods={paymentMethods}
                            onAddTransfer={addTransfer}
                        />
                        <AddBudgetDialog
                            onAdd={saveBudget}
                            monthOverride={`${budgetYear}-${String(budgetMonth === 'all' ? 1 : budgetMonth).padStart(2, '0')}-01`}
                        />
                    </div>
                </div>
            </header>

            <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Top Section: Budget Cards (Side by Side on desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    <div className="flex h-full flex-col space-y-4">
                        <BudgetTotalCard totalBudget={totalBudget} />
                    </div>

                    <div className="flex h-full flex-col space-y-4">
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

                    <CategoryBudgetList budgets={budgets} paymentMethods={paymentMethods} />
                </div>

                <Separator className="my-6" />

                {/* Future Expenses Section */}
                <div>
                    <FutureExpensesList />
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
            </main>
        </div>
    );
}
