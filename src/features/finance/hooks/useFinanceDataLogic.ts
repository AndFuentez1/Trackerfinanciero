import { useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { queryKeys } from '@/core/api/queryKeys';

// Import specialized hooks
import { useFinanceQueries } from './useFinanceQueries';
import { useFinanceUI } from './useFinanceUI';
import { useProfileManagement } from './useProfileManagement';
import { useTheme } from './useTheme';
import { useTransactionData } from './useTransactionData';
import { useFinanceMutations } from './useFinanceMutations';

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
  Insight
} from '../types/financeTypes';

export type {
  TransactionType,
  PaymentMethodType,
  CategoryItem,
  PaymentMethod,
  Transaction,
  Budget,
  Insight
};

export function useFinanceDataLogic() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    queriesLoading
  } = useFinanceQueries(user?.id);

  // 2. Specialized Managers
  const ui = useFinanceUI();
  const profileMgmt = useProfileManagement(profile);
  const theme = useTheme(profile?.base_color);

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

  // 4. Mutations
  const mut = useFinanceMutations(user?.id);

  // 5. Orchestrated Helpers
  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['finance'] });
    ui.setLastUpdated(new Date());
  }, [queryClient, ui]);

  const loadMore = useCallback(() => {
    if (!tx.hasMore) { return; }
    ui.setPage(prev => prev + 1);
  }, [tx.hasMore, ui]);

  const confirmPendingImport = useCallback(async () => {
    if (!user || ui.pendingImportData.length === 0) { return { error: 'Sin datos' }; }

    ui.setImportProgress(prev => ({ ...prev, status: 'loading', message: 'Importando registros...' }));

    try {
      await mut.addTransactionsBulk(ui.pendingImportData);
      await profileMgmt.updateProfile({ has_pending_import: false });
      ui.setHasPendingImport(false);
      ui.setPendingImportData([]);
      ui.setImportProgress({ status: 'completed', progress: 100, message: '¡Importación exitosa!' });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      ui.setImportProgress({ status: 'failed', progress: 0, message: 'Error en la importación', error: message });
      return { error: message };
    }
  }, [user, ui, mut, profileMgmt]);

  const resetOperationalData = useCallback(async () => {
    const res = await profileMgmt.resetOperationalData();
    if (res.success) {
      await refreshData();
    }
    return res;
  }, [profileMgmt, refreshData]);

  // Sync loading states
  useEffect(() => {
    if (user && !pmLoading && !catsLoading) {
      const t = setTimeout(() => ui.setManualLoading(false), 100);
      return () => clearTimeout(t);
    } else if (!user) {
      ui.setManualLoading(false);
    }
  }, [user, pmLoading, catsLoading, ui]);

  // Sync onboarding/profile flags into UI state
  useEffect(() => {
    if (!profile) { return; }
    ui.setOnboardingDecision((profile.onboarding_decision ?? null) as 'pending' | 'from_scratch' | 'imported' | null);
    ui.setHasPendingImport(Boolean(profile.has_pending_import));
    ui.setWelcomeCompleted(Boolean(profile.welcome_completed));
  }, [profile, ui]);

  // Keep hasMore in sync for legacy consumers
  useEffect(() => {
    ui.setHasMore(tx.hasMore);
  }, [tx.hasMore, ui]);

  return useMemo(() => ({
    // --- DATA ---
    transactions: tx.transactions,
    allTransactions: tx.allTransactions,
    rangeTransactions: tx.rangeTransactions,
    budgets: tx.budgetsWithSpending,
    paymentMethods,
    categories,
    insights: tx.insights,
    summary: tx.summary,
    filteredSummary: tx.filteredSummary,
    pendingInvoices,
    expensesByCategory: tx.expensesByCategory,
    yieldStatistics: tx.yieldStatistics,
    orphanedTransactions: tx.orphanedTransactions,
    totalTransactionsCount: tx.totalTransactionsCount,

    // --- UI STATE ---
    loading: ui.loading || queriesLoading || tx.transactionsLoading,
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
    startImport: ui.startImport,
    cancelImport: ui.cancelImport,
    setImportProgress: ui.setImportProgress,
    confirmPendingImport,
    confirmImportData: confirmPendingImport, // Alias

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
    addBudget: mut.addBudget,
    deleteBudget: mut.deleteBudget,
    initializeDefaultCategories: () => mut.initializeDefaultCategories(DEFAULT_CATEGORIES),
    recalculatePaymentMethodBalances: async () => { await refreshData(); return { success: true }; },

    // --- NAVIGATION / UI ACTIONS ---
    updateFilter: ui.updateFilter,
    setSortConfig: ui.setSortConfig,
    setPage: ui.setPage,
    loadMore,
    setHighlightedCard: ui.setHighlightedCard,
    setOnboardingDecision: ui.setOnboardingDecision,
    refreshData,

    // --- PROFILE & THEME ---
    currency: profileMgmt.currency,
    decimalPlaces: profileMgmt.decimalPlaces,
    baseColor: theme.baseColor,
    themeVars: theme.themeVars,
    themeOptions: theme.themeOptions,
    setAppThemePreference: (color: string) => {
      theme.setBaseColor(color);
      return profileMgmt.updateProfile({ base_color: color });
    },
    updateProfile: profileMgmt.updateProfile,
    resetProfileData: profileMgmt.resetProfileData,
    resetOperationalData,
    convertCurrency: profileMgmt.convertCurrency,

    // --- CALCULATED VALUES ---
    totalBudget: tx.budgetsWithSpending.reduce((sum, b) => sum + b.amount, 0),
    totalSpentCurrentMonth: tx.budgetsWithSpending.reduce((sum, b) => sum + (b.spent || 0), 0),
  }), [
    tx,
    queriesLoading,
    catsLoading,
    pmLoading,
    budgetsLoading,
    profileLoading,
    paymentMethods,
    categories,
    ui,
    profileMgmt,
    theme,
    mut,
    refreshData,
    confirmPendingImport,
    resetOperationalData,
    loadMore
  ]);
}
