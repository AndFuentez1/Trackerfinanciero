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
import {
  deletePaymentMethodAtomic,
  withBalanceChanges,
  type BalanceChange,
  type DeletePaymentMethodOption,
} from '@/features/finance/utils/balanceUtils';

/** Efecto de un movimiento de ahorro en el saldo de la cuenta: los retiros restan. */
const savingsContribution = (type: SavingsTransaction['type'], amount: number): number =>
  type === 'withdrawal' ? -Number(amount) : Number(amount);

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

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

  const deleteSavingsAccount = async (id: string, option: DeletePaymentMethodOption = 'orphan', transferToId?: string) => {
    if (!user) { return; }

    // Todo en una transacción en el servidor: si un paso falla no queda nada a medias.
    try {
      await deletePaymentMethodAtomic(id, option, transferToId);
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err, 'No se pudo eliminar la cuenta'), variant: 'destructive' });
      return;
    }

    setSavingsAccounts(prev => {
      const removed = prev.find(a => a.id === id);
      return prev
        .filter(a => a.id !== id)
        .map(a => (option === 'transfer' && removed && a.id === transferToId
          ? { ...a, balance: a.balance + removed.balance }
          : a));
    });
    setSavingsTransactions(prev => (option === 'transfer' && transferToId
      ? prev.map(t => (t.payment_method_id === id ? { ...t, payment_method_id: transferToId, savings_account_id: transferToId } : t))
      : prev.filter(t => t.payment_method_id !== id)));
    toast({ title: 'Eliminado', description: 'Cuenta de ahorro eliminada' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactions(user.id) });
    queryClient.invalidateQueries({ queryKey: ['savings_transactions', user.id] });
  };


  const addSavingsTransaction = async (transaction: Omit<SavingsTransaction, 'id'>) => {
    if (!user) { return { error: 'No autenticado' }; }

    // 0. Validación rápida con el saldo local (el servidor vuelve a validarlo con el CHECK de saldo)
    const account = savingsAccounts.find(a => a.id === transaction.payment_method_id);
    if (account && transaction.type === 'withdrawal' && Number(account.balance) < Number(transaction.amount)) {
      toast({
        title: 'Error: Saldo insuficiente',
        description: 'El gasto es mayor al dinero disponible',
        variant: 'destructive',
      });
      return { error: 'Saldo insuficiente' };
    }

    const changes: BalanceChange[] = account
      ? [{ id: account.id, delta: savingsContribution(transaction.type, transaction.amount) }]
      : [];

    try {
      // 1. Saldo atómico en servidor; el saldo resultante es la base real (no el local).
      const { insertData, newBalance } = await withBalanceChanges(changes, async (balances) => {
        const balanceAfter = account ? balances.get(account.id) ?? account.balance : undefined;

        // 2. Movimiento de ahorro (calculated_yield lo calcula un trigger)
        const { data, error: insertError } = await supabase
          .from('savings_transactions')
          .insert({
            user_id: user.id,
            payment_method_id: transaction.payment_method_id,
            savings_account_id: transaction.payment_method_id, // Redundant but required by schema
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description || undefined,
            date: transaction.date,
            balance_after_transaction: balanceAfter,
          } satisfies Database['public']['Tables']['savings_transactions']['Insert'])
          .select()
          .single();
        if (insertError) { throw insertError; }
        return { insertData: data, newBalance: balanceAfter };
      });

      if (account && newBalance !== undefined) {
        setSavingsAccounts(prev => prev.map(a =>
          a.id === account.id ? { ...a, balance: newBalance } : a
        ));
      }

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
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err, 'No se pudo agregar la transacción'), variant: 'destructive' });
      return { error: err };
    }

    toast({ title: 'Éxito', description: 'Transacción agregada correctamente' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    return { error: null };
  };

  const updateSavingsTransaction = async (id: string, newAmount: number) => {
    if (!user) { return { error: 'No autenticado' }; }

    const oldTx = savingsTransactions.find(t => t.id === id);
    if (!oldTx) { return { error: 'Transacción no encontrada' }; }

    const account = savingsAccounts.find(a => a.id === oldTx.payment_method_id);
    if (!account) { return { error: 'Cuenta no encontrada' }; }

    const diff = savingsContribution(oldTx.type, newAmount) - savingsContribution(oldTx.type, oldTx.amount);

    try {
      const { updatedData, newBalance } = await withBalanceChanges(
        [{ id: account.id, delta: diff }],
        async (balances) => {
          const balanceAfter = balances.get(account.id) ?? account.balance;
          const { data, error: txError } = await supabase
            .from('savings_transactions')
            .update({ amount: newAmount, balance_after_transaction: balanceAfter })
            .eq('id', id)
            .select()
            .single();
          if (txError) { throw txError; }
          return { updatedData: data, newBalance: balanceAfter };
        }
      );

      setSavingsAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
      setSavingsTransactions(prev => prev.map(t => t.id === id ? {
        ...t,
        amount: newAmount,
        calculated_yield: updatedData?.calculated_yield ? Number(updatedData.calculated_yield) : 0,
        balance_after_transaction: newBalance,
      } : t));
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err, 'No se pudo actualizar la transacción'), variant: 'destructive' });
      return { error: err };
    }

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

    const oldTx = savingsTransactions.find(t => t.id === id);
    if (!oldTx) { return { error: 'Transacción no encontrada' }; }

    const oldAccount = savingsAccounts.find(a => a.id === oldTx.payment_method_id);
    if (!oldAccount) { return { error: 'Cuenta no encontrada' }; }

    const newAmount = updates.amount ?? oldTx.amount;
    const newType = updates.type ?? oldTx.type;
    const newAccountId = updates.payment_method_id ?? oldAccount.id;
    const newDate = updates.date ?? oldTx.date;
    const newDescription = updates.description ?? oldTx.description;

    if (newAccountId !== oldAccount.id && !savingsAccounts.some(a => a.id === newAccountId)) {
      return { error: 'Nueva cuenta no encontrada' };
    }

    // Revertir el efecto en la cuenta vieja y aplicar el nuevo en la cuenta destino
    // (si es la misma cuenta, mergeBalanceChanges los combina en un solo delta).
    const changes: BalanceChange[] = [
      { id: oldAccount.id, delta: -savingsContribution(oldTx.type, oldTx.amount) },
      { id: newAccountId, delta: savingsContribution(newType, newAmount) },
    ];

    try {
      const { updatedData, balances } = await withBalanceChanges(changes, async (result) => {
        const { data, error: txError } = await supabase
          .from('savings_transactions')
          .update({
            amount: newAmount,
            date: newDate,
            description: newDescription || undefined,
            type: newType,
            payment_method_id: newAccountId,
            savings_account_id: newAccountId,
            balance_after_transaction: result.get(newAccountId),
          })
          .eq('id', id)
          .select()
          .single();
        if (txError) { throw txError; }
        return { updatedData: data, balances: result };
      });

      setSavingsAccounts(prev => prev.map(a => {
        const balance = balances.get(a.id);
        return balance === undefined ? a : { ...a, balance };
      }));
      setSavingsTransactions(prev => prev.map(t => t.id === id ? {
        ...t,
        amount: newAmount,
        date: newDate,
        description: newDescription,
        type: newType,
        payment_method_id: newAccountId,
        savings_account_id: newAccountId,
        calculated_yield: updatedData?.calculated_yield ? Number(updatedData.calculated_yield) : 0,
        balance_after_transaction: balances.get(newAccountId) ?? t.balance_after_transaction,
      } : t));
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err, 'No se pudo actualizar la transacción'), variant: 'destructive' });
      return { error: err };
    }

    toast({ title: 'Actualizado', description: 'Transacción actualizada correctamente' });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(user.id) });
    return { error: null };
  };

  const deleteSavingsTransaction = async (id: string) => {
    if (!user) { return; }

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

    try {
      // Revertir el movimiento en el saldo y borrarlo; si el borrado falla, se revierte el saldo.
      const balances = await withBalanceChanges(
        [{ id: account.id, delta: -savingsContribution(tx.type, tx.amount) }],
        async (result) => {
          const { error: deleteError } = await supabase
            .from('savings_transactions')
            .delete()
            .eq('id', id);
          if (deleteError) { throw deleteError; }
          return result;
        }
      );

      const newBalance = balances.get(account.id);
      setSavingsTransactions(prev => prev.filter(t => t.id !== id));
      if (newBalance !== undefined) {
        setSavingsAccounts(prev => prev.map(a =>
          a.id === account.id ? { ...a, balance: newBalance } : a
        ));
      }
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err, 'No se pudo eliminar la transacción'), variant: 'destructive' });
      return;
    }

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
      // Si se retiró más de lo aportado (p. ej. saldo inicial sin depósito registrado),
      // el rendimiento se mide como intereses sobre el capital actual sin intereses.
      const principalWithoutInterest = account.balance - totalInterest;
      const performancePercent = netContributions > 0
        ? ((account.balance - netContributions) / netContributions) * 100
        : principalWithoutInterest > 0
          ? (totalInterest / principalWithoutInterest) * 100
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

