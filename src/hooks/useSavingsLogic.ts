import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethodRow, TransactionRow, TransactionType } from './financeTypes';
import { SavingsAccount, SavingsTransaction } from './useSavingsData';



export function useSavingsDataLogic() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate previous balance for yield percentage calculation
  const calculatePreviousSavingsBalance = useCallback(async (paymentMethodId: string, beforeDate: string): Promise<number> => {
    if (!user) return 0;

    const { data: priorTxs } = await supabase
      .from('savings_transactions')
      .select('type, amount')
      .eq('payment_method_id', paymentMethodId)
      .eq('user_id', user.id)
      .lt('date', beforeDate)
      .order('date', { ascending: true });

    if (!priorTxs) return 0;

    return priorTxs.reduce((balance, tx) => {
      const amount = Number(tx.amount);
      if (tx.type === 'withdrawal') return balance - amount;
      return balance + amount; // deposit or interest
    }, 0);
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
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

    const accounts = accountsData.map((a: PaymentMethodRow) => ({
      id: a.id,
      name: a.name,
      balance: Number(a.balance),
      interest_rate: a.estimated_yield ? Number(a.estimated_yield) : 0,
      estimated_yield: a.estimated_yield ? Number(a.estimated_yield) : 0,
      savings_goal: a.savings_goal ? Number(a.savings_goal) : null,
    }));

    setSavingsAccounts(accounts);

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
        const mappedTransactions = transactionsData.map((t: any) => ({
          id: t.id,
          payment_method_id: t.payment_method_id,
          type: t.type,
          amount: Number(t.amount),
          date: t.date,
          description: t.description || undefined,
          calculated_yield: t.calculated_yield ? Number(t.calculated_yield) : null,
          balance_after_transaction: t.balance_after_transaction ? Number(t.balance_after_transaction) : null,
        }));
        setSavingsTransactions(mappedTransactions);
      }
    } else {
      setSavingsTransactions([]);
      setError(null);
    }

    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      setSavingsAccounts([]);
      setSavingsTransactions([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [user, fetchData]);

  const addSavingsAccount = async (account: { name: string; balance?: number; interest_rate?: number; estimated_yield?: number; savings_goal?: number }) => {
    if (!user) return { error: 'No autenticado' };

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
      } as any) // Use any cast to avoid complexity with Insert type matching if stricter than logic
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
      savings_goal: row.savings_goal ? Number(row.savings_goal) : null,
    }]);

    toast({ title: 'Éxito', description: 'Cuenta de ahorro creada' });
    return { error: null, data };
  };

  const deleteSavingsAccount = async (id: string) => {
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
  };

  const addSavingsTransaction = async (transaction: Omit<SavingsTransaction, 'id'>) => {
    if (!user) return { error: 'No autenticado' };

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
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || undefined,
        date: transaction.date,
        balance_after_transaction: newBalance,
      } as any)
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
      type: transaction.type,
      amount: Number(insertData.amount),
      date: insertData.date,
      description: insertData.description || undefined,
      calculated_yield: insertData.calculated_yield ? Number(insertData.calculated_yield) : 0,
      balance_after_transaction: newBalance,
    }, ...prev]);

    toast({ title: 'Éxito', description: 'Transacción agregada correctamente' });
    return { error: null };
  };

  const updateSavingsTransaction = async (id: string, newAmount: number) => {
    if (!user) return { error: 'No autenticado' };

    // 1. Get current transaction
    const oldTx = savingsTransactions.find(t => t.id === id);
    if (!oldTx) return { error: 'Transacción no encontrada' };

    const account = savingsAccounts.find(a => a.id === oldTx.payment_method_id);
    if (!account) return { error: 'Cuenta no encontrada' };

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
    return { error: null };
  };

  const updateSavingsTransactionFull = async (id: string, updates: {
    amount?: number;
    date?: string;
    description?: string;
    type?: 'deposit' | 'withdrawal' | 'interest';
    payment_method_id?: string;
  }) => {
    if (!user) return { error: 'No autenticado' };

    // 1. Get current transaction
    const oldTx = savingsTransactions.find(t => t.id === id);
    if (!oldTx) return { error: 'Transacción no encontrada' };

    const oldAccount = savingsAccounts.find(a => a.id === oldTx.payment_method_id);
    if (!oldAccount) return { error: 'Cuenta no encontrada' };

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
      if (!newAccount) return { error: 'Nueva cuenta no encontrada' };

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
        if (a.id === oldAccount.id) return { ...a, balance: newOldAccountBalance };
        if (a.id === newAccountId) return { ...a, balance: newAccountBalance };
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
      calculated_yield: updatedData?.calculated_yield ? Number(updatedData.calculated_yield) : 0,
      balance_after_transaction: newOldAccountBalance,
    } : t));

    toast({ title: 'Actualizado', description: 'Transacción actualizada correctamente' });
    return { error: null };
  };

  const deleteSavingsTransaction = async (id: string) => {
    if (!user) return;

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
    error,
    addSavingsAccount,
    deleteSavingsAccount,
    addSavingsTransaction,
    updateSavingsTransaction,
    updateSavingsTransactionFull,
    deleteSavingsTransaction,
    accountPerformance,
    totalSavingsBalance,
    refetch: fetchData,
  };
}