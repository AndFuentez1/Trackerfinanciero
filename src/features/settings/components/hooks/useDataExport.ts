import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function useDataExport() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);

    const exportAllData = async () => {
        if (!user) {
            toast({
                title: 'Error',
                description: 'Debes estar autenticado para exportar datos',
                variant: 'destructive',
            });
            return;
        }

        setIsExporting(true);

        try {
            // Fetch all data from Supabase
            const [
                paymentMethodsRes,
                transactionsRes,
                categoriesRes,
                budgetsRes,
                savingsAccountsRes,
                savingsTransactionsRes,
                futureExpensesRes,
            ] = await Promise.all([
                supabase.from('payment_methods').select('*').eq('user_id', user.id),
                supabase.from('transactions').select('*, categories(name), payment_methods!transactions_payment_method_id_fkey(name)').eq('user_id', user.id),
                supabase.from('categories').select('*').eq('user_id', user.id),
                supabase.from('budgets').select('*, categories(name)').eq('user_id', user.id),
                supabase.from('savings_accounts').select('*').eq('user_id', user.id),
                supabase.from('savings_transactions').select('*, payment_methods!savings_transactions_payment_method_id_fkey(name)').eq('user_id', user.id),
                supabase.from('future_expenses').select('*, categories(name)').eq('user_id', user.id),
            ]);

            // Check for errors
            if (paymentMethodsRes.error) { throw paymentMethodsRes.error; }
            if (transactionsRes.error) { throw transactionsRes.error; }
            if (categoriesRes.error) { throw categoriesRes.error; }
            if (budgetsRes.error) { throw budgetsRes.error; }
            if (savingsAccountsRes.error) { throw savingsAccountsRes.error; }
            if (savingsTransactionsRes.error) { throw savingsTransactionsRes.error; }
            if (futureExpensesRes.error) { throw futureExpensesRes.error; }

            // Format data for Excel
            const paymentMethodsData = (paymentMethodsRes.data || []).map(pm => ({
                'Nombre': pm.name,
                'Tipo': pm.type,
                'Balance': pm.balance || 0,
                'Límite de Crédito': pm.credit_limit || 0,
                'Meta de Ahorro': pm.savings_goal || 0,
                'Fecha de Creación': pm.created_at ? new Date(pm.created_at) : null,
            }));

            const transactionsData = (transactionsRes.data || []).map(t => ({
                'Fecha': t.date ? new Date(t.date) : null,
                'Tipo': t.type,
                'Categoría': t.categories?.name || '',
                'Monto': t.amount || 0,
                'Descripción': t.description || '',
                'Método de Pago': t.payment_methods?.name || '',
                'Cuotas': t.installments || 0,
            }));

            const categoriesData = (categoriesRes.data || []).map(c => ({
                'Nombre': c.name,
                'Tipo': c.type,
                'Color': c.color,
                'Meta de Ahorro': c.savings_goal || 0,
            }));

            const budgetsData = (budgetsRes.data || []).map(b => ({
                'Categoría': b.categories?.name || '',
                'Monto': b.amount || 0,
                'Período': b.period || '',
                'Fecha de Creación': b.created_at ? new Date(b.created_at) : null,
            }));

            const savingsData = (savingsTransactionsRes.data || []).map(st => ({
                'Cuenta de Ahorro': st.payment_methods?.name || '',
                'Tipo de Transacción': st.type || '',
                'Monto': st.amount || 0,
                'Fecha': st.date ? new Date(st.date) : null,
                'Descripción': st.description || '',
                'Rendimiento Calculado': st.calculated_yield || 0,
                'Balance Después': st.balance_after_transaction || 0,
            }));

            const futureExpensesData = (futureExpensesRes.data || []).map(fe => ({
                'Descripción': fe.description || '',
                'Monto': fe.amount || 0,
                'Fecha de Pago': fe.payment_date ? new Date(fe.payment_date) : null,
                'Categoría': fe.categories?.name || '',
                'Es Suscripción': fe.is_subscription,
                'Frecuencia': fe.frequency || '',
                'Estado': fe.status || '',
            }));

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Add sheets
            const ws1 = XLSX.utils.json_to_sheet(paymentMethodsData);
            XLSX.utils.book_append_sheet(wb, ws1, 'Métodos de Pago');

            const ws2 = XLSX.utils.json_to_sheet(transactionsData);
            XLSX.utils.book_append_sheet(wb, ws2, 'Transacciones');

            const ws3 = XLSX.utils.json_to_sheet(categoriesData);
            XLSX.utils.book_append_sheet(wb, ws3, 'Categorías');

            const ws4 = XLSX.utils.json_to_sheet(budgetsData);
            XLSX.utils.book_append_sheet(wb, ws4, 'Presupuestos');

            const ws5 = XLSX.utils.json_to_sheet(savingsData);
            XLSX.utils.book_append_sheet(wb, ws5, 'Ahorros');

            const ws6 = XLSX.utils.json_to_sheet(futureExpensesData);
            XLSX.utils.book_append_sheet(wb, ws6, 'Gastos Futuros');

            // Generate file name with current date
            const fileName = `finanzas_backup_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

            // Download file
            XLSX.writeFile(wb, fileName);

            toast({
                title: 'Exportación exitosa',
                description: `Se ha descargado el archivo ${fileName}`,
            });
        } catch (error: unknown) {
            console.error('Error exporting data:', error);

            let errorMessage = 'Error al exportar los datos.';
            if (error instanceof Error && error.message) {
                errorMessage = `Error: ${error.message}`;
            }

            toast({
                title: 'Error al exportar',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    const exportSelectedData = async (selections: {
        paymentMethods: boolean;
        transactions: boolean;
        categories: boolean;
        budgets: boolean;
        savings: boolean;
        futureExpenses: boolean;
    }) => {
        if (!user) {
            toast({
                title: 'Error',
                description: 'Debes estar autenticado para exportar datos',
                variant: 'destructive',
            });
            return;
        }

        setIsExporting(true);

        try {
            // Fetch only selected data
            const promises = [];

            if (selections.paymentMethods) {
                promises.push(supabase.from('payment_methods').select('*').eq('user_id', user.id).then(res => ({ key: 'paymentMethods', ...res })));
            }
            if (selections.transactions) {
                promises.push(supabase.from('transactions').select('*, categories(name), payment_methods!transactions_payment_method_id_fkey(name)').eq('user_id', user.id).then(res => ({ key: 'transactions', ...res })));
            }
            if (selections.categories) {
                promises.push(supabase.from('categories').select('*').eq('user_id', user.id).then(res => ({ key: 'categories', ...res })));
            }
            if (selections.budgets) {
                promises.push(supabase.from('budgets').select('*, categories(name)').eq('user_id', user.id).then(res => ({ key: 'budgets', ...res })));
            }
            if (selections.savings) {
                promises.push(supabase.from('savings_accounts').select('*').eq('user_id', user.id).then(res => ({ key: 'savingsAccounts', ...res })));
                promises.push(supabase.from('savings_transactions').select('*, payment_methods!savings_transactions_payment_method_id_fkey(name)').eq('user_id', user.id).then(res => ({ key: 'savingsTransactions', ...res })));
            }
            if (selections.futureExpenses) {
                promises.push(supabase.from('future_expenses').select('*, categories(name)').eq('user_id', user.id).then(res => ({ key: 'futureExpenses', ...res })));
            }

            const results = await Promise.all(promises);
            const dataMap: Record<string, unknown[]> = {};

            for (const res of results) {
                if (res.error) { throw res.error; }
                dataMap[res.key] = res.data;
            }

            // Create workbook
            const wb = XLSX.utils.book_new();

            if (selections.paymentMethods && dataMap.paymentMethods) {
                const data = dataMap.paymentMethods.map((_pm) => {
                    const pm = _pm as { name: string; type: string; balance: number; credit_limit: number; savings_goal: number; created_at: string | null };
                    return {
                        'Nombre': pm.name,
                        'Tipo': pm.type,
                        'Balance': pm.balance || 0,
                        'Límite de Crédito': pm.credit_limit || 0,
                        'Meta de Ahorro': pm.savings_goal || 0,
                        'Fecha de Creación': pm.created_at ? new Date(pm.created_at) : null,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Métodos de Pago');
            }

            if (selections.transactions && dataMap.transactions) {
                const data = dataMap.transactions.map((_t) => {
                    const t = _t as { date: string; type: string; categories?: { name: string }; amount: number; description: string; payment_methods?: { name: string }; installments: number };
                    return {
                        'Fecha': t.date ? new Date(t.date) : null,
                        'Tipo': t.type,
                        'Categoría': t.categories?.name || '',
                        'Monto': t.amount || 0,
                        'Descripción': t.description || '',
                        'Método de Pago': t.payment_methods?.name || '',
                        'Cuotas': t.installments || 0,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
            }

            if (selections.categories && dataMap.categories) {
                const data = dataMap.categories.map((_c) => {
                    const c = _c as { name: string; type: string; color: string; savings_goal: number };
                    return {
                        'Nombre': c.name,
                        'Tipo': c.type,
                        'Color': c.color,
                        'Meta de Ahorro': c.savings_goal || 0,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Categorías');
            }

            if (selections.budgets && dataMap.budgets) {
                const data = dataMap.budgets.map((_b) => {
                    const b = _b as { categories?: { name: string }; amount: number; period: string; created_at: string | null };
                    return {
                        'Categoría': b.categories?.name || '',
                        'Monto': b.amount || 0,
                        'Período': b.period || '',
                        'Fecha de Creación': b.created_at ? new Date(b.created_at) : null,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Presupuestos');
            }

            if (selections.savings && dataMap.savingsTransactions) {
                const data = dataMap.savingsTransactions.map((_st) => {
                    const st = _st as { payment_methods?: { name: string }; type: string; amount: number; date: string | null; description: string; calculated_yield: number; balance_after_transaction: number };
                    return {
                        'Cuenta de Ahorro': st.payment_methods?.name || '',
                        'Tipo de Transacción': st.type || '',
                        'Monto': st.amount || 0,
                        'Fecha': st.date ? new Date(st.date) : null,
                        'Descripción': st.description || '',
                        'Rendimiento Calculado': st.calculated_yield || 0,
                        'Balance Después': st.balance_after_transaction || 0,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Ahorros');
            }

            if (selections.futureExpenses && dataMap.futureExpenses) {
                const data = dataMap.futureExpenses.map((_fe) => {
                    const fe = _fe as { description: string; amount: number; payment_date: string | null; categories?: { name: string }; is_subscription: boolean; frequency: string; status: string };
                    return {
                        'Descripción': fe.description || '',
                        'Monto': fe.amount || 0,
                        'Fecha de Pago': fe.payment_date ? new Date(fe.payment_date) : null,
                        'Categoría': fe.categories?.name || '',
                        'Es Suscripción': fe.is_subscription,
                        'Frecuencia': fe.frequency || '',
                        'Estado': fe.status || '',
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Gastos Futuros');
            }

            if (wb.SheetNames.length === 0) {
                toast({
                    title: 'Selección vacía',
                    description: 'Debes seleccionar al menos una categoría para exportar',
                    variant: 'destructive',
                });
                return;
            }

            // Generate file name
            const fileName = `finanzas_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast({
                title: 'Exportación exitosa',
                description: `Se ha descargado el archivo ${fileName}`,
            });
        } catch (error: unknown) {
            console.error('Error exporting data:', error);
            const err = error as Error;
            toast({
                title: 'Error al exportar',
                description: err?.message || 'No se pudo exportar los datos',
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return {
        exportAllData,
        exportSelectedData,
        isExporting,
    };
}


