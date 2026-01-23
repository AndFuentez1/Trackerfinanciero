import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from './currencyConstants';
import type { Database } from '@/integrations/supabase/types';

export type TransactionType = 'income' | 'expense' | 'saving' | 'investment' | 'transfer_out' | 'transfer_in' | 'loan';
export type PaymentMethodType = 'cash' | 'debit' | 'credit' | 'savings' | 'investment';

export interface CategoryItem {
  id: string;
  name: string;
  type: TransactionType;
  color?: string | null;
  is_default?: boolean;
  saving_goal?: number | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string | null;
  category_id?: string | null;
  amount: number;
  description: string;
  date: string;
  payment_method_id?: string | null;
  created_at?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  balance: number;
  credit_limit?: number | null;
  is_savings_account?: boolean;
  savings_goal?: number | null;
  estimated_yield?: number | null; // Rentabilidad Estimada (%)
  closing_date?: number | null;
  payment_day?: number | null;
  color?: string | null;
}

// Row type returned by Supabase for payment_methods table
export type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export interface Budget {
  id: string;
  category: string;
  category_id?: string;
  amount: number;
  month: string;
  spent?: number;
  user_id?: string;
  period?: 'monthly';
  created_at?: string;
  updated_at?: string;
}

export interface Insight {
  id: string;
  type: 'warning' | 'tip' | 'success';
  title: string;
  description: string;
}


// Palette of distinct colors for consistent assignment
export const MASTER_PALETTE = [
  '#10B981', // emerald-500
  '#F97316', // orange-500
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#A855F7', // purple-500
  '#EC4899', // pink-500
  '#EAB308', // yellow-500
  '#06B6D4', // cyan-500
  '#8B5CF6', // violet-500
  '#14B8A6', // teal-500
  '#F43F5E', // rose-500
  '#6366F1', // indigo-500
  '#84CC16', // lime-500
  '#D946EF', // fuchsia-500
  '#0EA5E9', // sky-500
  '#F59E0B', // amber-500
  '#64748B', // slate-500
  '#78716C', // stone-500
  '#71717A', // zinc-500
  '#737373', // neutral-500
  '#1E293B', // slate-800
  '#991B1B', // red-800
  '#065F46', // emerald-800
  '#1E40AF', // blue-800
  '#6B21A8', // purple-800
  '#9F1239', // rose-800
  '#92400E', // amber-800
  '#155E75', // cyan-800
  '#3730A3', // indigo-800
  '#86198F', // fuchsia-800
];

const DEFAULT_CATEGORIES = [
  { name: 'Salario', type: 'income', color: '#10B981' },
  { name: 'Otros ingresos', type: 'income', color: '#34D399' },
  { name: 'Alimentación', type: 'expense', color: '#F97316' },
  { name: 'Arriendo y mudanzas', type: 'expense', color: '#B45309' },
  { name: 'Aseo y limpieza', type: 'expense', color: '#38BDF8' },
  { name: 'Cuidado personal y estética', type: 'expense', color: '#FB7185' },
  { name: 'Teléfono', type: 'expense', color: '#60A5FA' },
  { name: 'Restaurantes', type: 'expense', color: '#FB923C' },
  { name: 'Mecato y bebidas', type: 'expense', color: '#EC4899' },
  { name: 'Educación', type: 'expense', color: '#4F46E5' },
  { name: 'Gym', type: 'expense', color: '#EF4444' },
  { name: 'Oficina y trabajo', type: 'expense', color: '#64748B' },
  { name: 'Salidas, hospedajes y ocio', type: 'expense', color: '#06B6D4' },
  { name: 'Aplicativos, libros y gadgets', type: 'expense', color: '#8B5CF6' },
  { name: 'Ropa, calzado y accesorios', type: 'expense', color: '#D946EF' },
  { name: 'Farmacia y Salud', type: 'expense', color: '#F87171' },
  { name: 'Salud y pensión', type: 'expense', color: '#F43F5E' },
  { name: 'Seguro de vida', type: 'expense', color: '#DC2626' },
  { name: 'Seguro moto', type: 'expense', color: '#2563EB' },
  { name: 'Civica', type: 'expense', color: '#1E40AF' },
  { name: 'Transporte', type: 'expense', color: '#3B82F6' },
  { name: 'Gasolina', type: 'expense', color: '#EAB308' }, // Corrected from yellow-600 which is more like amber
  { name: 'Parqueadero', type: 'expense', color: '#94A3B8' },
  { name: 'Moto', type: 'expense', color: '#404040' },
  { name: 'Regalos', type: 'expense', color: '#F472B6' },
  { name: 'Utilería hogar y decoración', type: 'expense', color: '#9A3412' },
  { name: 'Utilería oficina', type: 'expense', color: '#475569' },
  { name: 'Documentos y papelería', type: 'expense', color: '#A1A1AA' },
  { name: 'Grandes activos', type: 'expense', color: '#312E81' },
  { name: 'Reparaciones', type: 'expense', color: '#7C2D12' },
  { name: 'Préstamos', type: 'expense', color: '#B91C1C' },
  { name: 'Impuestos y multas', type: 'expense', color: '#57534E' },
  { name: 'Ahorro', type: 'saving', color: '#059669' },
  { name: 'CDT', type: 'saving', color: '#7C3AED' },
  { name: 'Acciones', type: 'investment', color: '#6366F1' },
  { name: 'Transferencia', type: 'transfer_out', color: '#6B7280' },
  { name: 'Otros', type: 'other', color: '#9CA3AF' },
];

// Internal hook for logic, not to be used directly by components
export function useFinanceDataLogic() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // All transactions (no filters) for aggregate stats
  const [rangeTransactions, setRangeTransactions] = useState<Transaction[]>([]);
  const [totalTransactionsCount, setTotalTransactionsCount] = useState<number>(0); // Total count for current filter
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [currency, setCurrency] = useState('COP');
  const [decimalPlaces, setDecimalPlaces] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [onboardingDecision, setOnboardingDecision] = useState<'pending' | 'from_scratch' | 'imported' | null>(null);
  const [hasPendingImport, setHasPendingImport] = useState(false);
  const [welcomeCompleted, setWelcomeCompleted] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    status: 'idle' | 'loading' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    message: string;
    recordsProcessed?: number;
    error?: string;
  }>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [pendingImportData, setPendingImportData] = useState<Omit<Transaction, 'id'>[]>([]);
  const [dateFilter, setDateFilter] = useState<{
    from: string | null;
    to: string | null;
    period: string;
  }>({
    from: null,
    to: null,
    period: 'all'
  });
  const [sortConfig, setSortConfig] = useState<{
    column: 'date' | 'amount';
    ascending: boolean;
  }>({ column: 'date', ascending: false });
  const queryClient = useQueryClient();

  const PAGE_SIZE = 50000;

  const resetProfileData = async () => {
    if (!user) return { error: 'No autenticado' };

    setLoading(true);
    try {
      const tables: (keyof Database['public']['Tables'])[] = [
        'transactions',
        'budgets',
        'payment_methods',
        'categories',
        'savings_transactions',
        'savings_accounts',
        'loans',
      ] as any;

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id);

        if (error) {

        }
      }

      // Reset currency and onboarding state in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          currency: null,
          onboarding_decision: null,
          has_pending_import: false,
          welcome_completed: false
        })
        .eq('id', user.id);

      if (profileError) {

      }

      // Clear local states
      setCurrency('');
      setOnboardingDecision(null);
      setHasPendingImport(false);
      setImportProgress({
        status: 'idle',
        progress: 0,
        message: '',
      });
      setPendingImportData([]);
      setWelcomeCompleted(false);

      toast({ title: 'Éxito', description: 'Todos tus datos han sido eliminados.' });

      // Clear cache and navigate to index
      queryClient.clear();
      // Reload page to reset all state properly
      window.location.href = '/';

      return { error: null };
    } catch (err) {

      toast({ title: 'Error', description: 'Ocurrió un error al resetear los datos.', variant: 'destructive' });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const calculateDates = useCallback((period: string) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = new Date();

    switch (period) {
      case 'week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        from = new Date(now.setDate(diff));
        break;
      }
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        // Set 'to' to end of current month (last day of month)
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      case 'all':
        from = null;
        to = null;
        break;
    }

    return {
      from: from ? from.toISOString().split('T')[0] : null,
      to: to ? to.toISOString().split('T')[0] : null
    };
  }, []);

  const fetchTransactions = useCallback(async (isLoadMore = false): Promise<{ data: Transaction[], total: number }> => {
    if (!user) return { data: [], total: 0 };

    const from_idx = isLoadMore ? transactions.length : 0;
    const to_idx = from_idx + PAGE_SIZE - 1;

    // 1. Fetch paginated slice for the list
    let paginatedQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order(sortConfig.column, { ascending: sortConfig.ascending })
      .range(from_idx, to_idx);

    if (dateFilter.from) paginatedQuery = paginatedQuery.gte('date', dateFilter.from);
    if (dateFilter.to) paginatedQuery = paginatedQuery.lte('date', dateFilter.to);

    // 2. Fetch records for the range to power charts/summaries (NO date filter - need all historical data for charts)
    let rangeQuery = null;
    if (!isLoadMore) {
      rangeQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order(sortConfig.column, { ascending: sortConfig.ascending })
        .limit(50000); // Increased to 50000 to ensure we get all historical data for charts
      // NOTE: Intentionally NOT applying dateFilter here - charts need all years
    }

    const [paginatedRes, rangeRes] = await Promise.all([
      paginatedQuery,
      rangeQuery || Promise.resolve({ data: null, error: null })
    ]);

    if (paginatedRes.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las transacciones.', variant: 'destructive' });
      return { data: [], total: 0 };
    }

    const mappedPaginated = (paginatedRes.data || []).map(t => ({
      id: t.id,
      type: t.type === 'transfer'
        ? (t.category === 'Transferencia Enviada' ? 'transfer_out' : 'transfer_in') as TransactionType
        : t.type as TransactionType,
      category: t.category,
      category_id: (t as any).category_id,
      amount: Number(t.amount),
      description: t.description,
      date: t.date,
      payment_method_id: t.payment_method_id,
      created_at: t.created_at,
    }));

    setHasMore(mappedPaginated.length === PAGE_SIZE);

    if (isLoadMore) {
      setTransactions(prev => [...prev, ...mappedPaginated]);
    } else {
      setTransactions(mappedPaginated);
      // Save total count from paginated query for display
      setTotalTransactionsCount(paginatedRes.count || 0);
      if (rangeRes.data) {
        const mappedRange = (rangeRes.data || []).map(t => ({
          id: t.id,
          type: t.type === 'transfer'
            ? (t.category === 'Transferencia Enviada' ? 'transfer_out' : 'transfer_in') as TransactionType
            : t.type as TransactionType,
          category: t.category,
          category_id: (t as any).category_id,
          amount: Number(t.amount),
          description: t.description,
          date: t.date,
          payment_method_id: t.payment_method_id,
          created_at: t.created_at,
        }));
        setRangeTransactions(mappedRange);
      }
    }

    return { data: mappedPaginated, total: paginatedRes.count || 0 };
  }, [user, dateFilter, sortConfig, toast]); // Removed transactions.length dependency

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
    await fetchTransactions(true);
  }, [hasMore, loading, fetchTransactions]);

  // Re-fetch when sort configuration changes to ensure ordering uses full dataset
  useEffect(() => {
    fetchTransactions(false);
  }, [fetchTransactions]);

  const updateFilter = useCallback((period: string, from?: string | null, to?: string | null) => {
    setPage(0);
    if (period === 'custom' && from && to) {
      setDateFilter({ from, to, period });
    } else {
      const dates = calculateDates(period);
      setDateFilter({ ...dates, period });
    }
  }, [calculateDates]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setLastUpdated(new Date());

    // Fetch transactions with filters AND fetch ALL transactions (no date filter) for aggregate stats
    const [transactionsRes, budgetsRes, paymentMethodsRes, categoriesRes] = await Promise.all([
      fetchTransactions(false), // Fetch transactions with current date filter
      supabase.from('budgets').select('*').eq('user_id', user.id), // Fetch budgets
      supabase.from('payment_methods').select('*').eq('user_id', user.id), // Fetch payment methods
      supabase.from('categories').select('*').eq('user_id', user.id), // Fetch categories
    ]);

    // Fetch ALL transactions for aggregate stats - paginate to get all records
    const allTxnsData: any[] = [];
    let allTxnsRes = null;
    let hasMore = true;
    let offset = 0;
    const PAGE_SIZE_ALL = 1000;

    while (hasMore) {
      const res = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .range(offset, offset + PAGE_SIZE_ALL - 1);
      
      if (res.error) {
        allTxnsRes = res;
        hasMore = false;
      } else if (res.data) {
        allTxnsData.push(...res.data);
        if (res.data.length < PAGE_SIZE_ALL) {
          hasMore = false;
        } else {
          offset += PAGE_SIZE_ALL;
        }
      }
    }

    // Map all transactions for summary calculations
    if (allTxnsData.length > 0) {
      const mappedAllTxns = allTxnsData.map(t => ({
        id: t.id,
        type: t.type === 'transfer'
          ? (t.category === 'Transferencia Enviada' ? 'transfer_out' : 'transfer_in') as TransactionType
          : t.type as TransactionType,
        category: t.category,
        category_id: (t as any).category_id,
        amount: Number(t.amount),
        description: t.description,
        date: t.date,
        payment_method_id: t.payment_method_id,
        created_at: t.created_at,
      }));
      setAllTransactions(mappedAllTxns);
    } else if (allTxnsRes?.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar todos los registros históricos.', variant: 'destructive' });
    }

    // Transaction logic is handled inside fetchTransactions now

    if (budgetsRes.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los presupuestos. Por favor, intenta de nuevo.', variant: 'destructive' });
    } else {
      const mappedBudgets = budgetsRes.data.map(b => ({
        id: b.id,
        category: b.category as string,
        category_id: b.category_id,
        amount: Number(b.amount),
        month: b.month,
        user_id: b.user_id,
        created_at: b.created_at,
        updated_at: b.updated_at
      }));
      setBudgets(mappedBudgets);
    }

    if (paymentMethodsRes.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los métodos de pago. Por favor, intenta de nuevo.', variant: 'destructive' });
    } else {
      setPaymentMethods(paymentMethodsRes.data.map((pm: PaymentMethodRow) => ({
        id: pm.id,
        name: pm.name,
        type: pm.type as PaymentMethodType,
        balance: Number(pm.balance),
        credit_limit: pm.credit_limit ? Number(pm.credit_limit) : null,
        is_savings_account: pm.is_savings_account || false,
        savings_goal: pm.savings_goal ? Number(pm.savings_goal) : null,
        estimated_yield: pm.estimated_yield ? Number(pm.estimated_yield) : null,
        closing_date: pm.closing_date || null,
        payment_day: pm.payment_day || null,
        color: pm.color || '#475569', // Always include color, fallback to default gray
      })));
    }

    // Fetch Profile/Currency using 'id' as the user identifier
    let profile: Database['public']['Tables']['profiles']['Row'] | null = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency, onboarding_decision, has_pending_import, welcome_completed, decimal_places')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        // If the column doesn't exist yet (migration pending), continue gracefully
        if (error.code === '42703') {

        } else {

        }
      } else {
        profile = data;
      }
    } catch (err) {

    }

    if (profile?.currency) {
      setCurrency(profile.currency);
    } else {
      // Usuario nuevo sin moneda configurada
      setCurrency('');
    }
    
    // Decimal places: usar el valor guardado en perfil, o default basado en moneda
    if (profile?.decimal_places !== undefined && profile?.decimal_places !== null) {
      setDecimalPlaces(profile.decimal_places);
    } else {
      const currConfig = CURRENCIES.find(c => c.code === profile?.currency);
      setDecimalPlaces(currConfig?.decimals ?? 0);
    }
    
    // Set onboarding decision state
    setOnboardingDecision((profile?.onboarding_decision as 'pending' | 'from_scratch' | 'imported') || null);
    const hasPending = profile?.has_pending_import || false;
    setHasPendingImport(hasPending);
    setWelcomeCompleted(Boolean(profile?.welcome_completed));

    // If there's a pending import, restore the import progress state to 'completed'
    if (hasPending) {
      setImportProgress({
        status: 'completed',
        progress: 100,
        message: 'Datos preparados para confirmar',
      });
    }

    if (categoriesRes.error) {
      // Optional: toast error for categories
    } else {
      const loadedCategories = categoriesRes.data.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type as TransactionType,
        color: c.color,
      }));

      // --- Color Consistency Logic ---
      const usedColors = new Set(loadedCategories.map(c => c.color).filter(Boolean) as string[]);
      const categoriesToUpdate: { id: string, color: string }[] = [];

      const getUniqueColor = (excludeColors: Set<string>): string => {
        // Find first color in MASTER_PALETTE not in excludeColors
        for (const color of MASTER_PALETTE) {
          if (!excludeColors.has(color)) return color;
        }
        // Fallback: Return random from palette if all used
        return MASTER_PALETTE[Math.floor(Math.random() * MASTER_PALETTE.length)];
      };

      const finalCategories = loadedCategories.map(c => {
        if (!c.color || c.color.startsWith('bg-')) {
          // If no color OR using legacy tailwind class, assign new hex color
          const newColor = getUniqueColor(usedColors);
          usedColors.add(newColor);
          categoriesToUpdate.push({ id: c.id, color: newColor });
          return { ...c, color: newColor };
        }
        return c;
      });

      if (categoriesToUpdate.length > 0) {
        // Persist color fixes to DB
        // We do this asynchronously to not block UI rendering
        Promise.all(categoriesToUpdate.map(update =>
          supabase.from('categories').update({ color: update.color }).eq('id', update.id)
        ));
      }
      setCategories(finalCategories); // strict: no icons mapped
    }

    setLoading(false);
  }, [user, toast, fetchTransactions]);

  // Consolidated effect for initial load and filter changes
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgets([]);
      setPaymentMethods([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    // This fetches everything including transactions for the current dateFilter
    fetchData();
  }, [user, dateFilter, fetchData]);

  // Persist welcome completion once the user has configured currency, categories, and payment methods
  useEffect(() => {
    if (!user) return;

    const completed = Boolean(currency && paymentMethods.length > 0 && categories.length > 0);
    if (completed && !welcomeCompleted) {
      setWelcomeCompleted(true);
      const persistWelcome = async () => {
        try {
          await supabase
            .from('profiles')
            .update({ welcome_completed: true })
            .eq('id', user.id);
        } catch (_) {
          // best-effort; ignore if column is still missing or request fails
        }
      };
      void persistWelcome();
    }
  }, [user, currency, paymentMethods.length, categories.length, welcomeCompleted]);

  // Removed the redundant useEffect that called fetchTransactions when loading became false

  const updatePaymentMethodBalance = async (
    paymentMethodId: string,
    amount: number,
    transactionType: TransactionType
  ) => {
    const pm = paymentMethods.find(p => p.id === paymentMethodId);
    if (!pm) return;

    let newBalance: number;

    if (pm.type === 'credit') {
      // Credit card: expenses increase debt (positive balance = debt)
      if (transactionType === 'expense' || transactionType === 'transfer_out') {
        newBalance = Number(pm.balance) + Number(amount);
      } else {
        // Payments reduce debt
        newBalance = Number(pm.balance) - Number(amount);
      }
    } else {
      // Cash/Debit: expenses reduce balance, income increases
      if (transactionType === 'expense' || transactionType === 'transfer_out') {
        newBalance = Number(pm.balance) - Number(amount);
      } else {
        newBalance = Number(pm.balance) + Number(amount);
      }
    }

    const { error } = await supabase
      .from('payment_methods')
      .update({ balance: newBalance })
      .eq('id', paymentMethodId);

    if (!error) {
      setPaymentMethods(prev => prev.map(p =>
        p.id === paymentMethodId ? { ...p, balance: newBalance } : p
      ));
    }
  };

  /**
   * Calculate the total accumulated balance for a payment method at the current moment.
   * This includes all deposits and previous interest transactions.
   */
  const calculateBalanceAtTransaction = async (paymentMethodId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('payment_method_id', paymentMethodId)
      .eq('user_id', user?.id)
      .order('date', { ascending: true });

    if (error || !data) {

      return 0;
    }

    // Sum all deposits and interest transactions to get total accumulated balance
    let totalBalance = 0;
    for (const txn of data) {
      // Add deposits and transfers in
      if (txn.type === 'income' || txn.type === 'transfer_in') {
        totalBalance += Number(txn.amount);
      }
      // Subtract withdrawals and transfers out
      else if (txn.type === 'expense' || txn.type === 'transfer_out') {
        totalBalance -= Number(txn.amount);
      }
    }

    return Math.max(0, totalBalance); // Never negative
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return { error: 'No autenticado' };

    let resolvedCategoryId = (transaction as any).category_id;
    let finalType = transaction.type;
    let finalCategory = transaction.category;

    // --- AUTO-CATEGORIZATION FOR SAVINGS/INVESTMENT ACCOUNTS ---
    if (transaction.payment_method_id) {
      const pm = paymentMethods.find(p => p.id === transaction.payment_method_id);
      if (pm && (pm.type === 'savings' || pm.type === 'investment')) {
        // For savings/investment accounts, treat deposits/withdrawals as transfers
        if (finalType === 'income' || finalType === 'expense') {
          finalType = 'transfer_out';
          finalCategory = 'Transferencia entre Cuentas';
        }
      }
    }

    // Check for interest/yield descriptions
    const descriptionLower = transaction.description.toLowerCase();
    if (descriptionLower.includes('interés') || descriptionLower.includes('intereses') || descriptionLower.includes('rendimiento')) {
      finalType = 'income';
      finalCategory = 'Rendimientos';
    }

    // Ensure special categories exist if needed
    if (finalCategory === 'Transferencia entre Cuentas' || finalCategory === 'Rendimientos') {
      const specialCategories = [
        { name: 'Transferencia entre Cuentas', type: 'transfer' as TransactionType },
        { name: 'Rendimientos', type: 'income' as TransactionType }
      ];

      for (const specialCat of specialCategories) {
        if (specialCat.name === finalCategory && !categories.find(c => c.name === specialCat.name)) {
          const colorToUse = MASTER_PALETTE[categories.length % MASTER_PALETTE.length];
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: specialCat.name,
              type: specialCat.type,
              color: colorToUse
            })
            .select()
            .single();

          if (!catErr && newCat) {
            setCategories(prev => [...prev, {
              id: newCat.id,
              name: newCat.name,
              type: newCat.type as TransactionType,
              color: newCat.color,
            }]);
          }
        }
      }
    }

    // 1. Ensure Category Exists and Resolve ID
    if (finalCategory || resolvedCategoryId) {
      const catTypeRaw = (finalType === 'transfer_out' || finalType === 'transfer_in') ? 'other' : finalType;

      // Map technical types
      let catType = catTypeRaw as string;
      if (catTypeRaw === 'saving') catType = 'saving';

      let catName = finalCategory;
      if (catName === 'Préstamos') catName = 'Loans';
      if (catName === 'Salario') catType = 'income';
      if (catName === 'Loans') catType = 'loan';

      // Check if category exists in local state
      const existingCat = resolvedCategoryId
        ? categories.find(c => c.id === resolvedCategoryId)
        : categories.find(c => c.name === catName);

      let colorToUse = existingCat?.color;

      if (!existingCat && finalCategory) {
        // If category doesn't exist, check if a category with the same name but different type exists
        const existingCatByName = categories.find(c => c.name === catName);
        if (existingCatByName) {
          // If a category with the same name exists, use its ID and color, and update its type if necessary
          resolvedCategoryId = existingCatByName.id;
          colorToUse = existingCatByName.color;
          if (existingCatByName.type !== catType) {
            await supabase.from('categories').update({ type: catType }).eq('id', existingCatByName.id);
          }
        } else {
          // It's a truly new category, assign a unique color
          const usedColors = new Set(categories.map(c => c.color).filter(Boolean) as string[]);

          const getUniqueColor = (excludeColors: Set<string>): string => {
            for (const color of MASTER_PALETTE) {
              if (!excludeColors.has(color)) return color;
            }
            return MASTER_PALETTE[Math.floor(Math.random() * MASTER_PALETTE.length)];
          };
          colorToUse = getUniqueColor(usedColors);

          // Special Logic: Direct UPSERT to ensure persistence
          const upsertData: any = {
            user_id: user.id,
            name: finalCategory,
            type: catType,
            color: colorToUse
          };

          const { data: catData, error: catError } = await supabase
            .from('categories')
            .upsert(upsertData, { onConflict: 'user_id, name' })
            .select()
            .single();

          if (catError) {

          } else if (catData) {
            resolvedCategoryId = catData.id;
          }
        }
      } else if (existingCat) {
        resolvedCategoryId = existingCat.id;
        // If category exists but type is different, update it
        if (existingCat.type !== catType) {
          await supabase.from('categories').update({ type: catType }).eq('id', existingCat.id);
        }
      }
    }

    // 2. Debit Validation
    if (transaction.payment_method_id) {
      const pm = paymentMethods.find(p => p.id === transaction.payment_method_id);
      const isOutbound = ['expense', 'saving', 'investment', 'transfer_out', 'loan'].includes(finalType);

      if (pm && pm.type === 'debit' && isOutbound) {
        if (Number(pm.balance) < Number(transaction.amount)) {
          toast({
            title: 'Error: Saldo insuficiente',
            description: 'El monto supera el saldo disponible en tu cuenta de débito',
            variant: 'destructive',
          });
          return { error: 'Saldo insuficiente' };
        }
      }

      // Credit Card Validation
      if (pm && pm.type === 'credit') {
        const creditLimit = pm.credit_limit ? Number(pm.credit_limit) : 0;

        if (finalType === 'income') {
          // Payment validation
          if (Number(transaction.amount) > Number(pm.balance)) {
            toast({
              title: 'Validación de Tarjeta',
              description: 'El pago no puede exceder la deuda total de esta tarjeta.',
              variant: 'destructive',
            });
            return { error: 'Pago excede deuda' };
          }
        } else if ((finalType === 'expense' || finalType === 'transfer_out') && creditLimit > 0) {
          // Expense/transfer validation against credit limit
          const currentDebt = Number(pm.balance);
          const newDebt = currentDebt + Number(transaction.amount);
          const availableCredit = creditLimit - currentDebt;

          if (newDebt > creditLimit) {
            toast({
              title: 'Límite de Crédito Excedido',
              description: `El gasto excedería tu límite de crédito. Disponible: $${availableCredit.toLocaleString('es-CO')}`,
              variant: 'destructive',
            });
            return { error: 'Límite de crédito excedido' };
          }
        }
      }
    }

    let finalCategoryForDB = finalCategory;
    if (finalCategoryForDB === 'Préstamos') finalCategoryForDB = 'Loans';

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: (finalType === 'transfer_out' || finalType === 'transfer_in') ? 'transfer' : finalType,
        category: finalCategoryForDB,
        category_id: resolvedCategoryId || null,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        payment_method_id: transaction.payment_method_id || null,
      })
      .select()
      .single();

    if (error) {

      toast({
        title: 'Error al crear transacción',
        description: error.message || 'No se pudo agregar la transacción. Por favor, intenta de nuevo.',
        variant: 'destructive'
      });
      return { error };
    }

    // Update payment method balance
    if (transaction.payment_method_id) {
      await updatePaymentMethodBalance(
        transaction.payment_method_id,
        transaction.amount,
        finalType
      );
    }

    setTransactions(prev => [{
      id: data.id,
      type: data.type as TransactionType,
      category: finalCategoryForDB,
      category_id: (data as any).category_id,
      amount: Number(data.amount),
      description: data.description,
      date: data.date,
      payment_method_id: data.payment_method_id,
    }, ...prev]);

    setLastUpdated(new Date());

    // Global refresh instead of local setCategories
    fetchData();

    toast({ title: 'Éxito', description: 'Transacción agregada' });
    return { error: null };
  };

  const addTransactionsBulk = async (transactions: Omit<Transaction, 'id'>[]) => {
    if (!user) return { error: 'No autenticado', count: 0 };

    // Actualizar estado de progreso: iniciando importación
    setImportProgress({
      status: 'loading',
      progress: 0,
      message: 'Iniciando importación...',
      recordsProcessed: 0,
    });
    setHasPendingImport(true);

    const toInsert = transactions.map(t => ({
      user_id: user.id,
      type: (t.type === 'transfer_out' || t.type === 'transfer_in') ? 'transfer' : t.type,
      category: t.category,
      amount: t.amount,
      description: t.description,
      date: t.date,
      payment_method_id: t.payment_method_id || null,
    }));

    // Actualizar progreso: insertando transacciones
    setImportProgress({
      status: 'loading',
      progress: 30,
      message: 'Insertando transacciones...',
      recordsProcessed: 0,
    });

    const { data, error } = await supabase
      .from('transactions')
      .insert(toInsert)
      .select();

    if (error) {
      setImportProgress({
        status: 'failed',
        progress: 0,
        message: 'Error al importar transacciones',
        error: error.message,
      });
      setHasPendingImport(false);
      toast({ title: 'Error', description: 'No se pudieron importar las transacciones. Por favor, intenta de nuevo.', variant: 'destructive' });
      return { error, count: 0 };
    }

    // Actualizar progreso: recalculando balances
    setImportProgress({
      status: 'loading',
      progress: 60,
      message: 'Recalculando balances...',
      recordsProcessed: data.length,
    });

    // Recalculate payment method balances
    const balanceUpdates: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.payment_method_id) {
        const pm = paymentMethods.find(p => p.id === t.payment_method_id);
        if (pm) {
          if (!balanceUpdates[t.payment_method_id]) {
            balanceUpdates[t.payment_method_id] = 0;
          }
          if (pm.type === 'credit') {
            balanceUpdates[t.payment_method_id] += (t.type === 'expense' || t.type === 'transfer_out') ? Number(t.amount) : -Number(t.amount);
          } else {
            balanceUpdates[t.payment_method_id] += (t.type === 'expense' || t.type === 'transfer_out') ? -Number(t.amount) : Number(t.amount);
          }
        }
      }
    });

    // Update all affected payment methods
    for (const [pmId, delta] of Object.entries(balanceUpdates)) {
      const pm = paymentMethods.find(p => p.id === pmId);
      if (pm) {
        await supabase
          .from('payment_methods')
          .update({ balance: Number(pm.balance) + delta })
          .eq('id', pmId);
      }
    }

    // Actualizar progreso: finalizando
    setImportProgress({
      status: 'loading',
      progress: 90,
      message: 'Finalizando importación...',
      recordsProcessed: data.length,
    });

    // Refresh data after bulk import
    await fetchData();

    // Completado y aplicado - resetear todo porque los datos ya están en la BD
    setImportProgress({
      status: 'idle',
      progress: 0,
      message: '',
    });
    setHasPendingImport(false);

    toast({ title: 'Éxito', description: `${data.length} transacciones importadas` });
    return { error: null, count: data.length };
  };

  const deleteTransaction = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la transacción', variant: 'destructive' });
      return;
    }

    // Reverse balance update
    if (transaction?.payment_method_id) {
      const pm = paymentMethods.find(p => p.id === transaction.payment_method_id);
      if (pm) {
        let newBalance: number;
        if (pm.type === 'credit') {
          newBalance = (transaction.type === 'expense' || transaction.type === 'transfer_out')
            ? Number(pm.balance) - Number(transaction.amount)
            : Number(pm.balance) + Number(transaction.amount);
        } else {
          newBalance = (transaction.type === 'expense' || transaction.type === 'transfer_out')
            ? Number(pm.balance) + Number(transaction.amount)
            : Number(pm.balance) - Number(transaction.amount);
        }

        await supabase
          .from('payment_methods')
          .update({ balance: newBalance })
          .eq('id', transaction.payment_method_id);

        setPaymentMethods(prev => prev.map(p =>
          p.id === transaction.payment_method_id ? { ...p, balance: newBalance } : p
        ));
      }
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    toast({ title: 'Eliminado', description: 'Transacción eliminada' });
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    if (!user) return { error: 'No autenticado' };

    // 0. Balance Validation (if amount or payment method changes)
    const oldTx = transactions.find(t => t.id === id);
    const newAmount = updates.amount !== undefined ? Number(updates.amount) : (oldTx ? Number(oldTx.amount) : 0);
    const newPMId = updates.payment_method_id !== undefined ? updates.payment_method_id : (oldTx ? oldTx.payment_method_id : null);
    const newType = updates.type !== undefined ? updates.type : (oldTx ? oldTx.type : 'expense');

    if (newPMId) {
      const pm = paymentMethods.find(p => p.id === newPMId);
      const isOutbound = ['expense', 'saving', 'investment', 'transfer_out', 'loan'].includes(newType);

      if (pm && pm.type === 'debit' && isOutbound) {
        let currentBalance = Number(pm.balance);
        // If it's the same PM, we need to consider the current transaction's amount already in the balance
        if (oldTx && oldTx.payment_method_id === newPMId) {
          // Re-add the old amount to check against the new one
          currentBalance += Number(oldTx.amount);
        }

        if (currentBalance < newAmount) {
          toast({
            title: 'Error: Saldo insuficiente',
            description: 'El monto supera el saldo disponible en tu cuenta de débito',
            variant: 'destructive',
          });
          return { error: 'Saldo insuficiente' };
        }
      }

      // Credit Card Validation
      if (pm && pm.type === 'credit') {
        const creditLimit = pm.credit_limit ? Number(pm.credit_limit) : 0;

        if (newType === 'income') {
          // Payment validation
          let currentDebtCapacity = Number(pm.balance);
          // If editing a transaction on the SAME card, undo its effect to check true capacity
          if (oldTx && oldTx.payment_method_id === newPMId) {
            if (oldTx.type === 'income') {
              currentDebtCapacity += Number(oldTx.amount); // Payment reduced debt, so add it back
            } else if (oldTx.type === 'expense' || oldTx.type === 'transfer_out') {
              currentDebtCapacity -= Number(oldTx.amount); // Expense increased debt, so subtract it
            }
          }

          if (newAmount > currentDebtCapacity) {
            toast({
              title: 'Validación de Tarjeta',
              description: 'El pago no puede exceder la deuda total de esta tarjeta.',
              variant: 'destructive',
            });
            return { error: 'Pago excede deuda' };
          }
        } else if ((newType === 'expense' || newType === 'transfer_out') && creditLimit > 0) {
          // Expense/transfer validation against credit limit
          let currentDebt = Number(pm.balance);

          // If editing the same transaction, undo its effect first
          if (oldTx && oldTx.payment_method_id === newPMId) {
            if (oldTx.type === 'income') {
              currentDebt += Number(oldTx.amount); // Payment increased debt, so add it back
            } else if (oldTx.type === 'expense' || oldTx.type === 'transfer_out') {
              currentDebt -= Number(oldTx.amount); // Expense reduced debt, so subtract it
            }
          }

          const newDebt = currentDebt + newAmount;
          const availableCredit = creditLimit - currentDebt;

          if (newDebt > creditLimit) {
            toast({
              title: 'Límite de Crédito Excedido',
              description: `El gasto excedería tu límite de crédito. Disponible: $${availableCredit.toLocaleString('es-CO')}`,
              variant: 'destructive',
            });
            return { error: 'Límite de crédito excedido' };
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la transacción. Por favor, intenta de nuevo.',
        variant: 'destructive'
      });
      return { error };
    }

    // Logic: Revert old effect, then apply new effect
    // This handles amount changes, type changes, and payment method changes robustly
    if (oldTx && oldTx.payment_method_id) {
      // Pass negative amount to "revert" the effect
      await updatePaymentMethodBalance(oldTx.payment_method_id, -Number(oldTx.amount), oldTx.type);
    }

    // Map DB response to Transaction object for state update and balance application
    const updatedTx: Transaction = {
      id: data.id,
      type: (data.type === 'transfer'
        ? (data.category === 'Transferencia Enviada' ? 'transfer_out' : 'transfer_in')
        : data.type) as TransactionType,
      category: data.category as string | null,
      category_id: (data as any).category_id,
      amount: Number(data.amount),
      description: data.description,
      date: data.date,
      payment_method_id: data.payment_method_id,
      created_at: data.created_at,
    };

    if (updatedTx.payment_method_id) {
      await updatePaymentMethodBalance(updatedTx.payment_method_id, updatedTx.amount, updatedTx.type);
    }

    setTransactions(prev => prev.map(t => t.id === id ? updatedTx : t));

    return { error: null, data };
  };

  const addPaymentMethod = async (pm: Omit<PaymentMethod, 'id'>) => {
    if (!user) return { error: 'No autenticado' };

    // Check for duplicate name
    const existingMethod = paymentMethods.find(p => p.name.toLowerCase() === pm.name.toLowerCase());
    if (existingMethod) {
      toast({ 
        title: 'Nombre ya usado', 
        description: 'Ya existe un método de pago con ese nombre. Por favor, elige otro nombre.', 
        variant: 'destructive' 
      });
      return { error: 'Nombre duplicado', data: null };
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        name: pm.name,
        type: pm.type,
        balance: Number(pm.balance),
        credit_limit: pm.credit_limit,
        is_savings_account: pm.is_savings_account,
        savings_goal: pm.savings_goal,
        estimated_yield: pm.estimated_yield ?? null,
        closing_date: pm.closing_date,
        payment_day: pm.payment_day,
        color: (pm as any).color ?? '#475569',
      } as Database['public']['Tables']['payment_methods']['Insert'])
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear el método de pago', variant: 'destructive' });
      return { error };
    }

    const createdRow = data as PaymentMethodRow;

    const createdPM = {
      id: createdRow.id,
      name: createdRow.name,
      type: createdRow.type as PaymentMethodType,
      balance: Number(createdRow.balance),
      credit_limit: createdRow.credit_limit ? Number(createdRow.credit_limit) : null,
      is_savings_account: createdRow.is_savings_account || false,
      savings_goal: createdRow.savings_goal ? Number(createdRow.savings_goal) : null,
      estimated_yield: createdRow.estimated_yield ? Number(createdRow.estimated_yield) : null,
      closing_date: createdRow.closing_date || null,
      payment_day: createdRow.payment_day || null,
      color: (createdRow as any).color || null,
    };

    setPaymentMethods(prev => [...prev, createdPM]);

    toast({ title: 'Éxito', description: 'Método de pago creado' });
    return { error: null, data: createdPM };
  };

  const addTransfer = async (fromId: string, toId: string, amount: number, description: string, date: string) => {
    if (!user) return { error: 'No autenticado' };

    const transferCategory = categories.find(c => c.name.toLowerCase() === 'transferencia')
      || categories.find(c => ['transfer', 'transfer_out', 'transfer_in'].includes(c.type));
    const transferCategoryId = transferCategory ? transferCategory.id : null;

    // 0. Debit Validation
    const pmFrom = paymentMethods.find(p => p.id === fromId);
    if (pmFrom && pmFrom.type === 'debit' && Number(pmFrom.balance) < Number(amount)) {
      toast({
        title: 'Error: Saldo insuficiente',
        description: 'La transferencia supera el saldo disponible en tu cuenta de débito',
        variant: 'destructive',
      });
      return { error: 'Saldo insuficiente' };
    }

    // CC Payment Validation (If transferring TO a credit card)
    const pmTo = paymentMethods.find(p => p.id === toId);
    if (pmTo && pmTo.type === 'credit') {
      if (Number(amount) > Number(pmTo.balance)) {
        toast({
          title: 'Validación de Tarjeta',
          description: 'El pago no puede exceder la deuda total de esta tarjeta.',
          variant: 'destructive',
        });
        return { error: 'Pago excede deuda' };
      }
    }

    // 1. Create OUT transaction (Transfer Out)
    const { error: outError } = await supabase.from('transactions').insert({
      user_id: user.id,
      payment_method_id: fromId,
      type: 'transfer',
      category: 'Transferencia Enviada',
      category_id: transferCategoryId,
      amount,
      description: `Transferencia a: ${paymentMethods.find(p => p.id === toId)?.name || 'Cuenta'} - ${description}`,
      date
    });

    if (outError) return { error: outError };

    // 2. Create IN transaction (Transfer In)
    const { error: inError } = await supabase.from('transactions').insert({
      user_id: user.id,
      payment_method_id: toId,
      type: 'transfer',
      category: 'Transferencia Recibida',
      category_id: transferCategoryId,
      amount,
      description: `Transferencia de: ${paymentMethods.find(p => p.id === fromId)?.name || 'Cuenta'} - ${description}`,
      date
    });

    if (inError) return { error: inError };

    // Update keys logic
    const fromAccount = paymentMethods.find(p => p.id === fromId);
    const toAccount = paymentMethods.find(p => p.id === toId);

    if (fromAccount) {
      let newFromBalance = Number(fromAccount.balance);
      if (fromAccount.type === 'credit') {
        newFromBalance += Number(amount);
      } else {
        newFromBalance -= Number(amount);
      }
      await supabase.from('payment_methods').update({ balance: newFromBalance }).eq('id', fromId);
    }
    if (toAccount) {
      let newToBalance = Number(toAccount.balance);
      if (toAccount.type === 'credit') {
        newToBalance -= Number(amount);
      } else {
        newToBalance += Number(amount);
      }
      await supabase.from('payment_methods').update({ balance: newToBalance }).eq('id', toId);
    }

    toast({ title: 'Éxito', description: 'Transferencia realizada con éxito' });
    fetchData();
    return { error: null };
  };

  const updateProfile = async (updates: { currency?: string; display_name?: string; decimal_places?: number }) => {
    if (!user) return { error: 'No autenticado' };

    // Primero verificar si existe el perfil usando 'id' como identificador
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, currency')
      .eq('id', user.id)
      .maybeSingle();

    let result;
    if (existingProfile) {
      // Si existe, hacer UPDATE usando 'id'
      result = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select();
    } else {
      // Si no existe, hacer INSERT con 'id' como user identifier
      result = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          type: 'personal',
          profile_type: 'Personal',
          onboarding_decision: null,
          has_pending_import: false,
          ...updates
        })
        .select();
    }

    const { data, error } = result;

    if (error) {

      toast({ title: 'Error', description: `No se pudo actualizar el perfil: ${error.message}`, variant: 'destructive' });
      return { error };
    }

    // Actualizar currency local si cambió
    if (updates.currency) {
      setCurrency(updates.currency);
    }
    
    // Actualizar decimal_places local si cambió
    if (updates.decimal_places !== undefined) {
      setDecimalPlaces(updates.decimal_places);
    }

    toast({ title: 'Éxito', description: 'Perfil actualizado' });

    // Refrescar datos después de actualizar
    await fetchData();

    return { error: null };
  };

  const setOnboardingDecisionFn = async (decision: 'from_scratch' | 'imported') => {
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_decision: decision })
      .eq('id', user.id);

    if (error) {

      toast({ title: 'Error', description: 'No se pudo guardar tu decisión', variant: 'destructive' });
      return { error };
    }

    setOnboardingDecision(decision);

    // Si elige empezar desde cero, limpiar pending import
    if (decision === 'from_scratch') {
      setHasPendingImport(false);
    }

    // Refrescar datos después de actualizar
    await fetchData();

    return { error: null };
  };

  const confirmPendingImport = async () => {
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
      .from('profiles')
      .update({
        has_pending_import: false,
        onboarding_decision: 'imported'
      })
      .eq('id', user.id);

    if (error) {

      toast({ title: 'Error', description: 'No se pudo confirmar la importación', variant: 'destructive' });
      return { error };
    }

    setHasPendingImport(false);
    setOnboardingDecision('imported');

    // Refrescar datos después de confirmar
    await fetchData();

    return { error: null };
  };

  const startImport = (data: Omit<Transaction, 'id'>[]) => {
    // Guardar datos pendientes sin aplicar
    setPendingImportData(data);
    setHasPendingImport(true);
    setImportProgress({
      status: 'completed',
      progress: 100,
      message: 'Datos cargados, pendientes de confirmación',
    });

    // Marcar como pending en DB
    if (user) {
      supabase
        .from('profiles')
        .update({ has_pending_import: true })
        .eq('id', user.id)
        .catch(err => {});
    }
  };

  const cancelImport = async () => {
    const recordCount = pendingImportData.length;

    // Mostrar toast con el conteo de registros
    if (recordCount > 0) {
      toast({
        title: 'Importación cancelada',
        description: `Se descartaron ${recordCount} registr${recordCount !== 1 ? 'os' : 'o'}`,
        variant: 'default'
      });
    }

    setPendingImportData([]);
    setHasPendingImport(false);
    setImportProgress({
      status: 'cancelled',
      progress: 0,
      message: 'Importación cancelada',
    });

    // Establecer onboarding como completado (from_scratch) para desaparecer el onboarding
    await supabase
      .from('profiles')
      .update({
        has_pending_import: false,
        onboarding_decision: 'from_scratch'
      })
      .eq('id', user?.id);

    setOnboardingDecision('from_scratch');

    // Refrescar datos para volver al Dashboard
    await fetchData();
  };

  const confirmImportData = async () => {
    if (pendingImportData.length === 0) return { error: 'No hay datos para confirmar' };
    if (!user) return { error: 'No autenticado' };

    try {
      const totalRecords = pendingImportData.length;

      setImportProgress({
        status: 'loading',
        progress: 30,
        message: 'Aplicando datos importados...',
        recordsProcessed: 0,
      });

      // Insertar todas las transacciones en lotes para mejor UX
      const batchSize = 50;
      let processedCount = 0;

      for (let i = 0; i < pendingImportData.length; i += batchSize) {
        const batch = pendingImportData.slice(i, i + batchSize);
        const { error } = await supabase
          .from('transactions')
          .insert(batch.map(t => ({
            ...t,
            user_id: user.id,
          })));

        if (error) throw error;

        processedCount += batch.length;
        const progressPercent = 30 + Math.floor((processedCount / totalRecords) * 40);

        setImportProgress({
          status: 'loading',
          progress: progressPercent,
          message: 'Aplicando datos importados...',
          recordsProcessed: processedCount,
        });
      }

      setImportProgress({
        status: 'loading',
        progress: 70,
        message: 'Recalculando saldos...',
        recordsProcessed: totalRecords,
      });

      // Recalcular saldos basado en transacciones
      await recalculatePaymentMethodBalances();

      setImportProgress({
        status: 'completed',
        progress: 100,
        message: 'Datos confirmados exitosamente',
        recordsProcessed: totalRecords,
      });

      // Limpiar estado
      setPendingImportData([]);
      setHasPendingImport(false);

      // Actualizar DB
      await supabase
        .from('profiles')
        .update({
          has_pending_import: false,
          onboarding_decision: 'imported'
        })
        .eq('id', user.id);

      // Refrescar datos
      await fetchData();

      // Resetear progreso después de refrescar
      setImportProgress({
        status: 'idle',
        progress: 0,
        message: '',
      });

      toast({
        title: 'Éxito',
        description: 'Datos importados y confirmados correctamente',
        variant: 'default'
      });

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error desconocido';
      setImportProgress({
        status: 'failed',
        progress: 0,
        message: 'Error al confirmar datos',
        error,
      });
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
      return { error };
    }
  };

  const recalculatePaymentMethodBalances = async () => {
    // Esta función recalcula los saldos de métodos de pago basado en transacciones importadas
    // por ahora es un placeholder - la lógica depende de cómo manejes transacciones de importación
    await fetchData();

    toast({ title: 'Éxito', description: 'Datos aplicados correctamente' });
    return { error: null };
  };

  const convertCurrency = async (rate: number, newCurrency: string, dryRun = false) => {
    if (!user?.id) {

      return { error: 'No autenticado' };
    }

    try {
      // Fetch user's payment methods and transactions
      const [{ data: pms, error: pmErr }, { data: txs, error: txErr }] = await Promise.all([
        supabase.from('payment_methods').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
      ]);

      if (pmErr) throw pmErr;
      if (txErr) throw txErr;

      // Validate data before processing
      const validPms = (pms || []).filter(pm => pm && pm.id && pm.name);

      const pmUpdates = validPms.map((pm: PaymentMethodRow) => ({
        ...pm,
        balance: pm.balance != null ? Math.round(Number(pm.balance) * rate * 100) / 100 : pm.balance,
        user_id: user.id,
      }));

      const txUpdates = (txs || []).map((tx: TransactionRow) => ({
        ...tx,
        amount: Math.round(Number(tx.amount) * rate * 100) / 100,
        user_id: user.id
      }));

      // If dryRun requested, return a preview without persisting
      if (dryRun) {
        const pmPreview = (pms || []).map((pm: PaymentMethodRow, i: number) => ({
          id: pm.id,
          name: pm.name,
          oldBalance: pm.balance != null ? Number(pm.balance) : null,
          newBalance: pmUpdates[i].balance,
        }));

        const txPreview = (txs || []).map((tx: TransactionRow, i: number) => ({
          id: tx.id,
          oldAmount: Number(tx.amount),
          newAmount: txUpdates[i].amount,
        }));

        return { error: null, preview: { payment_methods: pmPreview, transactions: txPreview } };
      }

      // Debug payloads before sending to Supabase
      // Debug logs removed

      // Apply updates via upsert (use onConflict 'id' to update existing rows)
      if (pmUpdates.length) {
        const { error: upmErr } = await supabase.from('payment_methods').upsert(pmUpdates, { onConflict: 'id' });
        if (upmErr) throw upmErr;
      }

      if (txUpdates.length) {
        const { error: utxErr } = await supabase.from('transactions').upsert(txUpdates, { onConflict: 'id' });
        if (utxErr) throw utxErr;
      }

      // Update profile currency
      const { error: profErr } = await supabase.from('profiles').update({ currency: newCurrency }).eq('id', user.id);
      if (profErr) throw profErr;

      // Update local state IMMEDIATELY for instant UX (before fetchData)
      setCurrency(newCurrency);
      setPaymentMethods(prev => prev.map(pm => pm.balance != null ? { ...pm, balance: Math.round(pm.balance * rate * 100) / 100 } : pm));
      setTransactions(prev => prev.map(tx => ({ ...tx, amount: Math.round(tx.amount * rate * 100) / 100 })));

      // Note: fetchData removed to prevent race condition overwriting currency state
      // The realtime subscription will handle refreshing if needed
      return { error: null };
    } catch (err: any) { // Explicitly type 'err' as 'any' or 'unknown'

      toast({ title: 'Error', description: 'No se pudo aplicar la conversión', variant: 'destructive' });
      return { error: err };
    }
  };

  const updatePaymentMethod = async (id: string, updates: Partial<Omit<PaymentMethod, 'id'>>) => {
    if (!user) return { error: 'No autenticado' };

    const payload: Partial<PaymentMethodRow> = {
      name: updates.name,
      type: updates.type,
      balance: Number(updates.balance),
      credit_limit: updates.credit_limit,
      is_savings_account: updates.is_savings_account,
      savings_goal: updates.savings_goal,
      estimated_yield: (updates as Partial<PaymentMethod>).estimated_yield ?? null,
      closing_date: updates.closing_date,
      payment_day: updates.payment_day,
      color: updates.color ?? '#475569',
    };

    const { error } = await supabase
      .from('payment_methods')
      .update(payload)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el método de pago', variant: 'destructive' });
      return { error };
    }

    // Update local state immediately for optimistic UI
    setPaymentMethods(prev => prev.map(pm => pm.id === id ? { ...pm, ...updates } : pm));
    setLastUpdated(new Date());
    
    toast({ title: 'Éxito', description: 'Método de pago actualizado' });
    return { error: null };
  };

  const deletePaymentMethod = async (id: string) => {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el método de pago. Por favor, intenta de nuevo.', variant: 'destructive' });
      return;
    }

    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    toast({ title: 'Eliminado', description: 'Método de pago eliminado' });
  };

  const addBudget = async (budget: Omit<Budget, 'id'>) => {
    if (!user) return { error: 'No autenticado' };

    // Use upsert to prevent duplicates for same category
    const { data, error } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.id,
        category: budget.category,
        amount: budget.amount,
        month: budget.month,
      }, {
        onConflict: 'user_id,category'
      })
      .select()
      .single();

    if (error) {

      toast({
        title: 'Error al manejar presupuesto',
        description: error.message || 'No se pudo guardar el presupuesto.',
        variant: 'destructive'
      });
      return { error };
    }

    setBudgets(prev => {
      const existingIndex = prev.findIndex(b => b.category === data.category);
      if (existingIndex > -1) {
        const newBudgets = [...prev];
        newBudgets[existingIndex] = {
          id: data.id,
          category: data.category as string,
          amount: Number(data.amount),
          month: data.month,
        };
        return newBudgets;
      }
      return [...prev, {
        id: data.id,
        category: data.category as string,
        amount: Number(data.amount),
        month: data.month,
      }];
    });

    toast({ title: 'Éxito', description: '¡Presupuesto actualizado con éxito!' });
    return { error: null };
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el presupuesto', variant: 'destructive' });
      return;
    }

    setBudgets(prev => prev.filter(b => b.id !== id));
    toast({ title: 'Eliminado', description: 'Presupuesto eliminado' });
  };

  // Real-time synchronization
  useEffect(() => {
    if (!user) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    // Debounced handler to avoid multiple rapid fetches
    const handleRealtimeChange = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        setLoading(true);
        fetchData();
      }, 500); // Wait 500ms after last change before fetching
    };

    const transactionsChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          handleRealtimeChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          handleRealtimeChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_methods',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          handleRealtimeChange();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(transactionsChannel);
    };
  }, [user]);

  const addCategory = async (category: Omit<CategoryItem, 'id' | 'created_at'>) => {
    try {
      // Get current authenticated user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        toast({
          title: 'Error de autenticación',
          description: 'Debes estar autenticado para crear categorías',
          variant: 'destructive'
        });
        return { error: 'No autenticado' };
      }

      let finalName = category.name;
      if (finalName === 'Préstamos') finalName = 'Loans';

      let finalType = category.type;
      if ((finalType as string) === 'savings') finalType = 'saving' as TransactionType;
      if (finalName === 'Salario') finalType = 'income';
      if (finalName === 'Loans') finalType = 'loan';

      // Check if category exists in local state
      const existingInState = categories.find(c => c.name.toLowerCase() === finalName.toLowerCase());
      if (existingInState) {
        // Category exists in local state
        toast({
          title: 'Aviso',
          description: 'Esta categoría ya existe',
          variant: 'default'
        });
        return { error: 'Categoría existente', data: existingInState };
      }

      // Check category existence in DB
      // Check if category exists in database (in case state is out of sync)
      const { data: existingInDB, error: checkError } = await supabase
        .from('categories')
        .select()
        .eq('user_id', currentUser.id)
        .eq('name', finalName)
        .maybeSingle();

      if (existingInDB) {
        // Found existing category in DB
        const existingCategory = {
          id: existingInDB.id,
          name: existingInDB.name,
          type: existingInDB.type as TransactionType,
          color: existingInDB.color,
        };

        // Add to local state if not already present
        setCategories(prev => {
            if (prev.find(c => c.id === existingCategory.id)) {
            return prev;
          }
            return [...prev, existingCategory];
        });

        toast({
          title: 'Categoría encontrada',
          description: 'Esta categoría ya existe y ha sido agregada a tu lista',
        });
        return { error: null, data: existingCategory };
      }

      // Creating new category
      const { data, error } = await supabase
        .from('categories')
        .upsert({
          user_id: currentUser.id,
          name: finalName,
          type: finalType,
          color: category.color,
        }, { onConflict: 'user_id,name' })
        .select()
        .single();

      // Handle unique constraint violation (23505) by fetching existing row
      if (error) {
        if ((error as unknown as { code?: string }).code === '23505') {
          const { data: existingData, error: fetchError } = await supabase
            .from('categories')
            .select()
            .eq('user_id', currentUser.id)
            .eq('name', category.name)
            .single();

          if (!fetchError && existingData) {
            const existingCategory = {
              id: existingData.id,
              name: existingData.name,
              type: existingData.type as TransactionType,
              color: existingData.color,
            };

            // Add to local state if not already present
            setCategories(prev => {
              if (prev.find(c => c.id === existingCategory.id)) {
                return prev;
              }
              return [...prev, existingCategory];
            });

            toast({ title: 'Éxito', description: 'Categoría lista para usar' });
            return { error: null, data: existingCategory };
          }
        }


        toast({
          title: 'Error',
          description: error?.message || 'No se pudo crear la categoría. Por favor, intenta de nuevo.',
          variant: 'destructive'
        });
        return { error };
      }

      const newCategory = {
        id: data.id,
        name: data.name,
        type: data.type as TransactionType,
        color: data.color,
      };

      // Avoid adding duplicates to local state
      setCategories(prev => {
        if (prev.find(c => c.id === newCategory.id)) return prev;
        return [...prev, newCategory];
      });

      toast({ title: 'Éxito', description: 'Categoría creada' });
      return { error: null, data: newCategory };
    } catch (err) {

      toast({
        title: 'Error inesperado',
        description: 'Ocurrió un error al crear la categoría',
        variant: 'destructive'
      });
      return { error: err };
    }
  };

  const updateCategoryGoal = async (id: string, goal: number) => {
    if (!user) return { error: 'No autenticado' };

    const { error } = await supabase
      .from('categories')
      .update({ saving_goal: goal } as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la meta', variant: 'destructive' });
      return { error };
    }

    setCategories(prev => prev.map(c => c.id === id ? { ...c, saving_goal: goal } : c));
    toast({ title: 'Éxito', description: 'Meta de ahorro actualizada' });
    return { error: null };
  };

  const updateCategory = async (id: string, category: Partial<Omit<CategoryItem, 'id'>>) => {
    if (!user) return { error: 'No autenticado' };

    let finalName = category.name;
    if (finalName === 'Préstamos') finalName = 'Loans';

    let finalType = category.type;
    if ((finalType as string) === 'savings') finalType = 'saving' as TransactionType;
    if (finalName === 'Salario') finalType = 'income';
    if (finalName === 'Loans') finalType = 'loan';

    const { data, error } = await supabase
      .from('categories')
      .update({
        name: finalName,
        type: finalType,
        color: category.color,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la categoría. Por favor, intenta de nuevo.', variant: 'destructive' });
      return { error };
    }

    const updated = {
      id: data.id,
      name: data.name,
      type: data.type as TransactionType,
      color: data.color,
    };

    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    toast({ title: 'Éxito', description: 'Categoría actualizada' });
    return { error: null, data: updated };
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la categoría. Asegúrate de que no tenga transacciones asociadas.', variant: 'destructive' });
      return;
    }

    setCategories(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Eliminado', description: 'Categoría eliminada' });
  };

  // Summary calculations - using ALL transactions for aggregate stats (no date filter)
  const summary = useMemo(() => {
    // Filter out undisbursed loans (they shouldn't affect balance until disbursed)
    const validTransactions = allTransactions.filter(t =>
      !((t.category === 'Préstamos' || t.category === 'Loans') && !t.payment_method_id)
    );

    const totalIncome = validTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = validTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSavings = validTransactions
      .filter(t => t.type === 'saving')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalInvestments = validTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      netWorth: totalIncome - totalExpenses,
      currency, // Include currency from state
    };
  }, [allTransactions, currency]);

  // Filtered summary - respects date filters for dashboard display
  const filteredSummary = useMemo(() => {
    const validTransactions = rangeTransactions.filter(t =>
      !((t.category === 'Préstamos' || t.category === 'Loans') && !t.payment_method_id)
    );

    const totalIncome = validTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = validTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSavings = validTransactions
      .filter(t => t.type === 'saving')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalInvestments = validTransactions
      .filter(t => t.type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      netWorth: totalIncome - totalExpenses,
      currency,
    };
  }, [rangeTransactions, currency]);

  const expensesByCategory = useMemo(() => {
    const expenses = rangeTransactions.filter(t => t.type === 'expense');
    const grouped: Record<string, { name: string, amount: number, id: string | null }> = {};

    expenses.forEach(expense => {
      const catId = expense.category_id || "none";
      const catName = expense.category || "Sin categoría";

      if (!grouped[catId]) {
        grouped[catId] = { name: catName, amount: 0, id: expense.category_id || null };
      }
      grouped[catId].amount += expense.amount;
    });

    return Object.values(grouped)
      .map(item => ({ category: item.name as string, category_id: item.id, amount: item.amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [rangeTransactions]);

  // Budgets with spending
  const budgetsWithSpending = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const currentMonthExpenses = rangeTransactions.filter(
      t => t.type === 'expense' && t.date.substring(0, 7) === currentMonth
    );

    return budgets
      .filter(b => b.month.substring(0, 7) === currentMonth)
      .map(budget => {
        const spent = currentMonthExpenses
          .filter(e => e.category === budget.category)
          .reduce((sum, e) => sum + e.amount, 0);
        return { ...budget, spent };
      });
  }, [budgets, rangeTransactions]);

  // Yield Statistics
  const yieldStatistics = useMemo(() => {
    // Calculate yield from Rendimientos category (interest income)
    const yieldTransactions = transactions.filter(t =>
      t.category === 'Rendimientos' && t.type === 'income'
    );
    const totalYield = yieldTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageYield = yieldTransactions.length > 0 ? totalYield / yieldTransactions.length : 0;

    // Group by payment method
    const yieldByPaymentMethod: { [key: string]: number } = {};
    yieldTransactions.forEach(t => {
      if (t.payment_method_id) {
        yieldByPaymentMethod[t.payment_method_id] = (yieldByPaymentMethod[t.payment_method_id] || 0) + t.amount;
      }
    });

    return {
      totalYield,
      yieldCount: yieldTransactions.length,
      averageYield,
      yieldByPaymentMethod,
      yieldTransactions
    };
  }, [transactions]);

  // Insights
  const insights: Insight[] = useMemo(() => {
    const insights: Insight[] = [];
    const savingsRate = summary.totalIncome > 0
      ? ((summary.totalSavings + summary.totalInvestments) / summary.totalIncome) * 100
      : 0;

    if (savingsRate < 20 && summary.totalIncome > 0) {
      insights.push({
        id: '1',
        type: 'warning',
        title: 'Ahorro bajo',
        description: `Estás ahorrando solo el ${savingsRate.toFixed(0)}% de tus ingresos. Intenta llegar al 20%.`,
      });
    } else if (summary.totalIncome > 0) {
      insights.push({
        id: '1',
        type: 'success',
        title: '¡Buen ahorro!',
        description: `Estás ahorrando el ${savingsRate.toFixed(0)}% de tus ingresos. ¡Excelente!`,
      });
    }

    // Check budget overruns
    budgetsWithSpending.forEach(budget => {
      if (budget.spent && budget.spent > budget.amount) {
        insights.push({
          id: `budget-${budget.id}`,
          type: 'warning',
          title: `Presupuesto excedido`,
          description: `Has gastado más de lo presupuestado en ${budget.category}.`,
        });
      }
    });

    // Check credit card limits
    paymentMethods.forEach(pm => {
      if (pm.type === 'credit' && pm.credit_limit) {
        const usage = (pm.balance / pm.credit_limit) * 100;
        if (usage > 80) {
          insights.push({
            id: `credit-${pm.id}`,
            type: 'warning',
            title: `Alto uso de ${pm.name}`,
            description: `Has usado el ${usage.toFixed(0)}% de tu límite de crédito.`,
          });
        }
      }
    });

    const foodExpenses = expensesByCategory.find(e => e.category === 'food');
    if (foodExpenses && summary.totalIncome > 0 && foodExpenses.amount > summary.totalIncome * 0.15) {
      insights.push({
        id: '2',
        type: 'tip',
        title: 'Revisa gastos en comida',
        description: 'Tus gastos en comida superan el 15% de tus ingresos. Considera cocinar más en casa.',
      });
    }

    if (summary.totalInvestments < summary.totalSavings * 0.5 && summary.totalSavings > 0) {
      insights.push({
        id: '3',
        type: 'tip',
        title: 'Considera invertir más',
        description: 'Tus inversiones son menores que tu ahorro. Invierte para hacer crecer tu dinero.',
      });
    }

    return insights;
  }, [summary, expensesByCategory, budgetsWithSpending, paymentMethods]);

  const orphanedTransactions = useMemo(() => {
    return transactions.filter(t =>
      (!t.category_id || !t.payment_method_id) &&
      t.category !== 'Préstamos' &&
      t.category !== 'Loans'
    );
  }, [transactions]);

  return {
    transactions,
    allTransactions, // All transactions (no date filter) used for aggregate stats
    budgets: budgetsWithSpending,
    paymentMethods,
    loading,
    summary,
    filteredSummary, // Summary that respects date filters
    expensesByCategory,
    insights,
    yieldStatistics,
    currency,
    decimalPlaces,
    onboardingDecision,
    hasPendingImport,
    welcomeCompleted,
    importProgress,
    pendingImportData,
    addTransaction,
    addTransactionsBulk,
    deleteTransaction,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addTransfer,
    updateProfile,
    convertCurrency,
    setOnboardingDecision: setOnboardingDecisionFn,
    confirmPendingImport,
    startImport,
    cancelImport,
    confirmImportData,
    addBudget,
    deleteBudget,
    refreshData: fetchData, // Consistent name for global refresh
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    updateTransaction,
    orphanedTransactions,
    dateFilter,
    sortConfig,
    setSortConfig,
    loadMore,
    updateFilter,
    hasMore,
    rangeTransactions,
    totalTransactionsCount, // Total count respecting current filter
    totalBudget: budgetsWithSpending.reduce((sum, b) => sum + b.amount, 0),
    totalSpentCurrentMonth: budgetsWithSpending.reduce((sum, b) => sum + (b.spent || 0), 0),
    resetProfileData,
    lastUpdated,
    updateCategoryGoal
  };
}

// Global hook to be used by components
export function useFinanceData() {
  return useFinance();
}
