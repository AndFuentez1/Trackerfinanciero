import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMemo } from 'react';
import { useSEO } from '@/shared/hooks/useSEO';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { AddTransactionDialog } from '@/features/finance/transactions/components/AddTransactionDialog';
import { ImportExcelDialog } from '@/features/finance/transactions/components/ImportExcelDialog';
import { SummaryTab } from '@/features/dashboard/components/SummaryTab';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { usePageBootLoading } from '@/shared/layouts/PageBootContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WelcomePanel } from '@/features/auth/components/WelcomePanel';
import { OnboardingDecisionPanel } from '@/features/auth/components/OnboardingDecisionPanel';
import { calculateSummary, calculateExpensesByCategory, calculateInsights } from '@/features/finance/utils/financeUtils';
import { LayoutGrid } from 'lucide-react';
import { getOnboardingGateState } from '@/core/utils';
import { DEFAULT_CURRENCY_CODE } from '@/features/finance/constants/currencyConstants';

export default function Index() {
  useSEO({
    title: 'Panel',
    description: 'Main Dashboard - Overview of your financial status and quick actions.'
  });
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
    bootLoading: financeBootLoading,
    addToStaging,
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

  // --- Derived calculations ---
  const statsSummary = useMemo(() => {
    return calculateSummary(allTransactions, currency ?? DEFAULT_CURRENCY_CODE);
  }, [allTransactions, currency]);

  const chartTransactions = allTransactions; // Use all transactions for charts

  const chartExpensesByCategory = useMemo(() => {
    return calculateExpensesByCategory(chartTransactions);
  }, [chartTransactions]);

  const chartInsights = useMemo(() => {
    return calculateInsights(
      calculateSummary(chartTransactions, currency ?? DEFAULT_CURRENCY_CODE),
      chartExpensesByCategory,
      paymentMethods,
      budgets,
      chartTransactions
    );
  }, [chartTransactions, chartExpensesByCategory, paymentMethods, budgets, currency]);

  const isBootLoading = useMemo(
    () => authLoading || financeBootLoading,
    [authLoading, financeBootLoading]
  );
  const isLoading = useMemo(
    () => authLoading || financeLoading,
    [authLoading, financeLoading]
  );
  usePageBootLoading(isBootLoading);

  const { showWelcomePanel, showDecisionPanel } = useMemo(() => {
    return getOnboardingGateState({
      currency,
      paymentMethods,
      categories,
      onboardingDecision,
      welcomeCompleted,
      isLoading: isBootLoading,
    });
  }, [isBootLoading, currency, paymentMethods, categories, onboardingDecision, welcomeCompleted]);

  const showCompletionCard = useMemo(
    () => hasPendingImport && importProgress.status === 'completed',
    [hasPendingImport, importProgress.status]
  );

  if (!user && !isBootLoading) { return null; }

  const onboardingSkeleton = (
    <SkeletonLoader
      tab="onboarding"
      fullPage={false}
      withLayoutWrapper
      showLoadingIndicator={false}
    />
  );

  return (
    <div className="min-h-screen bg-background/30">
      <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 animate-in fade-in duration-700">
        {isBootLoading ? (
          <SkeletonLoader tab="dashboard" fullPage={false} withLayoutWrapper />
        ) : showWelcomePanel ? (
          <>
            {onboardingSkeleton}
            <WelcomePanel />
          </>
        ) : showDecisionPanel ? (
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
              setImportProgress(prev => ({ ...prev, status: 'completed' }));
              setPendingImportData(data);
              await updateProfile({ has_pending_import: true });
            }}
            showCompletionCard={showCompletionCard}
            baseColor={baseColor}
            themeOptions={themeOptions}
            onSelectTheme={(hex) => setAppThemePreference(hex)}
          />
        ) : (
          <>
            {/* Header Section */}
            <header className="border-b border-border pb-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                    <LayoutGrid className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Panel Principal</h1>
                    <p className="text-muted-foreground font-medium mt-[-6px] leading-none text-sm">Resumen general de tu estado financiero</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:mt-1 justify-center md:justify-end">
                  <AddTransactionDialog onAdd={addTransaction} onAddTransfer={addTransfer} />
                  <ImportExcelDialog paymentMethods={paymentMethods} onImport={addToStaging} />
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
                loading={isBootLoading}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}






