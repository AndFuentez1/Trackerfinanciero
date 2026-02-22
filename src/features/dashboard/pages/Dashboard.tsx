import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMemo } from 'react';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { AddTransactionDialog } from '@/features/finance/transactions/components/AddTransactionDialog';
import { useBudgetsData } from '@/features/finance/hooks/useBudgetsData';
import { ImportExcelDialog } from '@/features/finance/transactions/components/ImportExcelDialog';
import { SummaryTab } from '@/features/dashboard/components/SummaryTab';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WelcomePanel } from '@/features/auth/components/WelcomePanel';
import { OnboardingDecisionPanel } from '@/features/auth/components/OnboardingDecisionPanel';
import { calculateSummary, calculateExpensesByCategory, calculateInsights } from '@/features/finance/utils/financeUtils';
import { LayoutDashboard } from 'lucide-react';
import { getOnboardingGateState } from '@/core/utils';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const {
    transactions,
    budgets,
    paymentMethods,
    allTransactions, // source of all data
    lastUpdated: financeLastUpdated,
    addTransaction,
    deleteBudget,
    addTransfer,
    deletePaymentMethod,
    categories,
    updateTransaction,
    onboardingDecision,
    hasPendingImport,
    importProgress,
    pendingImportData,
    setOnboardingDecision,
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
    updateProfile,
    setImportProgress,
    setPendingImportData,
    pendingInvoices,
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
    if (!financeLastUpdated && !budgetLastUpdated) { return null; }
    if (!financeLastUpdated) { return budgetLastUpdated; }
    if (!budgetLastUpdated) { return financeLastUpdated; }
    return financeLastUpdated > budgetLastUpdated ? financeLastUpdated : budgetLastUpdated;
  }, [financeLastUpdated, budgetLastUpdated]);

  const isLoading = useMemo(
    () => authLoading || financeLoading || budgetsLoading,
    [authLoading, financeLoading, budgetsLoading]
  );

  const { showWelcomePanel, showDecisionPanel } = useMemo(() => {
    // STRICT GATING: Never show onboarding panels while loading
    // This prevents the "flash" of the Welcome Panel for existing users
    if (isLoading) {
      return { showWelcomePanel: false, showDecisionPanel: false };
    }

    return getOnboardingGateState({
      currency,
      paymentMethods,
      categories,
      onboardingDecision,
      welcomeCompleted,
    });
  }, [isLoading, currency, paymentMethods, categories, onboardingDecision, welcomeCompleted]);

  const showCompletionCard = useMemo(
    () => hasPendingImport && importProgress.status === 'completed',
    [hasPendingImport, importProgress.status]
  );

  // Loading state (High Fidelity Skeleton Reveal)
  // Removed global blocking to allow layout to render immediately
  /* if (isLoading) {
    return <SkeletonLoader tab="dashboard" fullPage={false} withLayoutWrapper />;
  } */

  if (!user) { return null; }

  const onboardingSkeleton = (
    <SkeletonLoader
      tab="onboarding"
      fullPage={false}
      withLayoutWrapper
      showLoadingIndicator={false}
    />
  );

  // Empty state
  if (showWelcomePanel) {
    return (
      <>
        {onboardingSkeleton}
        <WelcomePanel />
      </>
    );
  }

  // Decision panel
  if (showDecisionPanel) {
    return (
      <>
        {onboardingSkeleton}
        <OnboardingDecisionPanel
          onStartFromScratch={async () => {
            await updateProfile({ onboarding_decision: 'from_scratch' });
          }}
          hasPendingImport={hasPendingImport}
          onConfirmImport={async () => { await confirmImportData(); }}
          pendingImportCount={pendingImportData.length}
          importProgress={importProgress}
          onCancelImport={async () => { await cancelImport(); }}
          paymentMethods={paymentMethods}
          onImportComplete={async (data) => {
            // Persist the import intent and data
            setImportProgress(prev => ({ ...prev, status: 'completed' }));
            setPendingImportData(data);
            await updateProfile({ has_pending_import: true });
            // The data is confirmed in OnboardingDecisionPanel via onConfirmImport
          }}
          showCompletionCard={showCompletionCard}
          baseColor={baseColor}
          themeOptions={themeOptions}
          onSelectTheme={(hex) => setAppThemePreference(hex)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-6 animate-in fade-in duration-700">
        {/* Header Section */}
        <header className="border-b border-border pb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Panel Principal</h1>
                <p className="text-muted-foreground font-medium mt-1 leading-none text-sm">Resumen general de tu estado financiero</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:mt-1">
              <AddTransactionDialog onAdd={addTransaction} onAddTransfer={addTransfer} />
              <ImportExcelDialog paymentMethods={paymentMethods} onImport={addTransactionsBulk} />
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
            onUpdateTransaction={updateTransaction}
            dateFilter={{ period: 'all', from: null, to: null }}
            updateFilter={() => { }}
            pendingInvoices={pendingInvoices as { amount: number; arrival_date: string;[key: string]: unknown }[]}
            loading={isLoading}
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






