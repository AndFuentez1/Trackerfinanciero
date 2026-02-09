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
            if (paymentMethodsRes.error) throw paymentMethodsRes.error;
            if (transactionsRes.error) throw transactionsRes.error;
            if (categoriesRes.error) throw categoriesRes.error;
            if (budgetsRes.error) throw budgetsRes.error;
            if (savingsAccountsRes.error) throw savingsAccountsRes.error;
            if (savingsTransactionsRes.error) throw savingsTransactionsRes.error;
            if (futureExpensesRes.error) throw futureExpensesRes.error;

            // Format data for Excel
            const paymentMethodsData = (paymentMethodsRes.data || []).map(pm => ({
                'Nombre': pm.name,
                'Tipo': pm.type,
                'Balance': pm.balance || 0,
                'Límite de Crédito': pm.credit_limit || 0,
                'Meta de Ahorro': pm.savings_goal || 0,
                'Fecha de Creación': pm.created_at ? format(new Date(pm.created_at), 'dd/MM/yyyy HH:mm') : '',
            }));

            const transactionsData = (transactionsRes.data || []).map(t => ({
                'Fecha': t.date ? format(new Date(t.date), 'dd/MM/yyyy') : '',
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
                'Fecha de Creación': b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy HH:mm') : '',
            }));

            const savingsData = (savingsTransactionsRes.data || []).map(st => ({
                'Cuenta de Ahorro': st.payment_methods?.name || '',
                'Tipo de Transacción': st.type || '',
                'Monto': st.amount || 0,
                'Fecha': st.date ? format(new Date(st.date), 'dd/MM/yyyy') : '',
                'Descripción': st.description || '',
                'Rendimiento Calculado': st.calculated_yield || 0,
                'Balance Después': st.balance_after_transaction || 0,
            }));

            const futureExpensesData = (futureExpensesRes.data || []).map(fe => ({
                'Descripción': fe.description || '',
                'Monto': fe.amount || 0,
                'Fecha de Pago': fe.payment_date ? format(new Date(fe.payment_date), 'dd/MM/yyyy') : '',
                'Categoría': fe.categories?.name || '',
                'Es Suscripción': fe.is_subscription ? 'Sí' : 'No',
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
        } catch (error: any) {
            console.error('Error exporting data:', error);

            // More detailed error message
            let errorMessage = 'No se pudo exportar los datos. Por favor, intenta de nuevo.';
            if (error?.message) {
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

    return {
        exportAllData,
        isExporting,
    };
}


