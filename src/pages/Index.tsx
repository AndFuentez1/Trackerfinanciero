import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';
import { useFinanceData } from '@/hooks/useFinanceData';
import { AddTransactionDialog } from '@/features/transactions/components/AddTransactionDialog';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { ImportExcelDialog } from '@/features/transactions/components/ImportExcelDialog';
import { ExportExcelButton } from '@/features/transactions/components/ExportExcelButton';
import { SummaryTab } from '@/features/dashboard/components/SummaryTab';
import { SkeletonLoader } from '@/components/common/skeletons/SkeletonLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WelcomePanel } from '@/features/auth/components/WelcomePanel';
import { OnboardingDecisionPanel } from '@/features/auth/components/OnboardingDecisionPanel';
import { calculateSummary, calculateExpensesByCategory, calculateInsights } from '@/hooks/financeUtils';
import { LayoutDashboard } from 'lucide-react';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const {
    transactions,
    budgets,
    paymentMethods,
    allTransactions, // source of all data
    lastUpdated: financeLastUpdated,
    addTransaction,
    addBudget,
    deleteBudget,
    addTransfer,
    deletePaymentMethod,
    categories,
    orphanedTransactions,
    updateCategoryGoal,
    updateTransaction,
    updateProfile,
    onboardingDecision,
    hasPendingImport,
    importProgress,
    pendingImportData,
    setOnboardingDecision,
    confirmPendingImport,
    startImport,
    cancelImport,
    confirmImportData,
    loading: financeLoading,
    addTransactionsBulk,
    currency,
    welcomeCompleted,
    baseColor,
    themeOptions,
    setAppThemePreference,
    setHighlightedCard,
  } = useFinanceData();

  const { lastModification: budgetLastUpdated, loading: budgetsLoading } = useBudgetsData();

  // --- Derived calculations ---
  const statsSummary = useMemo(() => {
    return calculateSummary(allTransactions, currency ?? 'COP');
  }, [allTransactions, currency]);

  const chartTransactions = allTransactions; // Use all transactions for charts

  const chartExpensesByCategory = useMemo(() => {
    return calculateExpensesByCategory(chartTransactions);
  }, [chartTransactions]);

  const chartInsights = useMemo(() => {
    return calculateInsights(
      calculateSummary(chartTransactions, currency ?? 'COP'),
      chartExpensesByCategory,
      paymentMethods,
      budgets,
      chartTransactions
    );
  }, [chartTransactions, chartExpensesByCategory, paymentMethods, budgets, currency]);

  const lastUpdated = useMemo(() => {
    if (!financeLastUpdated && !budgetLastUpdated) return null;
    if (!financeLastUpdated) return budgetLastUpdated;
    if (!budgetLastUpdated) return financeLastUpdated;
    return financeLastUpdated > budgetLastUpdated ? financeLastUpdated : budgetLastUpdated;
  }, [financeLastUpdated, budgetLastUpdated]);

  const isLoading = useMemo(
    () => authLoading || financeLoading || budgetsLoading,
    [authLoading, financeLoading, budgetsLoading]
  );

  const isEmptyState = useMemo(
    () => !statsSummary.currency || paymentMethods.length === 0 || categories.length === 0,
    [statsSummary.currency, paymentMethods.length, categories.length]
  );

  const showWelcomePanel = useMemo(
    () => !welcomeCompleted && isEmptyState,
    [welcomeCompleted, isEmptyState]
  );

  const showDecisionPanel = useMemo(
    () => !isEmptyState && (!onboardingDecision || onboardingDecision === 'pending'),
    [isEmptyState, onboardingDecision]
  );

  const showCompletionCard = useMemo(
    () => hasPendingImport && importProgress.status === 'completed',
    [hasPendingImport, importProgress.status]
  );

  // Loading state (High Fidelity Skeleton Reveal)
  if (isLoading) {
    return <SkeletonLoader tab="dashboard" fullPage />;
  }

  if (!user) return null;

  // Empty state
  if (showWelcomePanel) {
    return (
      <WelcomePanel />
    );
  }

  // Decision panel
  if (showDecisionPanel) {
    return (
      <OnboardingDecisionPanel
        onStartFromScratch={async () => { await setOnboardingDecision('from_scratch'); }}
        onImportData={() => {/* open file selector */ }}
        hasPendingImport={hasPendingImport}
        onConfirmImport={async () => { await confirmImportData(); }}
        pendingImportCount={pendingImportData.length}
        importProgress={importProgress}
        onCancelImport={async () => { await cancelImport(); }}
        paymentMethods={paymentMethods}
        onImportComplete={(data) => startImport(data)}
        showCompletionCard={showCompletionCard}
        baseColor={baseColor}
        themeOptions={themeOptions}
        onSelectTheme={(hex) => setAppThemePreference(hex)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-12 animate-in fade-in duration-700">
        {/* Header Section */}
        <header className="space-y-4 border-b border-border pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Panel Principal</h1>
                <p className="text-muted-foreground font-medium">Resumen general de tu estado financiero</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AddTransactionDialog onAdd={addTransaction} onAddTransfer={addTransfer} />
              <ImportExcelDialog paymentMethods={paymentMethods} onImport={addTransactionsBulk} />
              <ExportExcelButton transactions={transactions} paymentMethods={paymentMethods} />
            </div>
          </div>
        </header>
        <section className="space-y-6">
          <SummaryTab
            transactions={chartTransactions}
            allTransactions={allTransactions}
            budgets={budgets}
            paymentMethods={paymentMethods}
            summary={statsSummary}
            expensesByCategory={chartExpensesByCategory}
            insights={chartInsights}
            onDeleteBudget={deleteBudget}
            onDeletePaymentMethod={deletePaymentMethod}
            categories={categories}
            onUpdateCategoryGoal={updateCategoryGoal}
            onUpdateTransaction={updateTransaction}
            dateFilter={{ period: 'all', from: null, to: null }}
            updateFilter={() => { }}
          />
        </section>
        {lastUpdated && (
          <div className="flex justify-center sm:justify-end pt-4">
            <p className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded inline-block">
              Última modificación: {format(lastUpdated, 'dd/MM/yyyy HH:mm:ss', { locale: es })}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
