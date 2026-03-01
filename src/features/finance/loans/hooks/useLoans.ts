import { useLoans as useLoansContext } from '@/features/finance/loans/context/LoansContext';
import type { Loan, LoanRow } from '@/features/finance/hooks/useLoansLogic';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useToast } from '@/shared/hooks/use-toast';
import { getTodayLocalDate } from '@/core/utils';

export * from '@/features/finance/hooks/useLoansLogic';

// Main hook consuming Context
export function useLoans() {
    return useLoansContext();
}

export function useCreateLoan() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { addTransaction } = useFinanceData();

    const createLoan = async (loan: Omit<Loan, 'id' | 'created_at' | 'user_id' | 'paid_amount' | 'payments'> & { is_disbursed?: boolean }, initialPaidAmount: number = 0) => {
        if (!user) {return { error: 'No autenticado' };}

        // 1. Create the loan with exact validated database column names (snake_case)
        // Ensure due_date is a simple string 'YYYY-MM-DD' or null
        const insertData = {
            name: String(loan.name),
            total_amount: Number(loan.total_amount),
            type: loan.type,
            interest_rate: Number(loan.interest_rate || 0),
            due_date: loan.due_date ? String(loan.due_date) : null,
            payment_method_id: loan.is_disbursed === false ? null : (loan.payment_method_id || null),
            user_id: user.id,
            paid_amount: Number(initialPaidAmount || 0),
            is_disbursed: loan.is_disbursed !== false,
            installments: loan.installments || null,
        };

        const { data: loanData, error: loanError } = await supabase
            .from('loans' as any)
            .insert(insertData)
            .select()
            .single();

        if (loanError) {
            toast({ title: 'Error', description: 'No se pudo crear el préstamo', variant: 'destructive' });
            return { error: loanError };
        }

        const createdLoan = loanData as unknown as LoanRow;

        // 2. Add initial payment to loan_payments table if exists
        if (initialPaidAmount > 0) {
            const { error: paymentError } = await supabase
                .from('loan_payments' as any)
                .insert({
                    loan_id: createdLoan.id,
                    amount: initialPaidAmount,
                    date: getTodayLocalDate(),
                });

            if (paymentError) {
                console.error('[useLoans] Failed to create initial loan payment', paymentError);
                toast({
                    title: 'Advertencia',
                    description: 'El préstamo se creó, pero no se registró el abono inicial.',
                    variant: 'default'
                });
            }
        }

        // 3. Auto-generate transaction for loan creation (cash-in/out)
        await addTransaction({
            type: loan.type === 'borrowed' ? 'income' : 'expense',
            category: 'Préstamos',
            amount: loan.total_amount,
            description: `Préstamo: ${loan.name}${loan.is_disbursed === false ? ' (Sin desembolso)' : ''}`,
            date: getTodayLocalDate(),
            payment_method_id: loan.is_disbursed === false ? null : (loan.payment_method_id || null),
        });

        // 4. Record initial payment as transaction
        if (initialPaidAmount > 0) {
            await addTransaction({
                type: loan.type === 'borrowed' ? 'expense' : 'income',
                category: 'Préstamos',
                amount: initialPaidAmount,
                description: `Abono inicial préstamo: ${loan.name}`,
                date: getTodayLocalDate(),
                payment_method_id: loan.is_disbursed === false ? null : (loan.payment_method_id || null),
            });
        }

        toast({ title: 'Éxito', description: 'Préstamo creado correctamente' });
        return { data: loanData, error: null };
    };

    return { createLoan };
}

export function useCreateLoanPayment() {
    const { toast } = useToast();
    const { addTransaction } = useFinanceData();

    const createPayment = async (payment: {
        loan_id: string,
        amount: number,
        date: string,
        type: 'borrowed' | 'lent',
        name: string,
        payment_method_id?: string
    }) => {
        const { data, error } = await supabase
            .from('loan_payments' as any)
            .insert({
                loan_id: payment.loan_id,
                amount: payment.amount,
                date: payment.date,
            })
            .select()
            .single();

        if (error) {
            toast({ title: 'Error', description: 'No se pudo registrar el pago', variant: 'destructive' });
            return { error };
        }

        // Also update the paid_amount in the main loans table for consistency
        const { data: loanData } = await supabase
            .from('loans' as any)
            .select('paid_amount')
            .eq('id', payment.loan_id)
            .single();

        if (loanData) {
            const existingPaid = (loanData as { paid_amount?: number | string }).paid_amount;
            const newPaid = (Number(existingPaid) || 0) + payment.amount;
            await supabase
                .from('loans' as any)
                .update({ paid_amount: newPaid })
                .eq('id', payment.loan_id);
        }


        // Sync with transactions
        // Note: For 'borrowed' (Deuda), paying it is an EXPENSE (money leaves).
        // For 'lent' (Prestado), receiving payment is INCOME (money enters).
        await addTransaction({
            type: payment.type === 'borrowed' ? 'expense' : 'income',
            category: 'Préstamos', // Standardized to "Préstamos"
            amount: payment.amount,
            description: `Abono a préstamo: ${payment.name}`,
            date: payment.date,
            payment_method_id: payment.payment_method_id || null // Pass the source/dest account
        });

        toast({ title: 'Éxito', description: 'Pago registrado correctamente' });
        return { data, error: null };
    };

    return { createPayment };
}

export function useUpdateLoan() {
    const { toast } = useToast();

    const updateLoan = async (id: string, updates: Partial<Loan>) => {
        // Remove virtual/derived fields that are NOT columns in the DB
        const { paid_amount, payments, ...dbUpdates } = updates as any;

        const { data, error } = await supabase
            .from('loans' as any)
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[useUpdateLoan] Error:', error);
            toast({ title: 'Error', description: 'No se pudo actualizar el préstamo', variant: 'destructive' });
            return { error };
        }

        toast({ title: 'Actualizado', description: 'Préstamo actualizado correctamente' });
        return { data, error: null };
    };

    const deleteLoan = async (id: string) => {
        const { error } = await supabase
            .from('loans' as any)
            .delete()
            .eq('id', id);

        if (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar el préstamo', variant: 'destructive' });
            return { error };
        }

        toast({ title: 'Eliminado', description: 'Préstamo eliminado correctamente' });
        return { error: null };
    };

    return { updateLoan, deleteLoan };
}



