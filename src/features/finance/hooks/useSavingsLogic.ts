import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useToast } from '@/shared/hooks/use-toast';
import type { PaymentMethodRow } from '@/features/finance/types/financeTypes';
import type { Database } from '@/integrations/supabase/types';
import type { SavingsAccount, SavingsTransaction } from './useSavingsData';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';
import { buildFinanceCacheKey, readFinanceCache, writeFinanceCache } from '@/features/finance/utils/localCache';
import { normalizeYieldPeriod } from '@/features/finance/utils/yieldUtils';



export function useSavingsDataLogic() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accountsCacheKey = useMemo(
    () => (user?.id ? buildFinanceCacheKey('savings-accounts', user.id) : null),
    [user?.id]
  );
  const transactionsCacheKey = useMemo(
    () => (user?.id ? buildFinanceCacheKey('savings-transactions', user.id) : null),
    [user?.id]
  );

  // Calculate previous balance for yield percentage calculation
  const calculatePreviousSavingsBalance = useCallback(async (paymentMethodId: string, beforeDate: string): Promise<number> => {
    if (!user) { return 0; }

    const { data: priorTxs } = await supabase
      .from('savings_transactions')
      .select('type, amount')
      .eq('payment_method_id', paymentMethodId)
      .eq('user_id', user.id)
      .lt('date', beforeDate)
      .order('date', { ascending: true });

    if (!priorTxs) { return 0; }

    return priorTxs.reduce((balance, tx) => {
      const amount = Number(tx.amount);
      if (tx.type === 'withdrawal') { return balance - amount; }
      return balance + amount; // deposit or interest
    }, 0);
  }, [user]);

  const hydrateFromCache = useCallback(() => {
    let hasCache = false;

    if (accountsCacheKey) {
      const cachedAccounts = readFinanceCache<SavingsAccount[]>(accountsCacheKey, 12 * 60 * 60 * 1000);
      if (cachedAccounts) {
        setSavingsAccounts(cachedAccounts);
        hasCache = true;
      }
    }

    if (transactionsCacheKey) {
      const cachedTransactions = readFinanceCache<SavingsTransaction[]>(transactionsCacheKey, 12 * 60 * 60 * 1000);
      if (cachedTransactions) {
        setSavingsTransactions(cachedTransactions);
        hasCache = true;
      }
    }

    if (hasCache) {
      setLoading(false);
    }

    return hasCache;
  }, [accountsCacheKey, transactionsCacheKey]);

  const fetchData = useCallback(async (options?: { background?: boolean }) => {
    if (!user) { return; }

    if (!options?.background) {
      setLoading(true);
    }
    setError(null);

    const { data: accountsData, error: accountsError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_savings_account', true);

    if (accountsError) {
      const msg = accountsError.message ?? 'No se pudieron cargar las cuentas de ahorro';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      setSavingsAccounts([]);
      setSavingsTransactions([]);
      setLoading(false);
      return;
    }

    const accounts = accountsData.map((a: PaymentMethodRow & { yield_period?: string }) => ({
      id: a.id,
      name: a.name,
      balance: Number(a.balance),
      interest_rate: a.estimated_yield ? Number(a.estimated_yield) : 0,
      estimated_yield: a.estimated_yield ? Number(a.estimated_yield) : 0,
      yield_period: normalizeYieldPeriod(a.yield_period),
      savings_goal: a.savings_goal ? Number(a.savings_goal) : null,
      initial_date: a.initial_date,
    }));

    setSavingsAccounts(accounts);
    if (accountsCacheKey) {
      writeFinanceCache(accountsCacheKey, accounts);
    }

    if (accounts.length > 0) {
      const accountIds = accounts.map(a => a.id);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('savings_transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('payment_method_id', accountIds)
        .order('date', { ascending: false });

      if (transactionsError) {
        const msg = transactionsError.message ?? 'No se pudieron cargar las transacciones de ahorro';
        setError(msg);
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      } else {
        setError(null);
        const mappedTransactions = transactionsData.map((t: Database['public']['Tables']['savings_transactions']['Row']) => ({
          id: t.id,
          payment_method_id: t.payment_method_id,
          savings_account_id: t.savings_account_id,
          type: t.type,
          amount: Number(t.amount),
          date: t.date,
          description: t.description || undefined,
          calculated_yield: t.calculated_yield ? Number(t.calculated_yield) : null,
          balance_after_transaction: t.balance_after_transaction ? Number(t.balance_after_transaction) : null,
        }));
        setSavingsTransactions(mappedTransactions);
        if (transactionsCacheKey) {
          writeFinanceCache(transactionsCacheKey, mappedTransactions);
        }
      }
    } else {
      setSavingsTransactions([]);
      if (transactionsCacheKey) {
        writeFinanceCache(transactionsCacheKey, []);
      }
      setError(null);
    }

    setLoading(false);
  }, [user, toast, accountsCacheKey, transactionsCacheKey]);

  useEffect(() => {
    if (!user) {
      setSavingsAccounts([]);
      setSavingsTransactions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const hasCache = hydrateFromCache();
    fetchData({ background: hasCache });
  }, [user, hydrateFromCache, fetchData]);

  useEffect(() => {
    if (accountsCacheKey) {
      writeFinanceCache(accountsCacheKey, savingsAccounts);
    }
  }, [accountsCacheKey, savingsAccounts]);

  useEffect(() => {
    if (transactionsCacheKey) {
      writeFinanceCache(transactionsCacheKey, savingsTransactions);
    }
  }, [transactionsCacheKey, savingsTransactions]);

  const addSavingsAccount = async (account: {
    name: string;
    balance?: number;
    interest_rate?: number;
    estimated_yield?: number;
    yield_period?: 'annual' | 'monthly';
    savings_goal?: number;
    initial_date?: string;
  }) => {
    if (!user) { return { error: 'No autenticado' }; }

    // Create a Payment Method of type 'debit' (or cash) but marked as savings
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        name: account.name,
        type: 'debit', // Default to debit so it behaves like bank account
        balance: account.balance || 0,
        is_savings_account: true,
        savings_goal: account.savings_goal ?? null,
        estimated_yield: account.estimated_yield ?? account.interest_rate ?? 0,
        yield_period: account.yield_period ?? 'annual',
        initial_date: account.initial_date || `${new Date().toISOString().substring(0, 7)}-01`,
      } satisfies Database['public']['Tables']['payment_methods']['Insert'] & { yield_period?: string })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la cuenta de ahorro', variant: 'destructive' });
      return { error };
    }

    // Cast response to row
    const row = data as PaymentMethodRow;

    setSavingsAccounts(prev => [...prev, {
      id: row.id,
      name: row.name,
      balance: Number(row.balance),
      interest_rate: row.estimated_yield ? Number(row.estimated_yield) : 0,
      estimated_yield: row.estimated_yield ? Number(row.estimated_yield) : 0,
      yield_period: normalizeYieldPeriod((row as PaymentMethodRow & { yield_period?: string }).yield_period),
      savings_goal: row.savings_goal ? Number(row.savings_goal) : null,
      initial_date: row.initial_date,
    }]);

    toast({ title: 'Éxito', description: 'Cuenta de ahorro creada' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    return { error: null, data };
  };

  const deleteSavingsAccount = async (id: string, option: 'delete' | 'orphan' | 'transfer' = 'orphan', transferToId?: string) => {
    if (!user) return;

    if (option === 'delete') {
      // Delete associated transactions
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .or(`payment_method_id.eq.${id},to_payment_method_id.eq.${id}`);
      if (txError) {
        toast({ title: 'Error', description: 'No se pudieron eliminar las transacciones asociadas', variant: 'destructive' });
        return;
      }

      // Delete associated savings transactions
      const { error: savingsTxError } = await supabase
        .from('savings_transactions')
        .delete()
        .eq('payment_method_id', id);
      if (savingsTxError) {
        toast({ title: 'Error', description: 'No se pudieron eliminar los movimientos de ahorro asociados', variant: 'destructive' });
        return;
      }
    } else if (option === 'transfer' && transferToId) {
      // Get balances
      const { data: pmToDelete } = await supabase.from('payment_methods').select('balance').eq('id', id).single();
      const { data: pmToReceive } = await supabase.from('payment_methods').select('balance').eq('id', transferToId).single();

      if (pmToDelete && pmToReceive) {
        const newBalance = Number(pmToReceive.balance) + Number(pmToDelete.balance);
        await supabase.from('payment_methods').update({ balance: newBalance }).eq('id', transferToId);
      }

      // Update normal transactions
      const { error: txError1 } = await supabase
        .from('transactions')
        .update({ payment_method_id: transferToId })
        .eq('payment_method_id', id);
      if (txError1) {
        toast({ title: 'Error', description: 'No se pudieron transferir las transacciones', variant: 'destructive' });
        return;
      }

      const { error: txError2 } = await supabase
        .from('transactions')
        .update({ to_payment_method_id: transferToId })
        .eq('to_payment_method_id', id);
      if (txError2) {
        toast({ title: 'Error', description: 'No se pudieron transferir las transacciones', variant: 'destructive' });
        return;
      }

      // Update savings transactions
      const { error: savingsTxError } = await supabase
        .from('savings_transactions')
        .update({ payment_method_id: transferToId, savings_account_id: transferToId })
        .or(`payment_method_id.eq.${id},savings_account_id.eq.${id}`);
      if (savingsTxError) {
        toast({ title: 'Error', description: 'No se pudieron transferir las transacciones de ahorro', variant: 'destructive' });
        return;
      }

      // Update loans
      const { error: loansError } = await supabase
        .from('loans')
        .update({ payment_method_id: transferToId })
        .eq('payment_method_id', id);
      if (loansError) {
        toast({ title: 'Error', description: 'No se pudieron transferir los préstamos', variant: 'destructive' });
        return;
      }
    } else if (option === 'orphan') {
      const { error: txError1 } = await supabase
        .from('transactions')
        .update({ payment_method_id: null })
        .eq('payment_method_id', id);
      if (txError1) {
        toast({ title: 'Error', description: 'No se pudieron desasociar las transacciones', variant: 'destructive' });
        return;
      }

      const { error: txError2 } = await supabase
        .from('transactions')
        .update({ to_payment_method_id: null })
        .eq('to_payment_method_id', id);
      if (txError2) {
        toast({ title: 'Error', description: 'No se pudieron desasociar las transacciones de destino', variant: 'destructive' });
        return;
      }

      const { error: savingsTxError } = await supabase
        .from('savings_transactions')
        .update({ payment_method_id: null, savings_account_id: null })
        .or(`payment_method_id.eq.${id},savings_account_id.eq.${id}`);
      if (savingsTxError) {
        toast({ title: 'Error', description: 'No se pudieron desasociar los movimientos de ahorro', variant: 'destructive' });
        return;
      }

      const { error: loansError } = await supabase
        .from('loans')
        .update({ payment_method_id: null })
        .eq('payment_method_id', id);
      if (loansError) {
        toast({ title: 'Error', description: 'No se pudieron desasociar los préstamos', variant: 'destructive' });
        return;
      }
    }

    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la cuenta', variant: 'destructive' });
      return;
    }

    setSavingsAccounts(prev => prev.filter(a => a.id !== id));
    setSavingsTransactions(prev => prev.filter(t => t.payment_method_id !== id));
    toast({ title: 'Eliminado', description: 'Cuenta de ahorro eliminada' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    queryClient.invalidateQueries({ queryKey: ['savings_transactions', user.id] });
  };


  const addSavingsTransaction = async (transaction: Omit<SavingsTransaction, 'id'>) => {
    if (!user) { return { error: 'No autenticado' }; }

    // 0. Debit/Balance Validation
    const account = savingsAccounts.find(a => a.id === transaction.payment_method_id);
    if (account && transaction.type === 'withdrawal' && Number(account.balance) < Number(transaction.amount)) {
      toast({
        title: 'Error: Saldo insuficiente',
        description: 'El gasto es mayor al dinero disponible',
        variant: 'destructive',
      });
      return { error: 'Saldo insuficiente' };
    }

    // 1. Calculate new balance
    const balanceChange = (transaction.type === 'withdrawal') ? -Number(transaction.amount) : Number(transaction.amount);
    const newBalance = (account?.balance || 0) + balanceChange;

    // 2. Insert into savings_transactions table (calculated_yield is handled by DB trigger)
    const { data: insertData, error: insertError } = await supabase
      .from('savings_transactions')
      .insert({
        user_id: user.id,
        payment_method_id: transaction.payment_method_id,
        savings_account_id: transaction.payment_method_id, // Redundant but required by schema
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || undefined,
        date: transaction.date,
        balance_after_transaction: newBalance,
      } satisfies Database['public']['Tables']['savings_transactions']['Insert'])
      .select()
      .single();

    if (insertError) {

      toast({ title: 'Error', description: 'No se pudo agregar la transacción', variant: 'destructive' });
      return { error: insertError };
    }

    // 3. Update account balance in payment_methods
    if (account) {
      const { error: pmError } = await supabase
        .from('payment_methods')
        .update({ balance: newBalance })
        .eq('id', transaction.payment_method_id);

      if (pmError) {
        toast({ title: 'Error', description: 'No se pudo actualizar el saldo de la cuenta', variant: 'destructive' });
        return { error: pmError };
      }

      setSavingsAccounts(prev => prev.map(a =>
        a.id === transaction.payment_method_id ? { ...a, balance: newBalance } : a
      ));
    }

    // 4. Update local state (calculated_yield comes from DB trigger)
    setSavingsTransactions(prev => [{
      id: insertData.id,
      payment_method_id: insertData.payment_method_id,
      savings_account_id: insertData.savings_account_id,
      type: transaction.type,
      amount: Number(insertData.amount),
      date: insertData.date,
      description: insertData.description || undefined,
      calculated_yield: insertData.calculated_yield ? Number(insertData.calculated_yield) : 0,
      balance_after_transaction: newBalance,
    }, ...prev]);

    toast({ title: 'Éxito', description: 'Transacción agregada correctamente' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    return { error: null };
  };

  const updateSavingsTransaction = async (id: string, newAmount: number) => {
    if (!user) { return { error: 'No autenticado' }; }

    // 1. Get current transaction
    const oldTx = savingsTransactions.find(t => t.id === id);
    if (!oldTx) { return { error: 'Transacción no encontrada' }; }

    const account = savingsAccounts.find(a => a.id === oldTx.payment_method_id);
    if (!account) { return { error: 'Cuenta no encontrada' }; }

    // 2. Calculate balance difference
    const oldContribution = (oldTx.type === 'withdrawal') ? -oldTx.amount : oldTx.amount;
    const newContribution = (oldTx.type === 'withdrawal') ? -newAmount : newAmount;
    const diff = newContribution - oldContribution;
    const newAccountBalance = account.balance + diff;

    // 3. Update savings_transactions table (calculated_yield handled by DB trigger)
    const { data: updatedData, error: txError } = await supabase
      .from('savings_transactions')
      .update({
        amount: newAmount,
        balance_after_transaction: newAccountBalance,
      })
      .eq('id', id)
      .select()
      .single();

    if (txError) {
      toast({ title: 'Error', description: 'No se pudo actualizar la transacción', variant: 'destructive' });
      return { error: txError };
    }

    // 4. Update payment method balance
    const { error: pmError } = await supabase
      .from('payment_methods')
      .update({ balance: newAccountBalance })
      .eq('id', account.id);

    if (pmError) {
      toast({ title: 'Error', description: 'No se pudo actualizar el saldo de la cuenta', variant: 'destructive' });
      return { error: pmError };
    }

    // 5. Update local state (calculated_yield from DB trigger)
    setSavingsAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newAccountBalance } : a));
    setSavingsTransactions(prev => prev.map(t => t.id === id ? {
      ...t,
      amount: newAmount,
      calculated_yield: updatedData?.calculated_yield ? Number(updatedData.calculated_yield) : 0,
      balance_after_transaction: newAccountBalance,
    } : t));

    toast({ title: 'Actualizado', description: 'Transacción y saldo de cuenta actualizados' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    return { error: null };
  };

  const updateSavingsTransactionFull = async (id: string, updates: {
    amount?: number;
    date?: string;
    description?: string;
    type?: 'deposit' | 'withdrawal' | 'interest';
    payment_method_id?: string;
    savings_account_id?: string;
  }) => {
    if (!user) { return { error: 'No autenticado' }; }

    // 1. Get current transaction
    const oldTx = savingsTransactions.find(t => t.id === id);
    if (!oldTx) { return { error: 'Transacción no encontrada' }; }

    const oldAccount = savingsAccounts.find(a => a.id === oldTx.payment_method_id);
    if (!oldAccount) { return { error: 'Cuenta no encontrada' }; }

    // Use new values or keep old ones
    const newAmount = updates.amount ?? oldTx.amount;
    const newType = updates.type ?? oldTx.type;
    const newAccountId = updates.payment_method_id ?? oldTx.payment_method_id;
    const newDate = updates.date ?? oldTx.date;
    const newDescription = updates.description ?? oldTx.description;

    // 2. Calculate balance differences for accounts involved
    const oldContribution = (oldTx.type === 'withdrawal') ? -oldTx.amount : oldTx.amount;
    const newContribution = (newType === 'withdrawal') ? -newAmount : newAmount;
    const oldAccountDiff = newContribution - oldContribution;

    // 3. Calculate new balance for old account
    const newOldAccountBalance = oldAccount.balance + oldAccountDiff;

    // 4. Update transaction in savings_transactions table (calculated_yield handled by DB trigger)
    const { data: updatedData, error: txError } = await supabase
      .from('savings_transactions')
      .update({
        amount: newAmount,
        date: newDate,
        description: newDescription || undefined,
        type: newType,
        payment_method_id: newAccountId,
        savings_account_id: newAccountId,
        balance_after_transaction: newAccountId === oldTx.payment_method_id ? newOldAccountBalance : undefined,
      })
      .eq('id', id)
      .select()
      .single();

    if (txError) {
      toast({ title: 'Error', description: 'No se pudo actualizar la transacción', variant: 'destructive' });
      return { error: txError };
    }

    // 5. Update balances for affected accounts
    const { error: pmError1 } = await supabase
      .from('payment_methods')
      .update({ balance: newOldAccountBalance })
      .eq('id', oldAccount.id);

    if (pmError1) {
      toast({ title: 'Error', description: 'No se pudo actualizar el saldo de la cuenta', variant: 'destructive' });
      return { error: pmError1 };
    }

    // If account changed, also update new account
    if (newAccountId !== oldTx.payment_method_id) {
      const newAccount = savingsAccounts.find(a => a.id === newAccountId);
      if (!newAccount) { return { error: 'Nueva cuenta no encontrada' }; }

      const newAccountBalance = newAccount.balance + newContribution;
      const { error: pmError2 } = await supabase
        .from('payment_methods')
        .update({ balance: newAccountBalance })
        .eq('id', newAccountId);

      if (pmError2) {
        toast({ title: 'Error', description: 'No se pudo actualizar el saldo de la nueva cuenta', variant: 'destructive' });
        return { error: pmError2 };
      }

      setSavingsAccounts(prev => prev.map(a => {
        if (a.id === oldAccount.id) { return { ...a, balance: newOldAccountBalance }; }
        if (a.id === newAccountId) { return { ...a, balance: newAccountBalance }; }
        return a;
      }));
    } else {
      setSavingsAccounts(prev => prev.map(a => a.id === oldAccount.id ? { ...a, balance: newOldAccountBalance } : a));
    }

    // 6. Update local state (calculated_yield from DB trigger)
    setSavingsTransactions(prev => prev.map(t => t.id === id ? {
      ...t,
      amount: newAmount,
      date: newDate,
      description: newDescription,
      type: newType,
      payment_method_id: newAccountId,
      savings_account_id: newAccountId,
      calculated_yield: updatedData?.calculated_yield ? Number(updatedData.calculated_yield) : 0,
      balance_after_transaction: newOldAccountBalance,
    } : t));

    toast({ title: 'Actualizado', description: 'Transacción actualizada correctamente' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    return { error: null };
  };

  const deleteSavingsTransaction = async (id: string) => {
    if (!user) { return; }

    // 1. Get current transaction to rollback balance
    const tx = savingsTransactions.find(t => t.id === id);
    if (!tx) {
      toast({ title: 'Error', description: 'Transacción no encontrada', variant: 'destructive' });
      return;
    }

    const account = savingsAccounts.find(a => a.id === tx.payment_method_id);
    if (!account) {
      toast({ title: 'Error', description: 'Cuenta no encontrada', variant: 'destructive' });
      return;
    }

    // 2. Calculate balance rollback (reverse the transaction)
    const balanceChange = (tx.type === 'withdrawal') ? tx.amount : -tx.amount;
    const newBalance = account.balance + balanceChange;

    // 3. Delete from savings_transactions table
    const { error: deleteError } = await supabase
      .from('savings_transactions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast({ title: 'Error', description: 'No se pudo eliminar la transacción', variant: 'destructive' });
      return;
    }

    // 4. Update payment method balance
    const { error: balanceError } = await supabase
      .from('payment_methods')
      .update({ balance: newBalance })
      .eq('id', tx.payment_method_id);

    if (balanceError) {
      toast({ title: 'Error', description: 'No se pudo actualizar el saldo', variant: 'destructive' });
      return;
    }

    // 5. Update local state
    setSavingsTransactions(prev => prev.filter(t => t.id !== id));
    setSavingsAccounts(prev => prev.map(a =>
      a.id === tx.payment_method_id ? { ...a, balance: newBalance } : a
    ));

    toast({ title: 'Eliminado', description: 'Transacción eliminada correctamente' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
  };

  // Performance calculations
  const accountPerformance = useMemo(() => {
    return savingsAccounts.map(account => {
      const accountTransactions = savingsTransactions.filter(t => t.payment_method_id === account.id);

      const totalDeposits = accountTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalWithdrawals = accountTransactions
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalInterest = accountTransactions
        .filter(t => t.type === 'interest')
        .reduce((sum, t) => sum + t.amount, 0);

      const netContributions = totalDeposits - totalWithdrawals;
      const performancePercent = netContributions > 0
        ? ((account.balance - netContributions) / netContributions) * 100
        : 0;

      return {
        ...account,
        totalDeposits,
        totalWithdrawals,
        totalInterest,
        netContributions,
        performancePercent,
        transactionCount: accountTransactions.length,
      };
    });
  }, [savingsAccounts, savingsTransactions]);

  const totalSavingsBalance = useMemo(() => {
    return savingsAccounts.reduce((sum, a) => sum + a.balance, 0);
  }, [savingsAccounts]);

  return {
    savingsAccounts,
    savingsTransactions,
    loading,
    bootLoading: loading && savingsAccounts.length === 0 && savingsTransactions.length === 0,
    error,
    addSavingsAccount,
    deleteSavingsAccount,
    addSavingsTransaction,
    updateSavingsTransaction,
    updateSavingsTransactionFull,
    deleteSavingsTransaction,
    accountPerformance,
    totalSavingsBalance,
    refetch: () => fetchData(),
  };
}

