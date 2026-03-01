import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSEO } from "@/shared/hooks/useSEO";
import { useBudgetsData } from "@/features/finance/hooks/useBudgetsData";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StandardHeaderSkeleton, CardSkeleton, CategoriesGridSkeleton, PulseBlock } from "@/shared/components/skeletons/SkeletonLoader";
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
    useSEO({
        title: 'Presupuestos',
        description: 'Controla tus gastos y establece límites mensuales.'
    });
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
    const selectedMonth = budgetMonth === 'all' ? 'all' : (budgetMonth - 1).toString();
    const selectedYear = budgetYear === 'all' ? 'all' : budgetYear.toString();

    const monthOptions = [
        { value: 'all', label: 'Todo el año' },
        { value: '0', label: 'Enero' },
        { value: '1', label: 'Febrero' },
        { value: '2', label: 'Marzo' },
        { value: '3', label: 'Abril' },
        { value: '4', label: 'Mayo' },
        { value: '5', label: 'Junio' },
        { value: '6', label: 'Julio' },
        { value: '7', label: 'Agosto' },
        { value: '8', label: 'Septiembre' },
        { value: '9', label: 'Octubre' },
        { value: '10', label: 'Noviembre' },
        { value: '11', label: 'Diciembre' },
    ];

    if (!user && !isLoading) { return null; }

    return (
        <div className="min-h-screen bg-background/30">
            <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
                {isLoading ? (
                    <SkeletonLoader tab="budgets" withLayoutWrapper={true} fullPage={false} />
                ) : (
                    <>
                        <header className="border-b border-border pb-8">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                                        <PieChart className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Presupuestos</h1>
                                        <p className="text-muted-foreground font-medium mt-[-6px] leading-none text-sm">Controla tus gastos mensuales</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end flex-wrap md:mt-1">
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

                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex shrink-0 items-center justify-center p-1">
                                        <Wallet className="h-5 w-5 text-primary" strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none mt-1">
                                            Presupuestos por Categoría
                                        </h2>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={selectedMonth}
                                        onValueChange={(val) => setBudgetPeriod(budgetYear, val === 'all' ? 'all' : Number(val) + 1)}
                                    >
                                        <SelectTrigger className="w-[140px] h-9">
                                            <SelectValue placeholder="Mes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map((m) => (
                                                <SelectItem key={m.value} value={m.value}>
                                                    {m.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={selectedYear}
                                        onValueChange={(val) => setBudgetPeriod(val === 'all' ? 'all' : Number(val), budgetMonth)}
                                    >
                                        <SelectTrigger className="w-[120px] h-9">
                                            <SelectValue placeholder="Año" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            {availableYears.map((year) => (
                                                <SelectItem key={year} value={year.toString()}>
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <CategoryBudgetList budgets={budgets} paymentMethods={paymentMethods} />
                        </div>

                        <Separator className="my-6" />

                        {/* Future Expenses Section */}
                        <FutureExpensesList />

                        <Separator className="my-6" />

                        {/* Budget Alerts Section */}
                        {budgetInsights.length > 0 && (
                            <div>
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="flex shrink-0 items-center justify-center p-1">
                                        <AlertCircle className="h-5 w-5 text-primary" strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none mt-1">
                                            Alertas de Presupuesto
                                        </h2>
                                    </div>
                                </div>
                                <InsightsPanel insights={budgetInsights} />
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}







