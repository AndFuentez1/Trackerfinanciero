import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBudgetsData } from "@/features/finance/hooks/useBudgetsData";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SkeletonLoader } from "@/shared/components/skeletons/SkeletonLoader";
import { PieChart, LogOut, Wallet, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import { InsightsPanel } from "@/features/dashboard/components/InsightsPanel";

import { BudgetTotalCard } from "@/features/finance/budgets/components/BudgetTotalCard";
import { CategoryBudgetList } from "@/features/finance/budgets/components/CategoryBudgetList";
import { IncomeCard } from "@/features/finance/budgets/components/IncomeCard";
import { AddBudgetDialog } from '@/features/finance/budgets/components/AddBudgetDialog';
import { AddTransactionDialog } from '@/features/finance/transactions/components/AddTransactionDialog';
import { FutureExpensesList } from "@/features/finance/budgets/components/FutureExpensesList";

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
        return <SkeletonLoader tab="budgets" fullPage={false} withLayoutWrapper />;
    }
    if (!user) return null;

    return (
        <div className="min-h-screen bg-background/30">
            <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border">
                            <PieChart className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Presupuestos</h1>
                            <p className="text-muted-foreground font-medium">Controla tus gastos mensuales</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end flex-wrap">
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
                </header>
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







