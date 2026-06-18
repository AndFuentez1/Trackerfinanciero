/**
 * useProfileManagement Hook
 * 
 * Manages user profile and settings (currency, decimal places, base color).
 */

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import { CURRENCIES, getDefaultDecimals } from '../constants/currencyConstants';
import { queryKeys } from '@/core/api/queryKeys';
import { getBackendUrl } from '@/core/api/backend';
import type { ProfileSelect } from './useFinanceQueries';
import type { Database } from '@/integrations/supabase/types';
import { clearFinanceCacheForUser } from '../utils/localCache';
import type { Budget } from '../types/financeTypes';

export type ResetProfileOptions = {
    transactions: boolean;
    budgets: boolean;
    savings: boolean;
    loans: boolean;
    futureExpenses: boolean;
    paymentMethods: boolean;
    categories: boolean;
    profileFlags: boolean;
    gmailPermissions: boolean;
    telegramConfig: boolean;
};

const DEFAULT_RESET_PROFILE_OPTIONS: ResetProfileOptions = {
    transactions: false,
    budgets: false,
    savings: false,
    loans: false,
    futureExpenses: false,
    paymentMethods: false,
    categories: false,
    profileFlags: false,
    gmailPermissions: false,
    telegramConfig: false,
};

export function useProfileManagement(profile?: ProfileSelect | null) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Profile state
    const [currency, setCurrency] = useState('');
    const [decimalPlaces, setDecimalPlaces] = useState(0);
    const [profileData, setProfileData] = useState<ProfileSelect | null>(null);

    // Sync local profile state with fetched profile
    useEffect(() => {
        if (!profile) { return; }
        setProfileData(profile);
        setCurrency(profile.currency ?? '');
        if (typeof profile.decimal_places === 'number') { setDecimalPlaces(profile.decimal_places); }
        if (profile.decimal_places === null) { setDecimalPlaces(0); }
    }, [profile]);

    /**
     * Update user profile
     */
    const updateProfile = useCallback(async (updates: {
        currency?: string;
        decimal_places?: number;
        base_color?: string;
        onboarding_decision?: string;
        has_pending_import?: boolean;
        welcome_completed?: boolean;
        country?: string;
        data_treatment_accepted?: boolean;
    }) => {
        if (!user) {
            toast({ title: 'Error', description: 'No autenticado', variant: 'destructive' });
            return { error: 'No autenticado' };
        }

        const profileQueryKey = queryKeys.finance.profile(user.id);
        const previousProfileData = profileData;
        const previousQueryProfile = queryClient.getQueryData<ProfileSelect | null>(profileQueryKey) ?? null;
        const previousCurrency = currency;
        const previousDecimalPlaces = decimalPlaces;

        try {
            type ProfileUpdate = {
                currency?: string;
                decimal_places?: number;
                base_color?: string;
                onboarding_decision?: string;
                has_pending_import?: boolean;
                welcome_completed?: boolean;
                country?: string;
                data_treatment_accepted?: boolean;
            };

            const validUpdates = Object.entries(updates).reduce((acc: ProfileUpdate, [key, value]) => {
                if (value !== undefined) {
                    (acc as Record<string, unknown>)[key] = value;
                }
                return acc;
            }, {});

            const optimisticBaseProfile = previousProfileData ?? previousQueryProfile;
            const optimisticProfile = optimisticBaseProfile
                ? { ...optimisticBaseProfile, ...validUpdates }
                : { ...validUpdates } as unknown as ProfileSelect;

            // Start cancellation first, but do not delay the optimistic UI update.
            const cancelQueriesPromise = queryClient.cancelQueries({ queryKey: profileQueryKey });

            if (validUpdates.currency !== undefined) {
                setCurrency(validUpdates.currency);
            }
            if (validUpdates.decimal_places !== undefined) {
                setDecimalPlaces(validUpdates.decimal_places);
            }
            if (optimisticProfile) {
                setProfileData(optimisticProfile);
            }

            queryClient.setQueryData(
                profileQueryKey,
                (prev: ProfileSelect | null) => {
                    if (!prev) {
                        return optimisticProfile;
                    }
                    return {
                        ...prev,
                        ...validUpdates,
                    };
                }
            );

            // Finish cancellation before the network write so stale in-flight responses do not win.
            // Removed await cancelQueriesPromise; because it can cause an infinite hang
            // if React Query doesn't resolve cancellation

            const { data, error } = await supabase
                .from('profiles')
                .update(validUpdates)
                .eq('id', user.id)
                .select();

            if (error) { throw error; }
            if (!data || data.length === 0) {
                // If the profile didn't exist yet, force creation with upsert
                const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({ id: user.id, user_id: user.id, ...validUpdates });
                if (upsertError) throw upsertError;
            }

            // Invalidate to ensure any other listeners eventually get the completely true state
            queryClient.invalidateQueries({ queryKey: profileQueryKey });

            toast({ title: 'Perfil actualizado', description: 'Cambios guardados correctamente' });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';

            setCurrency(previousCurrency);
            setDecimalPlaces(previousDecimalPlaces);
            setProfileData(previousProfileData);
            queryClient.setQueryData(profileQueryKey, previousQueryProfile);

            console.error('Error updating profile:', error);
            toast({ title: 'Error', description: message, variant: 'destructive' });
            return { error: message };
        }
    }, [user, toast, profileData, queryClient, currency, decimalPlaces]);

    /**
     * Reset operational data (transactions, budgets, etc.) but keep configuration (categories, payment methods)
     */
    const resetOperationalData = useCallback(async () => {
        if (!user) { return { error: 'No autenticado' }; }

        const errors: string[] = [];
        try {
            const tables = ['future_expenses', 'loans', 'savings_transactions', 'transactions', 'budgets'];

            for (const table of tables) {
                const { error } = await supabase.from(table).delete().eq('user_id', user.id);
                if (error) {
                    console.error(`Error deleting ${table}:`, error);
                    errors.push(`${table}: ${error.message}`);
                }
            }

            // Also reset payment method balances to 0
            const { error: pmError } = await supabase
                .from('payment_methods')
                .update({ balance: 0 })
                .eq('user_id', user.id);
            if (pmError) { errors.push(`métodos de pago: ${pmError.message}`); }

            if (errors.length > 0) {
                toast({
                    title: 'Errores al resetear datos operativos',
                    description: errors.join(', '),
                    variant: 'destructive',
                });
                return { error: errors.join(', ') };
            }

            clearFinanceCacheForUser(user.id);
            queryClient.setQueryData<Budget[]>(queryKeys.finance.budgets(user.id), []);
            queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.savings.all });

            toast({ title: 'Datos reseteados', description: 'Tus datos operativos han sido eliminados. Configuración conservada.' });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            console.error('Error resetting operational data:', error);
            toast({ title: 'Error', description: message, variant: 'destructive' });
            return { error: message };
        }
    }, [user, toast, queryClient]);

    /**
     * Reset all profile data (dangerous operation)
     */
    const resetProfileData = useCallback(async (options?: Partial<ResetProfileOptions>) => {
        if (!user) { return { error: 'No autenticado' }; }

        const resolvedOptions: ResetProfileOptions = {
            ...DEFAULT_RESET_PROFILE_OPTIONS,
            ...(options ?? {})
        };

        const enforcedOptions: ResetProfileOptions = {
            ...resolvedOptions,
            // Only enforce coupled deletions if the primary one is explicitly true
            budgets: resolvedOptions.budgets || (resolvedOptions.categories && options?.budgets !== false),
            savings: resolvedOptions.savings || (resolvedOptions.paymentMethods && options?.savings !== false),
        };

        if (!Object.values(enforcedOptions).some(Boolean)) {
            toast({ title: 'Sin cambios', description: 'Selecciona al menos una opción para borrar.' });
            return { error: 'Sin opciones seleccionadas' };
        }

        const errors: string[] = [];

        try {
            // 0) Limpiar tablas de soporte y reglas (tienen cascade user_id, pero mejor ser explícitos)
            const supportTables = ['classifier_rules', 'gmail_message_status'];
            for (const table of supportTables) {
                await supabase.from(table).delete().eq('user_id', user.id);
            }

            // 1) Finanzas - eliminar datos seleccionados (orden seguro)
            if (enforcedOptions.transactions) {
                const { error } = await supabase.from('transactions').delete().eq('user_id', user.id);
                if (error) {
                    console.error('Error deleting transactions:', error);
                    errors.push(`transactions: ${error.message}`);
                }
            }

            // Borrar facturas pendientes siempre que se resetean transacciones o se limpian categorías/métodos
            if (enforcedOptions.transactions || enforcedOptions.categories || enforcedOptions.paymentMethods) {
                const { error: pendingInvoicesDeleteError } = await supabase
                    .from('pending_invoices')
                    .delete()
                    .eq('user_id', user.id);
                if (pendingInvoicesDeleteError) {
                    console.error('Error deleting pending_invoices:', pendingInvoicesDeleteError);
                    errors.push(`pending_invoices: ${pendingInvoicesDeleteError.message}`);
                }
            }

            if (enforcedOptions.budgets) {
                const { error } = await supabase.from('budgets').delete().eq('user_id', user.id);
                if (error) {
                    console.error('Error deleting budgets:', error);
                    errors.push(`budgets: ${error.message}`);
                }
            }

            if (enforcedOptions.savings) {
                // Primero transacciones de ahorro por la referencia a cuentas/métodos
                const { error: savingsTxError } = await supabase.from('savings_transactions').delete().eq('user_id', user.id);
                if (savingsTxError) {
                    console.error('Error deleting savings_transactions:', savingsTxError);
                    errors.push(`savings_transactions: ${savingsTxError.message}`);
                }

                const { error: savingsAccountsError } = await supabase.from('savings_accounts').delete().eq('user_id', user.id);
                if (savingsAccountsError) {
                    console.error('Error deleting savings_accounts:', savingsAccountsError);
                    errors.push(`savings_accounts: ${savingsAccountsError.message}`);
                }
            }

            if (enforcedOptions.loans) {
                const { error } = await supabase.from('loans').delete().eq('user_id', user.id);
                if (error) {
                    console.error('Error deleting loans:', error);
                    errors.push(`loans: ${error.message}`);
                }
            }

            if (enforcedOptions.futureExpenses) {
                const { error } = await supabase.from('future_expenses').delete().eq('user_id', user.id);
                if (error) {
                    console.error('Error deleting future_expenses:', error);
                    errors.push(`future_expenses: ${error.message}`);
                }
            }

            if (enforcedOptions.paymentMethods) {
                // Intentar borrar métodos de pago
                const { error } = await supabase.from('payment_methods').delete().eq('user_id', user.id);
                if (error) {
                    console.error('Error deleting payment_methods:', error);
                    errors.push(`payment_methods: ${error.message}`);

                    // Fallback: Si no se pueden borrar, al menos poner saldos a 0
                    await supabase
                        .from('payment_methods')
                        .update({ balance: 0 })
                        .eq('user_id', user.id);
                }
            } else if (enforcedOptions.transactions) {
                // Mantener métodos de pago pero reiniciar saldos si se borran transacciones
                const { error } = await supabase
                    .from('payment_methods')
                    .update({ balance: 0 })
                    .eq('user_id', user.id);
                if (error) {
                    console.error('Error resetting payment method balances:', error);
                    errors.push(`payment_methods_balance: ${error.message}`);
                }
            }

            if (enforcedOptions.categories) {
                const { error } = await supabase.from('categories').delete().eq('user_id', user.id);
                if (error) {
                    console.error('Error deleting categories:', error);
                    errors.push(`categories: ${error.message}`);
                }
            }

            // 2) Perfil - reiniciar banderas de onboarding
            if (enforcedOptions.profileFlags) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        onboarding_decision: null,
                        has_pending_import: false,
                        welcome_completed: false,
                        currency: null,
                        decimal_places: null,
                        base_color: null,
                        country: null,
                        data_treatment_accepted: null,
                    })
                    .eq('id', user.id);

                if (profileError) {
                    errors.push(`profile: ${profileError.message}`);
                } else {
                    setCurrency('');
                    setDecimalPlaces(0);

                    const flushState = {
                        onboarding_decision: null,
                        has_pending_import: false,
                        welcome_completed: false,
                        currency: null,
                        decimal_places: null,
                        base_color: null,
                        country: null,
                        data_treatment_accepted: null,
                    };

                    setProfileData(prev => prev ? ({ ...prev, ...flushState }) : prev);

                    // Keep React Query cache in sync immediately to force UI reactivity (like WelcomePanel)
                    queryClient.setQueryData(
                        queryKeys.finance.profile(user.id),
                        (prev: ProfileSelect | null) => {
                            if (!prev) return prev;
                            return { ...prev, ...flushState };
                        }
                    );
                }
            }

            // 3) Integraciones - Gmail / Telegram
            const backendUrl = getBackendUrl();

            if (enforcedOptions.gmailPermissions) {
                const response = await fetch(`${backendUrl}/api/user/config/gmail/disconnect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });
                if (!response.ok) {
                    const responseData = await response.json().catch(() => ({}));
                    const message = responseData?.error || 'No se pudo desconectar Gmail';
                    errors.push(`gmail: ${message}`);
                }
            }

            if (enforcedOptions.telegramConfig) {
                const response = await fetch(`${backendUrl}/api/user/config/telegram/disconnect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });
                if (!response.ok) {
                    const responseData = await response.json().catch(() => ({}));
                    const message = responseData?.error || 'No se pudo desconectar Telegram';
                    errors.push(`telegram: ${message}`);
                }
            }

            clearFinanceCacheForUser(user.id);

            if (enforcedOptions.budgets) {
                queryClient.setQueryData<Budget[]>(queryKeys.finance.budgets(user.id), []);
            }
            if (enforcedOptions.categories) {
                queryClient.setQueryData(queryKeys.finance.categories(user.id), []);
            }
            if (enforcedOptions.paymentMethods || enforcedOptions.savings) {
                queryClient.setQueryData(queryKeys.finance.paymentMethods(user.id), []);
            }

            queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.savings.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });

            if (errors.length > 0) {
                toast({
                    title: 'Errores al resetear',
                    description: `Algunos datos no pudieron eliminarse: ${errors.join(', ')}`,
                    variant: 'destructive',
                });
                return { error: errors.join(', ') };
            }

            toast({ title: 'Perfil reseteado', description: 'Se eliminaron los datos seleccionados.' });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            console.error('Error resetting profile:', error);
            toast({ title: 'Error', description: message, variant: 'destructive' });
            return { error: message };
        }
    }, [user, toast, queryClient]);

    /**
     * Conversión de moneda: no escala `estimated_yield` (porcentaje, no importe).
     * Ante fallo a mitad de proceso, revierte con tasa inversa las tablas ya actualizadas.
     */
    const convertCurrency = useCallback(async (rate: number, newCurrency: string, dryRun = false) => {
        if (!user) { return { error: 'No autenticado' }; }
        if (!Number.isFinite(rate) || rate <= 0) {
            return { error: 'Tasa de conversión inválida' };
        }

        type AppTable = keyof Database['public']['Tables'];
        type TableStep = { table: AppTable; fields: string[] };
        type Completed = TableStep | 'loan_payments';

        try {
            const amountDecimals =
                typeof decimalPlaces === 'number' && decimalPlaces >= 0
                    ? Math.min(decimalPlaces, 8)
                    : 4;

            const makeScale = (factor: number) => (value: number) =>
                Number((Number(value) * factor).toFixed(amountDecimals));

            const updateTableFieldsScaled = async (
                tableName: AppTable,
                fieldsToMultiply: string[],
                scale: (n: number) => number
            ) => {
                let allRows: Record<string, unknown>[] = [];
                let hasMore = true;
                let page = 0;
                const pageSize = 1000;

                while (hasMore) {
                    const { data, error } = await supabase
                        .from(tableName)
                        .select('*')
                        .eq('user_id', user.id)
                        .range(page * pageSize, (page + 1) * pageSize - 1);

                    if (error) throw error;

                    if (data && data.length > 0) {
                        allRows.push(...data);
                        if (data.length < pageSize) {
                            hasMore = false;
                        } else {
                            page++;
                        }
                    } else {
                        hasMore = false;
                    }
                }

                if (allRows.length === 0) return 0;

                const updates = allRows.map((r) => {
                    const updatedRow = { ...r };
                    for (const field of fieldsToMultiply) {
                        if (updatedRow[field] !== null && updatedRow[field] !== undefined) {
                            updatedRow[field] = scale(Number(updatedRow[field]));
                        }
                    }
                    return updatedRow;
                });

                if (dryRun) return updates.length;

                const chunkSize = 500;
                for (let i = 0; i < updates.length; i += chunkSize) {
                    const chunk = updates.slice(i, i + chunkSize);
                    const { error } = await supabase.from(tableName).upsert(chunk as never[]);
                    if (error) throw error;
                }

                return updates.length;
            };

            const updateLoanPaymentsScaled = async (scale: (n: number) => number) => {
                const { data: loanRows, error: loanErr } = await supabase
                    .from('loans')
                    .select('id')
                    .eq('user_id', user.id);
                if (loanErr) throw loanErr;
                const loanIds = (loanRows ?? []).map((r: { id: string }) => r.id);
                if (loanIds.length === 0) return 0;

                let allRows: Record<string, unknown>[] = [];
                const pageSize = 1000;
                const idChunkSize = 80;

                for (let i = 0; i < loanIds.length; i += idChunkSize) {
                    const idChunk = loanIds.slice(i, i + idChunkSize);
                    let p = 0;
                    let hasMore = true;
                    while (hasMore) {
                        const { data, error } = await supabase
                            .from('loan_payments')
                            .select('*')
                            .in('loan_id', idChunk)
                            .range(p * pageSize, (p + 1) * pageSize - 1);
                        if (error) throw error;
                        if (data && data.length > 0) {
                            allRows.push(...data);
                            if (data.length < pageSize) {
                                hasMore = false;
                            } else {
                                p++;
                            }
                        } else {
                            hasMore = false;
                        }
                    }
                }

                if (allRows.length === 0) return 0;

                const updates = allRows.map((r) => ({
                    ...r,
                    amount: scale(Number(r.amount)),
                }));

                if (dryRun) return updates.length;

                const chunkSize = 500;
                for (let j = 0; j < updates.length; j += chunkSize) {
                    const chunk = updates.slice(j, j + chunkSize);
                    const { error } = await supabase.from('loan_payments').upsert(chunk as never[]);
                    if (error) throw error;
                }

                return updates.length;
            };

            if (dryRun) {
                return { preview: [], totalTransactions: 0 };
            }

            const forward = makeScale(rate);
            const backward = makeScale(1 / rate);

            const tableSteps: TableStep[] = [
                { table: 'transactions', fields: ['amount', 'calculated_yield_amount', 'balance_at_transaction'] },
                { table: 'budgets', fields: ['amount'] },
                { table: 'future_expenses', fields: ['amount'] },
                { table: 'payment_methods', fields: ['balance', 'credit_limit', 'savings_goal'] },
                { table: 'savings_accounts', fields: ['balance'] },
                { table: 'savings_transactions', fields: ['amount', 'calculated_yield', 'balance_after_transaction'] },
                { table: 'pending_invoices', fields: ['amount'] },
                { table: 'loans', fields: ['total_amount', 'paid_amount'] },
            ];

            const completed: Completed[] = [];
            let totalUpdated = 0;

            try {
                for (const step of tableSteps) {
                    const n = await updateTableFieldsScaled(step.table, step.fields, forward);
                    completed.push(step);
                    totalUpdated += n;
                }
                const lp = await updateLoanPaymentsScaled(forward);
                completed.push('loan_payments');
                totalUpdated += lp;

                await updateProfile({ currency: newCurrency });

                queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });

                toast({
                    title: 'Conversión completada',
                    description: `Se han convertido ${totalUpdated} registros a ${newCurrency}`,
                });

                return { success: true, converted: totalUpdated };
            } catch (convErr) {
                for (let i = completed.length - 1; i >= 0; i--) {
                    const step = completed[i];
                    try {
                        if (step === 'loan_payments') {
                            await updateLoanPaymentsScaled(backward);
                        } else {
                            await updateTableFieldsScaled(step.table, step.fields, backward);
                        }
                    } catch (revertErr) {
                        console.error('Error revirtiendo conversión parcial:', revertErr, step);
                    }
                }
                queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
                throw convErr;
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            console.error('Error converting currency:', error);
            toast({
                title: 'Error en conversión',
                description:
                    `${message}. Si algo no cuadra, cierra sesión y vuelve a entrar con red estable para sincronizar.`,
                variant: 'destructive',
            });
            return { error: message };
        }
    }, [user, toast, updateProfile, queryClient, decimalPlaces]);

    return {
        // State
        currency,
        setCurrency,
        decimalPlaces,
        setDecimalPlaces,
        profileData,
        setProfileData,

        // Actions
        updateProfile,
        resetProfileData,
        resetOperationalData,
        convertCurrency,

        // Helpers
        currencies: CURRENCIES,
        getDefaultDecimals,
    };
}
