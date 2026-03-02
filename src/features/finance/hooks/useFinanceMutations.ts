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

import { useCallback } from 'react';
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

    const invalidateFinance = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    }, [queryClient]);

    const invalidateTransactions = useCallback(() => {
        if (!userId) { return; }
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.transactions(userId) });
        queryClient.invalidateQueries({ queryKey: ['finance', 'allTransactions', userId] });
    }, [queryClient, userId]);

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

    // 1. Transaction Mutations
    const addTransaction = useMutation({
        mutationFn: async (txn: Omit<Transaction, 'id' | 'created_at'>) => {
            if (!userId) { throw new Error('Unauthenticated'); }

            // Remove frontend-only fields like 'installments' if they don't exist in DB
            const { installments, ...dbData } = txn as Record<string, unknown> & { installments?: unknown };

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
                    const isPositive = ['income', 'transfer_in'].includes(dbData.type as string);
                    const newBalance = isPositive ? pm.balance + amount : pm.balance - amount;

                    await supabase
                        .from('payment_methods')
                        .update({ balance: newBalance })
                        .eq('id', dbData.payment_method_id);
                }
            }

            return data[0];
        },
        onMutate: async (newTxn) => {
            await queryClient.cancelQueries({ queryKey: ['finance', 'transactions', userId] });
            await queryClient.cancelQueries({ queryKey: ['finance', 'allTransactions', userId] });

            const previousTransactions = queryClient.getQueryData<Transaction[]>(['finance', 'transactions', userId]);
            const previousAllTransactions = queryClient.getQueryData<Transaction[]>(['finance', 'allTransactions', userId]);

            const optimisticTxn: Transaction = {
                id: `temp-${Date.now()}`,
                amount: newTxn.amount,
                type: newTxn.type,
                description: newTxn.description,
                category: newTxn.category,
                category_id: newTxn.category_id || null,
                payment_method_id: newTxn.payment_method_id,
                date: newTxn.date || new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                category_name: 'Guardando...',
                payment_method_name: 'Procesando...',
            } as Transaction;

            if (previousTransactions) {
                queryClient.setQueryData<Transaction[]>(['finance', 'transactions', userId], old => [optimisticTxn, ...(old || [])]);
            }
            if (previousAllTransactions) {
                queryClient.setQueryData<Transaction[]>(['finance', 'allTransactions', userId], old => [optimisticTxn, ...(old || [])]);
            }

            return { previousTransactions, previousAllTransactions };
        },
        onError: (err, newTxn, context) => {
            if (context?.previousTransactions) {
                queryClient.setQueryData(['finance', 'transactions', userId], context.previousTransactions);
            }
            if (context?.previousAllTransactions) {
                queryClient.setQueryData(['finance', 'allTransactions', userId], context.previousAllTransactions);
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
                    const isPositive = ['income', 'transfer_in'].includes(oldTxn.type);
                    const reverseAmount = isPositive ? -oldTxn.amount : oldTxn.amount;
                    await supabase.from('payment_methods').update({ balance: oldPm.balance + reverseAmount }).eq('id', oldTxn.payment_method_id);
                }
            }

            const newPmId = dbUpdates.payment_method_id || (oldTxn ? oldTxn.payment_method_id : null);
            const newAmount = dbUpdates.amount !== undefined ? Number(dbUpdates.amount) : (oldTxn ? oldTxn.amount : 0);
            const newType = dbUpdates.type || (oldTxn ? oldTxn.type : 'expense');

            if (newPmId) {
                const { data: newPm } = await supabase.from('payment_methods').select('balance').eq('id', newPmId).single();
                if (newPm) {
                    const isPositive = ['income', 'transfer_in'].includes(newType);
                    const applyAmount = isPositive ? newAmount : -newAmount;
                    await supabase.from('payment_methods').update({ balance: newPm.balance + applyAmount }).eq('id', newPmId);
                }
            }
        },
        onMutate: async ({ id, updates }) => {
            // Cancel any outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['finance', 'transactions', userId] });
            await queryClient.cancelQueries({ queryKey: ['finance', 'allTransactions', userId] });

            // Snapshot the previous value
            const previousTransactions = queryClient.getQueryData<Transaction[]>(['finance', 'transactions', userId]);
            const previousAllTransactions = queryClient.getQueryData<Transaction[]>(['finance', 'allTransactions', userId]);

            // Optimistically update to the new value
            if (previousTransactions) {
                queryClient.setQueryData<Transaction[]>(['finance', 'transactions', userId], old =>
                    (old || []).map(tx => tx.id === id ? { ...tx, ...updates, category_name: updates.category_id ? 'Actualizada(Oculta)' : tx.category_name, payment_method_name: updates.payment_method_id ? 'Actualizada(Oculta)' : tx.payment_method_name } : tx)
                );
            }
            if (previousAllTransactions) {
                queryClient.setQueryData<Transaction[]>(['finance', 'allTransactions', userId], old =>
                    (old || []).map(tx => tx.id === id ? { ...tx, ...updates, category_name: updates.category_id ? 'Actualizada(Oculta)' : tx.category_name, payment_method_name: updates.payment_method_id ? 'Actualizada(Oculta)' : tx.payment_method_name } : tx)
                );
            }

            return { previousTransactions, previousAllTransactions };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTransactions) {
                queryClient.setQueryData(['finance', 'transactions', userId], context.previousTransactions);
            }
            if (context?.previousAllTransactions) {
                queryClient.setQueryData(['finance', 'allTransactions', userId], context.previousAllTransactions);
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
                    const isPositive = ['income', 'transfer_in'].includes(txn.type);
                    const reverseAmount = isPositive ? -txn.amount : txn.amount;
                    await supabase
                        .from('payment_methods')
                        .update({ balance: pm.balance + reverseAmount })
                        .eq('id', txn.payment_method_id);
                }
            }
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['finance', 'transactions', userId] });
            await queryClient.cancelQueries({ queryKey: ['finance', 'allTransactions', userId] });

            const previousTransactions = queryClient.getQueryData<Transaction[]>(['finance', 'transactions', userId]);
            const previousAllTransactions = queryClient.getQueryData<Transaction[]>(['finance', 'allTransactions', userId]);

            if (previousTransactions) {
                queryClient.setQueryData<Transaction[]>(['finance', 'transactions', userId], old => (old || []).filter(tx => tx.id !== id));
            }
            if (previousAllTransactions) {
                queryClient.setQueryData<Transaction[]>(['finance', 'allTransactions', userId], old => (old || []).filter(tx => tx.id !== id));
            }

            return { previousTransactions, previousAllTransactions };
        },
        onError: (err, id, context) => {
            if (context?.previousTransactions) {
                queryClient.setQueryData(['finance', 'transactions', userId], context.previousTransactions);
            }
            if (context?.previousAllTransactions) {
                queryClient.setQueryData(['finance', 'allTransactions', userId], context.previousAllTransactions);
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
                'is_savings_account', 'savings_goal', 'estimated_yield',
                'closing_date', 'payment_day', 'color'
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
        mutationFn: async (id: string) => {
            if (!userId) { throw new Error('Unauthenticated'); }
            const { error } = await supabase.from('payment_methods').delete().eq('id', id);
            if (error) { throw error; }
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.finance.paymentMethods(userId!) });
            const previousPaymentMethods = queryClient.getQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!));

            if (previousPaymentMethods) {
                queryClient.setQueryData<PaymentMethod[]>(queryKeys.finance.paymentMethods(userId!), old =>
                    (old || []).filter(pm => pm.id !== id)
                );
            }

            return { previousPaymentMethods };
        },
        onError: (err, id, context) => {
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
