import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMemo, useState, useEffect } from 'react';
import { useFinanceData } from '@/hooks/useFinanceData';
import { AddTransactionDialog } from '@/components/finance/AddTransactionDialog';
import { AddBudgetDialog } from '@/components/finance/AddBudgetDialog';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { ImportExcelDialog } from '@/components/finance/ImportExcelDialog';
import { ExportExcelButton } from '@/components/finance/ExportExcelButton';
import { SummaryTab } from '@/components/finance/SummaryTab';
import { AddTransferDialog } from '@/components/finance/AddTransferDialog';
import { Wallet, AlertCircle, Calendar as CalendarIcon, FilterX, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WelcomePanel } from '@/components/WelcomePanel';
import { OnboardingDecisionPanel } from '@/components/OnboardingDecisionPanel';

export default function Index() {
  // ✅ TODOS los hooks primero, antes de cualquier return condicional
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    transactions,
    budgets,
    paymentMethods,
    summary,
    expensesByCategory,
    insights,
    addTransaction,
    addTransactionsBulk,
    deletePaymentMethod,
    addBudget,
    deleteBudget,
    addTransfer,
    categories,
    orphanedTransactions,
    dateFilter,
    updateFilter,
    rangeTransactions,
    lastUpdated: financeLastUpdated,
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
    loading: financeLoading
  } = useFinanceData();

  const { lastModification: budgetLastUpdated, loading: budgetsLoading } = useBudgetsData();

  // ✅ Todos los useMemo hooks
  const lastUpdated = useMemo(() => {
    if (!financeLastUpdated && !budgetLastUpdated) return null;
    if (!financeLastUpdated) return budgetLastUpdated;
    if (!budgetLastUpdated) return financeLastUpdated;
    return financeLastUpdated > budgetLastUpdated ? financeLastUpdated : budgetLastUpdated;
  }, [financeLastUpdated, budgetLastUpdated]);

  const isLoading = useMemo(() => 
    authLoading || financeLoading || budgetsLoading,
    [authLoading, financeLoading, budgetsLoading]
  );

  const isEmptyState = useMemo(() => 
    !summary.currency || paymentMethods.length === 0 || categories.length === 0,
    [summary.currency, paymentMethods.length, categories.length]
  );
  
  const showDecisionPanel = useMemo(() => 
    !isEmptyState && (!onboardingDecision || onboardingDecision === 'pending'),
    [isEmptyState, onboardingDecision]
  );
  
  const showCompletionCard = useMemo(() => 
    hasPendingImport && importProgress.status === 'completed',
    [hasPendingImport, importProgress.status]
  );

  // ✅ Todos los useEffect hooks
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 PANEL STATE:', {
        isEmptyState,
        showDecisionPanel,
        showCompletionCard,
        onboardingDecision,
        hasPendingImport,
        importStatus: importProgress.status,
        currency: summary.currency,
        paymentMethods: paymentMethods.length,
        categories: categories.length,
      });
    }
  }, [isEmptyState, showDecisionPanel, showCompletionCard, onboardingDecision, hasPendingImport, importProgress.status, summary.currency, paymentMethods.length, categories.length]);

  // AHORA vienen los returns condicionales
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (isEmptyState) {
    return (
      <WelcomePanel
        onConfigureCurrency={async (currencyCode) => {
          await updateProfile({ currency: currencyCode });
        }}
        onAddPaymentMethod={() => navigate('/configuracion')}
        onAddCategory={() => navigate('/configuracion')}
        currencyConfigured={Boolean(summary.currency)}
        hasPaymentMethods={paymentMethods.length > 0}
        hasCategories={categories.length > 0}
        currentCurrency={summary.currency}
      />
    );
  }

  if (showDecisionPanel) {
    return (
      <OnboardingDecisionPanel
        onStartFromScratch={async () => {
          await setOnboardingDecision('from_scratch');
        }}
        onImportData={() => {
          // Abrir selector de archivo
        }}
        hasPendingImport={hasPendingImport}
        onConfirmImport={async () => {
          await confirmImportData();
        }}
        pendingImportCount={pendingImportData.length}
        importProgress={importProgress}
        onCancelImport={cancelImport}
        paymentMethods={paymentMethods}
        onImportComplete={(data) => {
          startImport(data);
        }}
        showCompletionCard={showCompletionCard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">Resumen</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-end space-x-4">
            <ExportExcelButton transactions={transactions} paymentMethods={paymentMethods} />
            <ImportExcelDialog paymentMethods={paymentMethods} onImport={addTransactionsBulk} />
            <AddTransferDialog onAdd={addTransfer} />
            <AddTransactionDialog onAdd={addTransaction} />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {orphanedTransactions.length > 0 && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-4 duration-500">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="font-bold">Acción requerida</AlertTitle>
                <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                  <span>Tienes {orphanedTransactions.length} transacciones pendientes por categorizar o asignar un método de pago.</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="font-bold shadow-lg shadow-destructive/20"
                    onClick={() => navigate('/historial?reclassify=true', { state: { reclassify: true } })}
                  >
                    Reclasificar ahora
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <SummaryTab
              transactions={rangeTransactions}
              allTransactions={transactions}
              budgets={budgets}
              paymentMethods={paymentMethods}
              summary={summary}
              expensesByCategory={expensesByCategory}
              insights={insights}
              onDeleteBudget={deleteBudget}
              onDeletePaymentMethod={deletePaymentMethod}
              categories={categories}
              onUpdateCategoryGoal={updateCategoryGoal}
              onUpdateTransaction={updateTransaction as any}
              dateFilter={dateFilter}
              updateFilter={updateFilter}
            />

            {lastUpdated && (
              <div className="flex justify-end pt-4">
                <p className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded inline-block">
                  Última modificación: {lastUpdated ? format(lastUpdated, "dd/MM/yyyy HH:mm:ss", { locale: es }) : '--:--'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}