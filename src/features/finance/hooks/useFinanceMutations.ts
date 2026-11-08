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

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { queryKeys } from '@/core/api/queryKeys';
import {
    adjustBalances,
    balanceDeltaFor,
    deletePaymentMethodAtomic,
    withBalanceChanges,
    type BalanceChange,
} from '../utils/balanceUtils';
import type {
    Transaction,
    TransactionType,
    PaymentMethodType,
    PaymentMethod,
    Budget,
    CategoryItem,
    StagingTransaction
} from '../types/financeTypes';

export function useFinanceMutations(userId: string | undefined) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const transactionQueriesKey = useMemo(
        () => (userId ? queryKeys.finance.transactions(userId) : null),
        [userId]
    );
    const allTransactionsKey = useMemo(
        () => (userId ? queryKeys.finance.allTransactions(userId) : null),
        [userId]
    );

    const invalidateFinance = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    }, [queryClient]);

    const invalidateTransactions = useCallback(() => {
        if (!transactionQueriesKey || !allTransactionsKey) { return; }
        queryClient.invalidateQueries({ queryKey: transactionQueriesKey });
        queryClient.invalidateQueries({ queryKey: allTransactionsKey });
    }, [queryClient, transactionQueriesKey, allTransactionsKey]);

    const invalidateCategories = useCallback(() => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.categories(userId) });
    }, [queryClient, userId]);

    const invalidatePaymentMethods = useCallback(() => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.paymentMethods(userId) });
    }, [queryClient, userId]);

    const invalidateBudgets = useCallback(() => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.budgets(userId) });
    }, [queryClient, userId]);

    const invalidateStaging = useCallback(() => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.stagingTransactions(userId) });
    }, [queryClient, userId]);

    type TransactionListQueryData = {
        data: Transaction[];
        total: number;
    };

    type TransactionListSnapshot = Array<[
        readonly unknown[],
        TransactionListQueryData | undefined
    ]>;

    const captureTransactionListSnapshots = useCallback((): TransactionListSnapshot => {
        if (!transactionQueriesKey) {
            return [];
        }
        return queryClient.getQueriesData<TransactionListQueryData>({
            queryKey: transactionQueriesKey,
        });
    }, [queryClient, transactionQueriesKey]);

    const restoreTransactionListSnapshots = useCallback((snapshots: TransactionListSnapshot) => {
        snapshots.forEach(([key, value]) => {
            queryClient.setQueryData(key, value);
        });
    }, [queryClient]);

    const updateTransactionListsOptimistically = useCallback(
        (updater: (current: TransactionListQueryData) => TransactionListQueryData) => {
            if (!transactionQueriesKey) { return; }
            queryClient.setQueriesData<TransactionListQueryData>(
                { queryKey: transactionQueriesKey },
                (oldValue) => (oldValue ? updater(oldValue) : oldValue)
            );
        },
        [queryClient, transactionQueriesKey]
    );

    // 1. Transaction Mutations
    const addTransaction = useMutation({
        mutationFn: async (txn: Omit<Transaction, 'id' | 'created_at'>) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Remove frontend-only or protected fields
            const { installments, created_at, ...dbData } = txn as Record<string, unknown> & { installments?: unknown, created_at?: unknown };

            const { data, error } = await supabase.from('transactions')
                .insert([{ ...dbData, user_id: userId }])
                .select();

            if (error) { throw error; }
            if (!data || data.length === 0) { throw new Error('No data returned'); }

            // Saldo de la cuenta: incremento atómico en servidor. Si falla, se deshace la transacción.
            if (dbData.payment_method_id) {
                try {
                    await adjustBalances([{
                        id: String(dbData.payment_method_id),
                        delta: balanceDeltaFor(dbData.type as string, dbData.amount as number),
                    }]);
                } catch (balanceError) {
                    await supabase.from('transactions').delete().eq('id', data[0].id);
                    throw balanceError;
                }
            }

            return data[0];
        },
        onMutate: async (newTxn) => {
            if (transactionQueriesKey) {
                await queryClient.cancelQueries({ queryKey: transactionQueriesKey });
            }
            if (allTransactionsKey) {
                await queryClient.cancelQueries({ queryKey: allTransactionsKey });
            }

            const previousTransactionLists = captureTransactionListSnapshots();
            const previousAllTransactions = allTransactionsKey
                ? queryClient.getQueryData<Transaction[]>(allTransactionsKey)
                : undefined;

            const optimisticTxn: Transaction = {
                id: `temp-${Date.now()}`,
                amount: newTxn.amount,
                type: newTxn.type,
                description: newTxn.description,
                category: newTxn.category,
                category_id: newTxn.category_id || null,
                payment_method_id: newTxn.payment_method_id,
                date: newTxn.date || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                category_name: 'Guardando...',
                payment_method_name: 'Procesando...',
            } as Transaction;

            updateTransactionListsOptimistically((current) => ({
                ...current,
                data: [optimisticTxn, ...current.data],
                total: current.total + 1,
            }));

            if (allTransactionsKey && previousAllTransactions) {
                queryClient.setQueryData<Transaction[]>(
                    allTransactionsKey,
                    [optimisticTxn, ...previousAllTransactions]
                );
            }

            return { previousTransactionLists, previousAllTransactions };
        },
        onError: (err, newTxn, context) => {
            if (context?.previousTransactionLists) {
                restoreTransactionListSnapshots(context.previousTransactionLists);
            }
            if (allTransactionsKey && context?.previousAllTransactions) {
                queryClient.setQueryData(allTransactionsKey, context.previousAllTransactions);
            }
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        },
        onSettled: () => {
            invalidateTransactions();
            invalidatePaymentMethods();
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Transacción añadida.' });
        }
    });

    const updateTransaction = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<Transaction> }) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            const { installments, ...dbUpdates } = updates as Record<string, unknown>;

            // 1. Transacción actual, para revertir su efecto en el saldo
            const { data: oldTxn, error: fetchError } = await supabase
                .from('transactions')
                .select('amount, type, payment_method_id')
                .eq('id', id)
                .single();
            if (fetchError) { throw fetchError; }

            // 2. Cambios de saldo: revertir el efecto viejo y aplicar el nuevo (misma o distinta cuenta).
            // `payment_method_id: null` en updates significa quitar la cuenta.
            const newPmId = dbUpdates.payment_method_id !== undefined
                ? (dbUpdates.payment_method_id as string | null)
                : oldTxn.payment_method_id;
            const newAmount = dbUpdates.amount !== undefined ? Number(dbUpdates.amount) : oldTxn.amount;
            const newType = (dbUpdates.type as string | undefined) ?? oldTxn.type;

            const changes: BalanceChange[] = [];
            if (oldTxn.payment_method_id) {
                changes.push({ id: oldTxn.payment_method_id, delta: -balanceDeltaFor(oldTxn.type, oldTxn.amount) });
            }
            if (newPmId) {
                changes.push({ id: newPmId, delta: balanceDeltaFor(newType, newAmount) });
            }

            // 3. Ajuste atómico + actualización; si la actualización falla, se revierte el saldo.
            await withBalanceChanges(changes, async () => {
                const { error } = await supabase.from('transactions')
                    .update(dbUpdates)
                    .eq('id', id);
                if (error) { throw error; }
            });
        },
        onMutate: async ({ id, updates }) => {
            // Cancel any outgoing refetches so they don't overwrite our optimistic update
            if (transactionQueriesKey) {
                await queryClient.cancelQueries({ queryKey: transactionQueriesKey });
            }
            if (allTransactionsKey) {
                await queryClient.cancelQueries({ queryKey: allTransactionsKey });
            }

            // Snapshot the previous value
            const previousTransactionLists = captureTransactionListSnapshots();
            const previousAllTransactions = allTransactionsKey
                ? queryClient.getQueryData<Transaction[]>(allTransactionsKey)
                : undefined;

            // Optimistically update to the new value
            updateTransactionListsOptimistically((current) => ({
                ...current,
                data: current.data.map((tx) =>
                    tx.id === id
                        ? {
                            ...tx,
                            ...updates,
                            category_name: updates.category_id ? 'Actualizada(Oculta)' : tx.category_name,
                            payment_method_name: updates.payment_method_id ? 'Actualizada(Oculta)' : tx.payment_method_name,
                        }
                        : tx
                ),
            }));

            if (allTransactionsKey && previousAllTransactions) {
                queryClient.setQueryData<Transaction[]>(
                    allTransactionsKey,
                    previousAllTransactions.map((tx) =>
                        tx.id === id
                            ? {
                                ...tx,
                                ...updates,
                                category_name: updates.category_id ? 'Actualizada(Oculta)' : tx.category_name,
                                payment_method_name: updates.payment_method_id ? 'Actualizada(Oculta)' : tx.payment_method_name,
                            }
                            : tx
                    )
                );
            }

            return { previousTransactionLists, previousAllTransactions };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTransactionLists) {
                restoreTransactionListSnapshots(context.previousTransactionLists);
            }
            if (allTransactionsKey && context?.previousAllTransactions) {
                queryClient.setQueryData(allTransactionsKey, context.previousAllTransactions);
            }
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        },
        onSettled: () => {
            invalidateTransactions();
            invalidatePaymentMethods();
        },
        onSuccess: () => {
            toast({ title: 'Éxito', description: 'Transacción actualizada.' });
        }
    });

    const deleteTransaction = useMutation({
        mutationFn: async (id: string) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Transacción a borrar, para revertir su efecto en el saldo
            const { data: txn, error: fetchError } = await supabase
                .from('transactions')
                .select('amount, type, payment_method_id')
                .eq('id', id)
                .single();
            if (fetchError) { throw fetchError; }

            const changes: BalanceChange[] = txn.payment_method_id
                ? [{ id: txn.payment_method_id, delta: -balanceDeltaFor(txn.type, txn.amount) }]
                : [];

            await withBalanceChanges(changes, async () => {
                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (error) { throw error; }
            });
        },
        onMutate: async (id) => {
            if (transactionQueriesKey) {
                await queryClient.cancelQueries({ queryKey: transactionQueriesKey });
            }
            if (allTransactionsKey) {
                await queryClient.cancelQueries({ queryKey: allTransactionsKey });
            }

            const previousTransactionLists = captureTransactionListSnapshots();
            const previousAllTransactions = allTransactionsKey
                ? queryClient.getQueryData<Transaction[]>(allTransactionsKey)
                : undefined;

            updateTransactionListsOptimistically((current) => {
                const hadTargetTransaction = current.data.some((tx) => tx.id === id);
                return {
                    ...current,
                    data: current.data.filter((tx) => tx.id !== id),
                    total: hadTargetTransaction ? Math.max(0, current.total - 1) : current.total,
                };
            });

            if (allTransactionsKey && previousAllTransactions) {
                queryClient.setQueryData<Transaction[]>(
                    allTransactionsKey,
                    previousAllTransactions.filter((tx) => tx.id !== id)
                );
            }

            return { previousTransactionLists, previousAllTransactions };
        },
        onError: (err, id, context) => {
            if (context?.previousTransactionLists) {
                restoreTransactionListSnapshots(context.previousTransactionLists);
            }
            if (allTransactionsKey && context?.previousAllTransactions) {
                queryClient.setQueryData(allTransactionsKey, context.previousAllTransactions);
            }
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        },
        onSettled: () => {
            invalidateTransactions();
            invalidatePaymentMethods();
        },
        onSuccess: () => {
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
        onMutate: async (newCategory) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.categories(userId!) });
            const previousCategories = queryClient.getQueryData<CategoryItem[]>(queryKeys.finance.categories(userId!));

            const optimisticCategory: CategoryItem = {
                id: `temp-${Date.now()}`,
                name: newCategory.name,
                type: newCategory.type,
                color: newCategory.color,
                is_default: false
            };

            if (previousCategories) {
                queryClient.setQueryData<CategoryItem[]>(queryKeys.finance.categories(userId!), old => [...(old || []), optimisticCategory]);
            }

            return { previousCategories };
        },
        onError: (err, newCategory, context) => {
            if (context?.previousCategories) {
                queryClient.setQueryData(queryKeys.finance.categories(userId!), context.previousCategories);
            }
            toast({ title: 'Error', description: 'No se pudo crear la categoría', variant: 'destructive' });
        },
        onSettled: () => {
            invalidateCategories();
        },
        onSuccess: () => {
            toast({ title: 'Categoría Creada', description: 'Guardado exitosamente.' });
        }
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
                .map(cat => ({
                    name: cat.name,
                    type: cat.type,
                    color: cat.color || '#475569',
                    user_id: userId
                }));

            if (categoriesToInsert.length === 0) { return; }

            const { data: insertedData, error } = await supabase.from('categories')
                .insert(categoriesToInsert)
                .select();
            if (error) { throw error; }

            return insertedData;
        },
        onSuccess: (data) => {
            invalidateCategories();
            toast({ title: 'Éxito', description: 'Categorías iniciales creadas.' });
            return data;
        },
        onError: (err) => {
            toast({ title: 'Error', description: 'No se pudieron inicializar las categorías: ' + (err as Error).message, variant: 'destructive' });
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
                color: pm.color,
                initial_date: pm.initial_date
            };

            const { data, error } = await supabase.from('payment_methods')
                .insert([dbData])
                .select()
                .single();
            if (error) { throw error; }
            if (!data) { throw new Error('No data returned'); }
            return data as PaymentMethod;
        },
        onMutate: async (newPm) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.paymentMethods(userId!) });
            const previousPaymentMethods = queryClient.getQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!));

            const optimisticPm: PaymentMethod = {
                id: `temp-${Date.now()}`,
                name: newPm.name,
                type: newPm.type,
                balance: newPm.balance,
                credit_limit: newPm.credit_limit,
                is_savings_account: newPm.is_savings_account,
                savings_goal: newPm.savings_goal,
                estimated_yield: newPm.estimated_yield,
                closing_date: newPm.closing_date,
                payment_day: newPm.payment_day,
                color: newPm.color
            };

            if (previousPaymentMethods) {
                queryClient.setQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!), old => [...(old || []), optimisticPm]);
            }

            return { previousPaymentMethods };
        },
        onError: (err, newPm, context) => {
            if (context?.previousPaymentMethods) {
                queryClient.setQueryData(queryKeys.finance.paymentMethods(userId!), context.previousPaymentMethods);
            }
            toast({ title: 'Error', description: 'No se pudo crear el método de pago.', variant: 'destructive' });
        },
        onSettled: () => {
            invalidatePaymentMethods();
        },
        onSuccess: () => {
            toast({ title: 'Método de Pago Creado', description: 'Guardado exitosamente.' });
        }
    });

    const updatePaymentMethod = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<PaymentMethod> }) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Only update valid columns and ensure id/user_id are not overwritten
            const dbUpdates: Record<string, unknown> = {};
            const allowed: (keyof PaymentMethod)[] = [
                'name', 'type', 'balance', 'credit_limit',
                'is_savings_account', 'savings_goal', 'estimated_yield', 'yield_period',
                'closing_date', 'payment_day', 'color', 'initial_date'
            ];

            allowed.forEach(key => {
                if (updates[key] !== undefined) {
                    dbUpdates[key] = updates[key];
                }
            });

            const { error } = await supabase.from('payment_methods')
                .update(dbUpdates)
                .eq('id', id);
            if (error) { throw error; }
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.paymentMethods(userId!) });
            const previousPaymentMethods = queryClient.getQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!));

            if (previousPaymentMethods) {
                queryClient.setQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!), old =>
                    (old || []).map(pm => pm.id === id ? { ...pm, ...updates } : pm)
                );
            }

            return { previousPaymentMethods };
        },
        onError: (err, variables, context) => {
            if (context?.previousPaymentMethods) {
                queryClient.setQueryData(queryKeys.finance.paymentMethods(userId!), context.previousPaymentMethods);
            }
            toast({ title: 'Error', description: 'No se pudo actualizar el método de pago.', variant: 'destructive' });
        },
        onSettled: () => {
            invalidatePaymentMethods();
        }
    });

    const deletePaymentMethod = useMutation({
        mutationFn: async ({ id, option, transferToId }: { id: string; option: 'delete' | 'orphan' | 'transfer'; transferToId?: string }) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            await deletePaymentMethodAtomic(id, option, transferToId);
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.paymentMethods(userId!) });
            const previousPaymentMethods = queryClient.getQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!));

            if (previousPaymentMethods) {
                queryClient.setQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!), old =>
                    (old || []).filter(pm => pm.id !== id)
                );
            }

            return { previousPaymentMethods };
        },
        onError: (err, variables, context) => {
            if (context?.previousPaymentMethods) {
                queryClient.setQueryData(queryKeys.finance.paymentMethods(userId!), context.previousPaymentMethods);
            }
            toast({ title: 'Error', description: 'No se pudo eliminar el método de pago.', variant: 'destructive' });
        },
        onSettled: () => {
            invalidatePaymentMethods();
            invalidateTransactions();
        }
    });

    const mergePaymentMethods = useMutation({
        mutationFn: async ({ duplicateId, primaryId }: { duplicateId: string; primaryId: string }) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            // Fusionar = eliminar la duplicada transfiriendo historial y saldo a la principal.
            await deletePaymentMethodAtomic(duplicateId, 'transfer', primaryId);
        },
        onSettled: () => {
            invalidatePaymentMethods();
            invalidateTransactions();
        },
        onSuccess: () => {
            toast({ title: 'Fusión exitosa', description: 'Las cuentas han sido fusionadas y la duplicada ha sido eliminada.' });
        },
        onError: (err) => {
            toast({ title: 'Error al fusionar', description: (err as Error).message, variant: 'destructive' });
        }
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
                month: budget.month,
                is_recurrent: budget.is_recurrent ?? false,
            };

            const { error } = await supabase.from('budgets').upsert(dbData, {
                onConflict: 'user_id,category_id,month'
            });
            if (error) { throw error; }
        },
        onMutate: async (newBudget) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.budgets(userId!) });
            const previousBudgets = queryClient.getQueryData<Budget[]>(queryKeys.finance.budgets(userId!));

            const optimisticBudget: Budget = {
                id: `temp-${Date.now()}`,
                category: newBudget.category,
                category_id: newBudget.category_id,
                amount: newBudget.amount,
                month: newBudget.month
            };

            if (previousBudgets) {
                queryClient.setQueryData<Budget[]>(queryKeys.finance.budgets(userId!), old => [...(old || []), optimisticBudget]);
            }

            return { previousBudgets };
        },
        onError: (err, newBudget, context) => {
            if (context?.previousBudgets) {
                queryClient.setQueryData(queryKeys.finance.budgets(userId!), context.previousBudgets);
            }
            toast({ title: 'Error', description: 'No se pudo guardar el presupuesto.', variant: 'destructive' });
        },
        onSettled: () => {
            invalidateBudgets();
        },
        onSuccess: () => {
            toast({ title: 'Presupuesto Creado', description: 'Guardado exitosamente.' });
        }
    });

    const deleteBudget = useMutation({
        mutationFn: async (id: string) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            const { error } = await supabase.from('budgets').delete().eq('id', id);
            if (error) { throw error; }
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.budgets(userId!) });
            const previousBudgets = queryClient.getQueryData<Budget[]>(queryKeys.finance.budgets(userId!));

            if (previousBudgets) {
                queryClient.setQueryData<Budget[]>(queryKeys.finance.budgets(userId!), old =>
                    (old || []).filter(b => b.id !== id)
                );
            }

            return { previousBudgets };
        },
        onError: (err, id, context) => {
            if (context?.previousBudgets) {
                queryClient.setQueryData(queryKeys.finance.budgets(userId!), context.previousBudgets);
            }
            toast({ title: 'Error', description: 'No se pudo eliminar el presupuesto.', variant: 'destructive' });
        },
        onSettled: () => {
            invalidateBudgets();
        }
    });

    // 5. Bulk & Special Actions
    const addTransactionsBulk = useMutation({
        mutationFn: async (transactions: Omit<Transaction, 'id'>[]) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            const dataToInsert = transactions.map(t => {
                const { installments, created_at, ...dbData } = t as Record<string, unknown>;
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

            const { data: inserted, error } = await supabase.from('transactions').insert(transactions).select('id');
            if (error) { throw error; }

            // Ambos saldos en una sola operación atómica; si falla, se deshacen las dos transacciones.
            try {
                await adjustBalances([
                    { id: fromId, delta: -Math.abs(amount) },
                    { id: toId, delta: Math.abs(amount) },
                ]);
            } catch (balanceError) {
                const ids = (inserted ?? []).map(t => t.id);
                if (ids.length > 0) {
                    await supabase.from('transactions').delete().in('id', ids);
                }
                throw balanceError;
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
            const dbUpdates: Partial<CategoryItem> = {};
            if (updates.name !== undefined) { dbUpdates.name = updates.name; }
            if (updates.type !== undefined) { dbUpdates.type = updates.type; }
            if (updates.color !== undefined) { dbUpdates.color = updates.color; }

            const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
            if (error) { throw error; }
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.categories(userId!) });
            const previousCategories = queryClient.getQueryData<CategoryItem[]>(queryKeys.finance.categories(userId!));

            if (previousCategories) {
                queryClient.setQueryData<CategoryItem[]>(queryKeys.finance.categories(userId!), old =>
                    (old || []).map(cat => cat.id === id ? { ...cat, ...updates } : cat)
                );
            }

            return { previousCategories };
        },
        onError: (err, newCategory, context) => {
            if (context?.previousCategories) {
                queryClient.setQueryData(queryKeys.finance.categories(userId!), context.previousCategories);
            }
            toast({ title: 'Error', description: 'No se pudo actualizar la categoría', variant: 'destructive' });
        },
        onSettled: () => {
            invalidateCategories();
        }
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

    const deletePaymentMethodFn = async (id: string, option: 'delete' | 'orphan' | 'transfer' = 'orphan', transferToId?: string) => {
        try {
            await deletePaymentMethod.mutateAsync({ id, option, transferToId });
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const mergePaymentMethodsFn = async (duplicateId: string, primaryId: string) => {
        try {
            await mergePaymentMethods.mutateAsync({ duplicateId, primaryId });
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
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.categories(userId!) });
            const previousCategories = queryClient.getQueryData<CategoryItem[]>(queryKeys.finance.categories(userId!));

            if (previousCategories) {
                queryClient.setQueryData<CategoryItem[]>(queryKeys.finance.categories(userId!), old =>
                    (old || []).filter(cat => cat.id !== id)
                );
            }

            return { previousCategories };
        },
        onError: (err, id, context) => {
            if (context?.previousCategories) {
                queryClient.setQueryData(queryKeys.finance.categories(userId!), context.previousCategories);
            }
            toast({ title: 'Error', description: 'No se pudo eliminar la categoría', variant: 'destructive' });
        },
        onSettled: () => {
            invalidateCategories();
        }
    });

    const deleteCategoryFn = async (id: string) => {
        try {
            await deleteCategoryMutation.mutateAsync(id);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    // 6. Staging Mutations
    const addToStaging = useMutation({
        mutationFn: async (transactions: Partial<StagingTransaction>[]) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Delete existing pending staging for this user first
            const { error: clearError } = await supabase
                .from('excel_import_staging')
                .delete()
                .eq('user_id', userId)
                .eq('status', 'pending');
            if (clearError) { throw clearError; }

            const dataToInsert = transactions.map(t => ({
                ...t,
                user_id: userId,
                status: 'pending' as const
            }));

            const { data, error } = await supabase.from('excel_import_staging').insert(dataToInsert).select();
            if (error) { throw error; }

            // Run duplicate detection RPC
            const { error: rpcError } = await supabase.rpc('mark_staging_duplicates', { p_user_id: userId });
            if (rpcError) { throw rpcError; }

            return { count: data?.length || 0 };
        },
        onSuccess: () => {
            invalidateStaging();
        }
    });

    const addToStagingFn = async (transactions: Partial<StagingTransaction>[]) => {
        try {
            const result = await addToStaging.mutateAsync(transactions);
            return { error: null, count: result.count };
        } catch (error) {
            return { error, count: 0 };
        }
    };

    const confirmStagingImport = useMutation({
        mutationFn: async (stagingIds: string[]) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            if (stagingIds.length === 0) {return { count: 0 };}

            // "Reclamar" las filas: pending -> imported en una sola operación y recibir solo las que
            // realmente cambiaron. Un doble clic o un reintento recibe 0 filas y no duplica transacciones.
            const { data: stagingRecords, error: claimError } = await supabase
                .from('excel_import_staging')
                .update({ status: 'imported' })
                .in('id', stagingIds)
                .eq('user_id', userId)
                .eq('status', 'pending')
                .select('*');

            if (claimError) {throw claimError;}
            if (!stagingRecords || stagingRecords.length === 0) {return { count: 0 };}

            // Format for transactions table
            const transactionsToInsert = stagingRecords.map(record => ({
                user_id: userId,
                date: record.date,
                description: record.description,
                amount: record.amount,
                category: record.category || 'Por Clasificar',
                category_id: record.category_id,
                payment_method_id: record.payment_method_id,
                type: record.type || 'expense',
            }));

            // Insert into transactions
            const { data: inserted, error: insertError } = await supabase
                .from('transactions')
                .insert(transactionsToInsert)
                .select();

            if (insertError) {
                // Revertir el reclamo para que el usuario pueda reintentar sin perder las filas.
                await supabase
                    .from('excel_import_staging')
                    .update({ status: 'pending' })
                    .in('id', stagingRecords.map(r => r.id))
                    .eq('user_id', userId);
                throw insertError;
            }

            // Mark remaining pending as ignored
            const { error: ignoreError } = await supabase
                .from('excel_import_staging')
                .update({ status: 'ignored' })
                .eq('user_id', userId)
                .eq('status', 'pending');

            if (ignoreError) {throw ignoreError;}

            return { count: inserted?.length || 0 };
        },
        onSuccess: () => {
            invalidateTransactions();
            invalidateStaging();
            invalidatePaymentMethods();
        }
    });

    const confirmStagingImportFn = async (stagingIds: string[]) => {
        try {
            const result = await confirmStagingImport.mutateAsync(stagingIds);
            return { error: null, count: result.count };
        } catch (error) {
            return { error, count: 0 };
        }
    };

    const clearStaging = useMutation({
        mutationFn: async () => {
            if (!userId) { throw new Error('Unauthenticated'); }
            const { error } = await supabase.from('excel_import_staging').delete().eq('user_id', userId).eq('status', 'pending');
            if (error) { throw error; }
        },
        onSuccess: () => {
            invalidateStaging();
        }
    });

    const clearStagingFn = async () => {
        try {
            await clearStaging.mutateAsync();
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
        mergePaymentMethods: mergePaymentMethodsFn,
        addBudget: addBudgetFn,
        deleteBudget: deleteBudgetFn,
        addToStaging: addToStagingFn,
        confirmStagingImport: confirmStagingImportFn,
        clearStaging: clearStagingFn,
    };
}
