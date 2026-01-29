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


import { CategoryBudgetList } from "@/features/budgets/components/CategoryBudgetList";
import { BudgetList } from "@/features/budgets/components/BudgetList";
import { IncomeCard } from "@/features/budgets/components/IncomeCard";
import { AddBudgetDialog } from '@/features/budgets/components/AddBudgetDialog';
import { AddTransactionDialog } from '@/features/transactions/components/AddTransactionDialog';
import { FutureExpensesList } from "@/features/budgets/components/FutureExpensesList";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEffect } from "react";
import { trackFeatureView } from "@/lib/analytics";

// import { Sidebar } from '@/components/Sidebar'; // Removed to fix double sidebar

export default function BudgetsPage() {
    const navigate = useNavigate();

    useEffect(() => {
        trackFeatureView('Budgets');
    }, []);

    const { user, loading: authLoading } = useAuth();
    const {

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
            <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                <PageHeader
                    title="Presupuesto Mensual"
                    description="Planifica y controla tus gastos por categoría"
                    icon={<PieChart className="h-6 w-6" />}
                    actions={
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
                    }
                />

                {/* Top Section: Income Card */}
                <div className="w-full">
                    <IncomeCard />
                </div>

                <Separator className="my-6" />

                {/* Tarjeta de presupuestos del mes (idéntica a dashboard) */}
                <div className="my-8">
                    <BudgetList
                        budgets={budgets}
                        onDelete={async (id) => { await refreshBudgets(); }}
                        onSave={async (budget) => { await refreshBudgets(); }}
                        categories={categories}
                    />
                </div>

                <Separator className="my-6" />

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
