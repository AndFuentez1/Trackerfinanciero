import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMemo, useState } from 'react';
import { useFinanceData } from '@/hooks/useFinanceData';
import { AddTransactionDialog } from '@/features/transactions/components/AddTransactionDialog';
import { AddBudgetDialog } from '@/features/budgets/components/AddBudgetDialog';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { ImportExcelDialog } from '@/features/transactions/components/ImportExcelDialog';
import { ExportExcelButton } from '@/features/transactions/components/ExportExcelButton';
import { SummaryTab } from '@/features/dashboard/components/SummaryTab';
import { SkeletonLoader } from '@/components/common/skeletons/SkeletonLoader';
import { Wallet, AlertCircle, Calendar as CalendarIcon, FilterX, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WelcomePanel } from '@/features/auth/components/WelcomePanel';
import { OnboardingDecisionPanel } from '@/features/auth/components/OnboardingDecisionPanel';
import { calculateSummary, calculateExpensesByCategory, calculateInsights } from '@/hooks/financeUtils';
import { CURRENCIES } from '@/hooks/currencyConstants';


import { PageHeader } from '@/components/layout/PageHeader';

export default function Index() {
  const navigate = useNavigate();
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

  const { lastModification: budgetLastUpdated, loading: budgetsLoading, saveBudget } = useBudgetsData();

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
    () => !currency || paymentMethods.length === 0 || categories.length === 0,
    [currency, paymentMethods.length, categories.length]
  );

  const showWelcomePanel = useMemo(
    () => welcomeCompleted === false && isEmptyState,
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
  // Loading state (High Fidelity Skeleton Reveal)
  // MOVED: Internal render to avoid unmounting layout
  if (isLoading) {
    return <SkeletonLoader tab="dashboard" fullPage={false} withLayoutWrapper={true} loading={true} />;
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
        onImportData={() => {/* no longer used */ }}
        hasPendingImport={hasPendingImport}
        onConfirmImport={async () => { await confirmImportData(); }}
        pendingImportCount={pendingImportData.length}
        importProgress={importProgress as any}
        onCancelImport={async () => { await cancelImport(); }}
        showCompletionCard={showCompletionCard}
        baseColor={baseColor}
        themeOptions={themeOptions}
        onSelectTheme={(hex) => setAppThemePreference(hex)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background/30">
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="Resumen"
          description="Visión general de tu estado financiero actual"
          icon={<BarChart3 className="h-6 w-6" />}
          actions={
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end">
              <AddTransactionDialog onAdd={addTransaction} onAddTransfer={addTransfer} />
              <ExportExcelButton transactions={transactions} paymentMethods={paymentMethods} />
              <ImportExcelDialog paymentMethods={paymentMethods} onImport={addTransactionsBulk} />
            </div>
          }
        />
        <div className="space-y-6">
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
            onSaveBudget={saveBudget}
          />
        </div>
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