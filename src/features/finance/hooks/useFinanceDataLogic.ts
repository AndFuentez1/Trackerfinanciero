import { useMemo, useCallback, useEffect } from 'react';
import { useStableCallbacks } from '@/core/hooks/useStableCallbacks';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
// Import specialized hooks
import { useFinanceQueries } from './useFinanceQueries';
import { useFinanceUI } from './useFinanceUI';
import { useProfileManagement } from './useProfileManagement';
import { useTheme } from './useTheme';
import { useTransactionData } from './useTransactionData';
import { useFinanceMutations } from './useFinanceMutations';
import { useUserConfig } from './useUserConfig';

// Constants
import { DEFAULT_CATEGORIES } from '../constants/categoryConstants';
import { MASTER_PALETTE, APP_THEME_PRESETS, THEME_OPTIONS } from '../constants/themeConstants';

export { MASTER_PALETTE, APP_THEME_PRESETS, THEME_OPTIONS };

// Shared types
import type {
  TransactionType,
  PaymentMethodType,
  CategoryItem,
  PaymentMethod,
  Transaction,
  Budget,
  Insight,
  StagingTransaction
} from '../types/financeTypes';

export type {
  TransactionType,
  PaymentMethodType,
  CategoryItem,
  PaymentMethod,
  Transaction,
  Budget,
  Insight,
  StagingTransaction
};

export function useFinanceDataLogic() {
  const { user } = useAuth();
  // const { toast } = useToast(); // Removed unused
  const queryClient = useQueryClient();
  const { config, updateConfig } = useUserConfig(user?.id, user?.email);

  // 1. Data Layer
  const {
    paymentMethods,
    categories,
    budgets,
    profile,
    pendingInvoices,
    pmLoading,
    catsLoading,
    budgetsLoading,
    profileLoading,
    pendingInvoicesLoading,
    stagingTransactions,
    queriesLoading
  } = useFinanceQueries(user?.id);

  // 2. Specialized Managers
  const ui = useFinanceUI();
  const profileMgmt = useProfileManagement(profile);
  const { updateProfile, resetOperationalData: resetOperationalDataBase } = profileMgmt;
  const theme = useTheme(profileMgmt.profileData?.base_color ?? profile?.base_color);

  // 3. Transactions & Derived Logic
  const tx = useTransactionData(
    user?.id,
    ui.dateFilter,
    ui.sortConfig,
    ui.page,
    paymentMethods,
    categories,
    budgets,
    profile?.currency || 'COP'
  );



  const bootLoading = useMemo(() => {
    return ui.loading || profileLoading || pmLoading || catsLoading || (tx.transactionsLoading && tx.transactions.length === 0);
  }, [ui.loading, profileLoading, pmLoading, catsLoading, tx.transactionsLoading, tx.transactions.length]);

  // 4. Mutations (identidad estable: no invalidan el memo del contexto en cada render)
  const mut = useStableCallbacks(useFinanceMutations(user?.id));

  // Setters de useState: estables, a diferencia del objeto `ui` completo
  const {
    setLastUpdated, setPage, setImportProgress, setHasPendingImport, setOnboardingDecision,
    setPendingImportData, setManualLoading, setWelcomeCompleted, pendingImportData,
  } = ui;

  // 5. Orchestrated Helpers
  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['finance'] });
    setLastUpdated(new Date());
  }, [queryClient, setLastUpdated]);

  const loadMore = useCallback(() => {
    if (!tx.hasMore) { return; }
    setPage(prev => prev + 1);
  }, [tx.hasMore, setPage]);

  const confirmPendingImport = useCallback(async () => {
    if (!user || pendingImportData.length === 0) { return { error: 'Sin datos' }; }

    setImportProgress(prev => ({ ...prev, status: 'loading', message: 'Importando registros...' }));

    try {
      await mut.addTransactionsBulk(pendingImportData);
      await updateProfile({ has_pending_import: false, onboarding_decision: 'imported' });
      setHasPendingImport(false);
      setOnboardingDecision('imported');
      setPendingImportData([]);
      setImportProgress({ status: 'completed', progress: 100, message: '¡Importación exitosa!' });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setImportProgress({ status: 'failed', progress: 0, message: 'Error en la importación', error: message });
      return { error: message };
    }
  }, [user, pendingImportData, mut, updateProfile, setImportProgress, setHasPendingImport, setOnboardingDecision, setPendingImportData]);

  const resetOperationalData = useCallback(async () => {
    const res = await resetOperationalDataBase();
    if (res.success) {
      await refreshData();
    }
    return res;
  }, [resetOperationalDataBase, refreshData]);

  // Sync loading states
  useEffect(() => {
    if (user && !pmLoading && !catsLoading) {
      const t = setTimeout(() => {
        setManualLoading(false);
      }, 100);
      return () => clearTimeout(t);
    } else if (!user) {
      setManualLoading(false);
    }
  }, [user, pmLoading, catsLoading, setManualLoading]);



  // Sync onboarding/profile flags into UI state
  useEffect(() => {
    if (!profile) { return; }
    setOnboardingDecision((profile.onboarding_decision ?? null) as 'pending' | 'from_scratch' | 'imported' | null);
    setHasPendingImport(Boolean(profile.has_pending_import));
    setWelcomeCompleted(Boolean(profile.welcome_completed));
  }, [profile, setOnboardingDecision, setHasPendingImport, setWelcomeCompleted]);

  const initializeDefaultCategories = useCallback(() => {
    return mut.initializeDefaultCategories(DEFAULT_CATEGORIES);
  }, [mut]);

  const recalculatePaymentMethodBalances = useCallback(async () => {
    await refreshData();
    return { success: true };
  }, [refreshData]);

  const setKeepSessionAlive = useCallback(
    (keepAlive: boolean) => updateConfig({ keep_session_alive: keepAlive }),
    [updateConfig]
  );

  const setAppThemePreference = useCallback(
    (color: string) => updateProfile({ base_color: color }),
    [updateProfile]
  );

  const totalBudget = useMemo(
    () => tx.budgetsWithSpending.reduce((sum, b) => sum + b.amount, 0),
    [tx.budgetsWithSpending]
  );
  const totalSpentCurrentMonth = useMemo(
    () => tx.budgetsWithSpending.reduce((sum, b) => sum + (b.spent || 0), 0),
    [tx.budgetsWithSpending]
  );

  return useMemo(() => ({
    // --- DATA ---
    transactions: tx.transactions,
    allTransactions: tx.allTransactions,
    rangeTransactions: tx.rangeTransactions,
    budgets,
    budgetsWithSpending: tx.budgetsWithSpending,
    paymentMethods,
    categories,
    insights: tx.insights,
    summary: tx.summary,
    filteredSummary: tx.filteredSummary,
    pendingInvoices,
    stagingTransactions,
    expensesByCategory: tx.expensesByCategory,
    yieldStatistics: tx.yieldStatistics,
    orphanedTransactions: tx.orphanedTransactions,
    totalTransactionsCount: tx.totalTransactionsCount,

    // --- UI STATE ---
    loading: bootLoading,
    bootLoading,
    categoriesLoading: catsLoading,
    paymentMethodsLoading: pmLoading,
    budgetsLoading,
    profileLoading,
    queriesLoading,
    transactionsLoading: tx.transactionsLoading,
    pendingInvoicesLoading,
    manualLoading: ui.manualLoading,
    actionLoading: ui.actionLoading,
    dateFilter: ui.dateFilter,
    sortConfig: ui.sortConfig,
    page: ui.page,
    hasMore: tx.hasMore,
    lastUpdated: ui.lastUpdated,

    // --- ONBOARDING & IMPORTS ---
    onboardingDecision: ui.onboardingDecision,
    hasPendingImport: ui.hasPendingImport,
    welcomeCompleted: ui.welcomeCompleted,
    highlightedCard: ui.highlightedCard,
    importProgress: ui.importProgress,
    pendingImportData: ui.pendingImportData,
    setPendingImportData,
    startImport: ui.startImport,
    cancelImport: ui.cancelImport,
    setImportProgress: ui.setImportProgress,
    confirmPendingImport,
    confirmImportData: confirmPendingImport,

    // --- ACTIONS ---
    addTransaction: mut.addTransaction,
    updateTransaction: mut.updateTransaction,
    deleteTransaction: mut.deleteTransaction,
    addTransactionsBulk: mut.addTransactionsBulk,
    addTransfer: mut.addTransfer,
    addCategory: mut.addCategory,
    updateCategory: mut.updateCategory,
    deleteCategory: mut.deleteCategory,
    addPaymentMethod: mut.addPaymentMethod,
    updatePaymentMethod: mut.updatePaymentMethod,
    deletePaymentMethod: mut.deletePaymentMethod,
    mergePaymentMethods: mut.mergePaymentMethods,
    addBudget: mut.addBudget,
    deleteBudget: mut.deleteBudget,
    addToStaging: mut.addToStaging,
    confirmStagingImport: mut.confirmStagingImport,
    clearStaging: mut.clearStaging,
    initializeDefaultCategories,
    recalculatePaymentMethodBalances,

    // --- NAVIGATION / UI ACTIONS ---
    updateFilter: ui.updateFilter,
    setSortConfig: ui.setSortConfig,
    setPage: ui.setPage,
    loadMore,
    setHighlightedCard: ui.setHighlightedCard,
    setOnboardingDecision: ui.setOnboardingDecision,
    refreshData,

    // --- PROFILE & THEME ---
    profile,
    currency: profileMgmt.currency,
    country: profileMgmt.profileData?.country ?? null,
    decimalPlaces: profileMgmt.decimalPlaces,
    baseColor: theme.baseColor,
    themeVars: theme.themeVars,
    themeOptions: theme.themeOptions,
    keepSessionAlive: config.keep_session_alive,
    setKeepSessionAlive,
    currencyUsage: config.currency_usage,
    passwordDialogShown: config.password_dialog_shown,
    updateConfig,
    updateProfile: profileMgmt.updateProfile,
    resetProfileData: profileMgmt.resetProfileData,
    resetOperationalData,
    setAppThemePreference,
    convertCurrency: profileMgmt.convertCurrency,

    // --- CALCULATED VALUES ---
    totalBudget,
    totalSpentCurrentMonth,
  }), [
    mut,
    totalBudget,
    totalSpentCurrentMonth,
    recalculatePaymentMethodBalances,
    setKeepSessionAlive,
    setAppThemePreference,
    tx.transactions,
    tx.allTransactions,
    tx.rangeTransactions,
    tx.budgetsWithSpending,
    tx.insights,
    tx.summary,
    tx.filteredSummary,
    tx.expensesByCategory,
    tx.yieldStatistics,
    tx.orphanedTransactions,
    tx.totalTransactionsCount,
    tx.transactionsLoading,
    tx.hasMore,
    budgets,
    paymentMethods,
    categories,
    pendingInvoices,
    stagingTransactions,
    queriesLoading,
    catsLoading,
    pmLoading,
    budgetsLoading,
    profileLoading,
    pendingInvoicesLoading,
    bootLoading,
    ui.manualLoading,
    ui.actionLoading,
    ui.dateFilter,
    ui.sortConfig,
    ui.page,
    ui.lastUpdated,
    ui.onboardingDecision,
    ui.hasPendingImport,
    ui.welcomeCompleted,
    ui.highlightedCard,
    ui.importProgress,
    ui.pendingImportData,
    ui.startImport,
    ui.cancelImport,
    ui.setImportProgress,
    setPendingImportData,
    ui.updateFilter,
    ui.setSortConfig,
    ui.setPage,
    ui.setHighlightedCard,
    ui.setOnboardingDecision,
    profile,
    profileMgmt.currency,
    profileMgmt.profileData?.country,
    profileMgmt.decimalPlaces,
    profileMgmt.updateProfile,
    profileMgmt.resetProfileData,
    profileMgmt.convertCurrency,
    theme.baseColor,
    theme.themeVars,
    theme.themeOptions,
    config.keep_session_alive,
    config.currency_usage,
    config.password_dialog_shown,
    updateConfig,
    refreshData,
    confirmPendingImport,
    resetOperationalData,
    loadMore,
    initializeDefaultCategories
  ]);
}
