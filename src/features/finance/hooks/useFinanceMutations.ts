/**
 * useFinanceMutations Hook
 * 
 * Manages all CRUD operations and actions:
 * - Transactions (add, update, delete, bulk)
 * - Categories (add, update, delete, initialize)
 * - Payment Methods (add, update, delete, recalculate)
 * - Budgets (add, delete)
 * - Imports (start, cancel, confirm)
 * - Profile/Currency (convert)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { queryKeys } from '@/core/api/queryKeys';
import type {
    Transaction,
    TransactionType,
    PaymentMethodType,
    PaymentMethod,
    Budget,
    CategoryItem
} from '../types/financeTypes';

export function useFinanceMutations(userId: string | undefined) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const invalidateFinance = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    };

    const invalidateTransactions = () => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactions(userId) });
        queryClient.invalidateQueries({ queryKey: ['finance', 'allTransactions', userId] });
    };

    const invalidateCategories = () => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.categories(userId) });
    };

    const invalidatePaymentMethods = () => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(userId) });
    };

    const invalidateBudgets = () => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.budgets(userId) });
    };

    // 1. Transaction Mutations
    const addTransaction = useMutation({
        mutationFn: async (txn: Omit<Transaction, 'id' | 'created_at'>) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Remove frontend-only fields like 'installments' if they don't exist in DB
            const { installments, ...dbData } = txn as any;

            const { data, error } = await supabase.from('transactions')
                .insert([{ ...dbData, user_id: userId }])
                .select();

            if (error) { throw error; }
            if (!data || data.length === 0) { throw new Error('No data returned'); }

            // Auto-update Payment Method Balance (No Trigger fallback)
            if (dbData.payment_method_id) {
                const { data: pm } = await supabase
                    .from('payment_methods')
                    .select('balance')
                    .eq('id', dbData.payment_method_id)
                    .single();

                if (pm) {
                    const amount = Number(dbData.amount);
                    const isIncome = dbData.type === 'income';
                    const newBalance = isIncome ? pm.balance + amount : pm.balance - amount;

                    await supabase
                        .from('payment_methods')
                        .update({ balance: newBalance })
                        .eq('id', dbData.payment_method_id);
                }
            }

            return data[0];
        },
        onSuccess: () => {
            invalidateTransactions();
            invalidatePaymentMethods();
            toast({ title: 'Éxito', description: 'Transacción añadida.' });
        },
        onError: (error) => toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    });

    const updateTransaction = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<Transaction> }) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            const { installments, ...dbUpdates } = updates as any;

            // 1. Get old transaction to revert balance
            const { data: oldTxn } = await supabase
                .from('transactions')
                .select('amount, type, payment_method_id')
                .eq('id', id)
                .single();

            // 2. Update Transaction
            const { error } = await supabase.from('transactions')
                .update(dbUpdates)
                .eq('id', id);
            if (error) { throw error; }

            // 3. Handle Balance Updates
            if (oldTxn && oldTxn.payment_method_id) {
                const { data: oldPm } = await supabase.from('payment_methods').select('balance').eq('id', oldTxn.payment_method_id).single();
                if (oldPm) {
                    const reverseAmount = oldTxn.type === 'income' ? -oldTxn.amount : oldTxn.amount;
                    await supabase.from('payment_methods').update({ balance: oldPm.balance + reverseAmount }).eq('id', oldTxn.payment_method_id);
                }
            }

            const newPmId = dbUpdates.payment_method_id || (oldTxn ? oldTxn.payment_method_id : null);
            const newAmount = dbUpdates.amount !== undefined ? Number(dbUpdates.amount) : (oldTxn ? oldTxn.amount : 0);
            const newType = dbUpdates.type || (oldTxn ? oldTxn.type : 'expense');

            if (newPmId) {
                const { data: newPm } = await supabase.from('payment_methods').select('balance').eq('id', newPmId).single();
                if (newPm) {
                    const applyAmount = newType === 'income' ? newAmount : -newAmount;
                    await supabase.from('payment_methods').update({ balance: newPm.balance + applyAmount }).eq('id', newPmId);
                }
            }
        },
        onSuccess: () => {
            invalidateTransactions();
            invalidatePaymentMethods();
            toast({ title: 'Éxito', description: 'Transacción actualizada.' });
        }
    });

    const deleteTransaction = useMutation({
        mutationFn: async (id: string) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Get transaction details before deleting to revert balance
            const { data: txn } = await supabase
                .from('transactions')
                .select('amount, type, payment_method_id')
                .eq('id', id)
                .single();

            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) { throw error; }

            // Revert balance impact
            if (txn && txn.payment_method_id) {
                const { data: pm } = await supabase
                    .from('payment_methods')
                    .select('balance')
                    .eq('id', txn.payment_method_id)
                    .single();

                if (pm) {
                    const reverseAmount = txn.type === 'income' ? -txn.amount : txn.amount;
                    await supabase
                        .from('payment_methods')
                        .update({ balance: pm.balance + reverseAmount })
                        .eq('id', txn.payment_method_id);
                }
            }
        },
        onSuccess: () => {
            invalidateTransactions();
            invalidatePaymentMethods();
            toast({ title: 'Éxito', description: 'Transacción eliminada.' });
        }
    });

    // 2. Category Mutations
    const addCategoryMutation = useMutation({
        mutationFn: async (cat: { name: string, type: TransactionType, color: string }) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            const { data, error } = await supabase.from('categories')
                .insert([{
                    name: cat.name,
                    type: cat.type,
                    color: cat.color,
                    user_id: userId
                }])
                .select()
                .single();
            if (error) { throw error; }
            if (!data) { throw new Error('No data returned'); }
            return data as CategoryItem;
        },
        onSuccess: () => invalidateCategories()
    });

    const initializeDefaultCategories = useMutation({
        mutationFn: async (defaultCategories: Omit<CategoryItem, 'id'>[]) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            const { data: existing, error: existingError } = await supabase
                .from('categories')
                .select('name, type')
                .eq('user_id', userId);
            if (existingError) { throw existingError; }

            const existingKey = new Set(
                (existing ?? []).map(cat => `${cat.name}`.toLowerCase() + '|' + `${cat.type}`.toLowerCase())
            );
            const categoriesToInsert = defaultCategories
                .filter(cat => !existingKey.has(`${cat.name}`.toLowerCase() + '|' + `${cat.type}`.toLowerCase()))
                .slice(0, 10)
                .map(cat => ({
                    name: cat.name,
                    type: cat.type,
                    color: cat.color || '#475569',
                    user_id: userId
                }));

            if (categoriesToInsert.length === 0) { return; }

            const { error } = await supabase.from('categories')
                .upsert(categoriesToInsert, { onConflict: 'user_id, name' });
            if (error) { throw error; }
        },
        onSuccess: () => {
            invalidateCategories();
            toast({ title: 'Éxito', description: 'Categorías iniciales creadas.' });
        }
    });

    const addPaymentMethodMutation = useMutation({
        mutationFn: async (pm: Omit<PaymentMethod, 'id'>) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Explicitly pick allowed columns for DB
            const dbData = {
                user_id: userId,
                name: pm.name,
                type: pm.type,
                balance: pm.balance,
                credit_limit: pm.credit_limit,
                is_savings_account: pm.is_savings_account,
                savings_goal: pm.savings_goal,
                estimated_yield: pm.estimated_yield,
                closing_date: pm.closing_date,
                payment_day: pm.payment_day,
                color: pm.color
            };

            const { data, error } = await supabase.from('payment_methods')
                .insert([dbData])
                .select()
                .single();
            if (error) { throw error; }
            if (!data) { throw new Error('No data returned'); }
            return data as PaymentMethod;
        },
        onSuccess: () => invalidatePaymentMethods()
    });

    const updatePaymentMethod = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<PaymentMethod> }) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Only update valid columns and ensure id/user_id are not overwritten
            const dbUpdates: any = {};
            const allowed = [
                'name', 'type', 'balance', 'credit_limit',
                'is_savings_account', 'savings_goal', 'estimated_yield',
                'closing_date', 'payment_day', 'color'
            ];

            allowed.forEach(key => {
                if ((updates as any)[key] !== undefined) {
                    dbUpdates[key] = (updates as any)[key];
                }
            });

            const { error } = await supabase.from('payment_methods')
                .update(dbUpdates)
                .eq('id', id);
            if (error) { throw error; }
        },
        onSuccess: () => invalidatePaymentMethods()
    });

    const deletePaymentMethod = useMutation({
        mutationFn: async (id: string) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            const { error } = await supabase.from('payment_methods').delete().eq('id', id);
            if (error) { throw error; }
        },
        onSuccess: () => invalidatePaymentMethods()
    });

    // 4. Budget Mutations
    const addBudget = useMutation({
        mutationFn: async (budget: Omit<Budget, 'id'>) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Filter only valid database columns
            const dbData = {
                user_id: userId,
                category: budget.category,
                category_id: budget.category_id,
                amount: budget.amount,
                month: budget.month
            };

            const { error } = await supabase.from('budgets').upsert(dbData, {
                onConflict: 'user_id,category,month'
            });
            if (error) { throw error; }
        },
        onSuccess: () => invalidateBudgets()
    });

    const deleteBudget = useMutation({
        mutationFn: async (id: string) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            const { error } = await supabase.from('budgets').delete().eq('id', id);
            if (error) { throw error; }
        },
        onSuccess: () => invalidateBudgets()
    });

    // 5. Bulk & Special Actions
    const addTransactionsBulk = useMutation({
        mutationFn: async (transactions: Omit<Transaction, 'id'>[]) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            const dataToInsert = transactions.map(t => {
                const { installments, created_at, ...dbData } = t as any;
                return { ...dbData, user_id: userId };
            });

            const { data, error } = await supabase.from('transactions').insert(dataToInsert).select();
            if (error) { throw error; }
            return { count: data?.length || 0 };
        },
        onSuccess: () => {
            invalidateTransactions();
            const hasPMUpdates = true; // Assume imports might update balances
            if (hasPMUpdates) { invalidatePaymentMethods(); }
            toast({ title: 'Éxito', description: 'Registros importados correctamente.' });
        }
    });

    const addTransfer = useMutation({
        mutationFn: async ({ fromId, toId, amount, date, description }: {
            fromId: string,
            toId: string,
            amount: number,
            date: string,
            description?: string
        }) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Create two transactions: one out, one in
            const transactions = [
                {
                    user_id: userId,
                    type: 'transfer_out' as TransactionType,
                    amount: -Math.abs(amount),
                    date,
                    description: description || 'Transferencia enviada',
                    payment_method_id: fromId,
                    category: 'Transferencia Enviada'
                },
                {
                    user_id: userId,
                    type: 'transfer_in' as TransactionType,
                    amount: Math.abs(amount),
                    date,
                    description: description || 'Transferencia recibida',
                    payment_method_id: toId,
                    category: 'Transferencia Recibida'
                }
            ];

            const { error } = await supabase.from('transactions').insert(transactions);
            if (error) { throw error; }

            // Manual Balance Update for Transfer
            const { data: fromPm } = await supabase.from('payment_methods').select('balance').eq('id', fromId).single();
            if (fromPm) {
                await supabase.from('payment_methods').update({ balance: fromPm.balance - Math.abs(amount) }).eq('id', fromId);
            }

            const { data: toPm } = await supabase.from('payment_methods').select('balance').eq('id', toId).single();
            if (toPm) {
                await supabase.from('payment_methods').update({ balance: toPm.balance + Math.abs(amount) }).eq('id', toId);
            }
        },
        onSuccess: () => {
            invalidateTransactions();
            invalidatePaymentMethods();
            toast({ title: 'Transferencia realizada', description: 'Se han creado ambas transacciones.' });
        }
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<CategoryItem> }) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Only update fields that exist in categories table
            const dbUpdates: any = {};
            if (updates.name !== undefined) { dbUpdates.name = updates.name; }
            if (updates.type !== undefined) { dbUpdates.type = updates.type; }
            if (updates.color !== undefined) { dbUpdates.color = updates.color; }

            const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
            if (error) { throw error; }
        },
        onSuccess: () => invalidateCategories()
    });

    const addTransactionFn = async (txn: Omit<Transaction, 'id' | 'created_at'>) => {
        try {
            const data = await addTransaction.mutateAsync(txn);
            return { error: null, data };
        } catch (error) {
            return { error };
        }
    };

    const updateTransactionFn = async (id: string, updates: Partial<Transaction>) => {
        try {
            await updateTransaction.mutateAsync({ id, updates });
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const deleteTransactionFn = async (id: string) => {
        try {
            await deleteTransaction.mutateAsync(id);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const addTransactionsBulkFn = async (txns: Omit<Transaction, 'id'>[]) => {
        try {
            const result = await addTransactionsBulk.mutateAsync(txns);
            return { error: null, count: result.count };
        } catch (error) {
            return { error, count: 0 };
        }
    };

    const addTransferFn = async (args: { fromId: string, toId: string, amount: number, date: string, description?: string }) => {
        try {
            await addTransfer.mutateAsync(args);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const addPaymentMethodFn = async (pm: Omit<PaymentMethod, 'id'>) => {
        try {
            const data = await addPaymentMethodMutation.mutateAsync(pm);
            return { error: null, data };
        } catch (error) {
            return { error };
        }
    };

    const updatePaymentMethodFn = async (id: string, updates: Partial<PaymentMethod>) => {
        try {
            await updatePaymentMethod.mutateAsync({ id, updates });
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const deletePaymentMethodFn = async (id: string) => {
        try {
            await deletePaymentMethod.mutateAsync(id);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const addBudgetFn = async (budget: Omit<Budget, 'id'>) => {
        try {
            await addBudget.mutateAsync(budget);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const deleteBudgetFn = async (id: string) => {
        try {
            await deleteBudget.mutateAsync(id);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const addCategoryFn = async (cat: { name: string, type: TransactionType, color: string }) => {
        try {
            const data = await addCategoryMutation.mutateAsync(cat);
            return { error: null, data };
        } catch (error) {
            return { error };
        }
    };

    const updateCategoryFn = async (id: string, updates: Partial<CategoryItem>) => {
        try {
            await updateCategoryMutation.mutateAsync({ id, updates });
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) { throw error; }
        },
        onSuccess: () => invalidateCategories()
    });

    const deleteCategoryFn = async (id: string) => {
        try {
            await deleteCategoryMutation.mutateAsync(id);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    return {
        addTransaction: addTransactionFn,
        updateTransaction: updateTransactionFn,
        deleteTransaction: deleteTransactionFn,
        addTransactionsBulk: addTransactionsBulkFn,
        addTransfer: addTransferFn,
        addCategory: addCategoryFn,
        updateCategory: updateCategoryFn,
        deleteCategory: deleteCategoryFn,
        initializeDefaultCategories: initializeDefaultCategories.mutateAsync,
        addPaymentMethod: addPaymentMethodFn,
        updatePaymentMethod: updatePaymentMethodFn,
        deletePaymentMethod: deletePaymentMethodFn,
        addBudget: addBudgetFn,
        deleteBudget: deleteBudgetFn,
    };
}
