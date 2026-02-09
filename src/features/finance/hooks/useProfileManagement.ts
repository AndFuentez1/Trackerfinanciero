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
import type { ProfileSelect } from './useFinanceQueries';

export function useProfileManagement(profile?: ProfileSelect | null) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Profile state
    const [currency, setCurrency] = useState('COP');
    const [decimalPlaces, setDecimalPlaces] = useState(0);
    const [profileData, setProfileData] = useState<{
        currency: string;
        onboarding_decision: string | null;
        has_pending_import: boolean | null;
        welcome_completed: boolean | null;
        decimal_places: number | null;
        base_color: string | null;
    } | null>(null);

    // Sync local profile state with fetched profile
    useEffect(() => {
        if (!profile) return;
        setProfileData(profile);
        if (profile.currency) setCurrency(profile.currency);
        if (typeof profile.decimal_places === 'number') setDecimalPlaces(profile.decimal_places);
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
    }) => {
        if (!user) {
            toast({ title: 'Error', description: 'No autenticado', variant: 'destructive' });
            return { error: 'No autenticado' };
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            // Update local state
            if (updates.currency !== undefined) setCurrency(updates.currency);
            if (updates.decimal_places !== undefined) setDecimalPlaces(updates.decimal_places);
            const nextProfile = { ...(profileData || {}), ...updates };
            setProfileData(nextProfile);

            // Keep React Query cache in sync
            queryClient.setQueryData(
                queryKeys.finance.profile(user.id),
                (prev: ProfileSelect | null) => ({ ...(prev || {}), ...updates })
            );

            toast({ title: 'Perfil actualizado', description: 'Cambios guardados correctamente' });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            console.error('Error updating profile:', error);
            toast({ title: 'Error', description: message, variant: 'destructive' });
            return { error: message };
        }
    }, [user, toast, profileData, queryClient]);

    /**
     * Reset operational data (transactions, budgets, etc.) but keep configuration (categories, payment methods)
     */
    const resetOperationalData = useCallback(async () => {
        if (!user) return { error: 'No autenticado' };

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
            if (pmError) errors.push(`métodos de pago: ${pmError.message}`);

            if (errors.length > 0) {
                toast({
                    title: 'Errores al resetear datos operativos',
                    description: errors.join(', '),
                    variant: 'destructive',
                });
                return { error: errors.join(', ') };
            }

            toast({ title: 'Datos reseteados', description: 'Tus datos operativos han sido eliminados. Configuración conservada.' });
            return { success: true };
        } catch (error: any) {
            console.error('Error resetting operational data:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            return { error: error.message };
        }
    }, [user, toast]);

    /**
     * Reset all profile data (dangerous operation)
     */
    const resetProfileData = useCallback(async () => {
        if (!user) return { error: 'No autenticado' };

        const errors: string[] = [];

        try {
            // Delete in correct order to respect foreign key constraints
            const tablesToReset = [
                'transactions',
                'budgets',
                'savings_transactions',
                'savings_accounts',
                'loans',
                'future_expenses',
                'payment_methods',
                'categories',
            ];

            for (const table of tablesToReset) {
                const { error } = await supabase
                    .from(table as any)
                    .delete()
                    .eq('user_id', user.id);

                if (error) {
                    console.error(`Error deleting ${table}:`, error);
                    errors.push(`${table}: ${error.message}`);
                }
            }

            // Reset profile settings
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    onboarding_decision: null,
                    has_pending_import: false,
                    welcome_completed: false,
                })
                .eq('id', user.id);

            if (profileError) {
                errors.push(`profile: ${profileError.message}`);
            }

            if (errors.length > 0) {
                toast({
                    title: 'Errores al resetear',
                    description: `Algunos datos no pudieron eliminarse: ${errors.join(', ')}`,
                    variant: 'destructive',
                });
                return { error: errors.join(', ') };
            }

            toast({ title: 'Perfil reseteado', description: 'Todos los datos han sido eliminados' });
            queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            console.error('Error resetting profile:', error);
            toast({ title: 'Error', description: message, variant: 'destructive' });
            return { error: message };
        }
    }, [user, toast, queryClient]);

    /**
     * Convert currency for all transactions
     */
    const convertCurrency = useCallback(async (rate: number, newCurrency: string, dryRun = false) => {
        if (!user) return { error: 'No autenticado' };

        try {
            // Fetch all transactions
            const { data: transactions, error: fetchError } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            const updates = transactions?.map(t => ({
                id: t.id,
                amount: Number(t.amount) * rate,
            })) || [];

            if (dryRun) {
                return { preview: updates, totalTransactions: updates.length };
            }

            // Update all transactions
            for (const update of updates) {
                const { error } = await supabase
                    .from('transactions')
                    .update({ amount: update.amount })
                    .eq('id', update.id);

                if (error) throw error;
            }

            // Update profile currency
            await updateProfile({ currency: newCurrency });

            toast({
                title: 'Conversión completada',
                description: `${updates.length} transacciones convertidas a ${newCurrency}`,
            });

            return { success: true, converted: updates.length };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            console.error('Error converting currency:', error);
            toast({ title: 'Error', description: message, variant: 'destructive' });
            return { error: message };
        }
    }, [user, toast, updateProfile]);

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
