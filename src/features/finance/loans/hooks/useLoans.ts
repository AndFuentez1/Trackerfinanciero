import { useLoans as useLoansContext } from '@/features/finance/loans/context/LoansContext';
import type { Loan, LoanRow } from '@/features/finance/hooks/useLoansLogic';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useToast } from '@/shared/hooks/use-toast';
import { getTodayLocalDate } from '@/core/utils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';

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
        if (!user) { return { error: 'No autenticado' }; }

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
            type: loan.type === 'borrowed' ? 'transfer_in' : 'transfer_out',
            category: 'Préstamos',
            amount: loan.type === 'borrowed' ? Math.abs(loan.total_amount) : -Math.abs(loan.total_amount),
            description: `Préstamo: ${loan.name}${loan.is_disbursed === false ? ' (Sin desembolso)' : ''}`,
            date: getTodayLocalDate(),
            payment_method_id: loan.is_disbursed === false ? null : (loan.payment_method_id || null),
        });

        // 4. Record initial payment as transaction
        if (initialPaidAmount > 0) {
            await addTransaction({
                type: loan.type === 'borrowed' ? 'transfer_out' : 'transfer_in',
                category: 'Préstamos',
                amount: loan.type === 'borrowed' ? -Math.abs(initialPaidAmount) : Math.abs(initialPaidAmount),
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
    const { user } = useAuth();
    const { addTransaction } = useFinanceData();
    const queryClient = useQueryClient();

    const createPayment = async (payment: {
        loan_id: string,
        amount: number,
        date: string,
        type: 'borrowed' | 'lent',
        name: string,
        payment_method_id?: string
    }) => {
        if (!user) return { error: 'No autenticado' };

        // 1. Get current loan data to check remaining balance
        const { data: loanData, error: fetchError } = await supabase
            .from('loans' as any)
            .select('total_amount, paid_amount, type, name')
            .eq('id', payment.loan_id)
            .single();

        if (fetchError || !loanData) {
            toast({ title: 'Error', description: 'No se pudo obtener la información del préstamo', variant: 'destructive' });
            return { error: fetchError };
        }

        const total = Number(loanData.total_amount) || 0;
        const currentPaid = Number(loanData.paid_amount) || 0;
        const remaining = total - currentPaid;
        const isOverpayment = payment.amount > remaining;

        const actualLoanPayment = isOverpayment ? remaining : payment.amount;
        const surplus = isOverpayment ? payment.amount - remaining : 0;

        // 2. Register the payment on the original loan
        const { data: pData, error: pError } = await supabase
            .from('loan_payments' as any)
            .insert({
                loan_id: payment.loan_id,
                amount: actualLoanPayment,
                date: payment.date,
            })
            .select()
            .single();

        if (pError) {
            toast({ title: 'Error', description: 'No se pudo registrar el pago', variant: 'destructive' });
            return { error: pError };
        }

        // 3. Update the paid_amount in the main loans table
        const newPaid = currentPaid + actualLoanPayment;
        await supabase
            .from('loans' as any)
            .update({ paid_amount: newPaid })
            .eq('id', payment.loan_id);

        // 4. Handle overpayment (Surplus) -> Create reverse debt
        if (isOverpayment && surplus > 0) {
            const reverseType = loanData.type === 'borrowed' ? 'lent' : 'borrowed';
            const { error: surplusError } = await supabase
                .from('loans' as any)
                .insert({
                    name: `${loanData.name} (Excedente)`,
                    total_amount: surplus,
                    paid_amount: 0,
                    type: reverseType,
                    user_id: user.id,
                    payment_method_id: payment.payment_method_id || null,
                    is_disbursed: true,
                    updated_at: new Date().toISOString()
                });

            if (surplusError) {
                console.error('[useCreateLoanPayment] Failed to create surplus debt', surplusError);
                toast({
                    title: 'Aviso',
                    description: 'Se pagó el préstamo, pero no se pudo crear la deuda por el excedente.',
                    variant: 'default'
                });
            } else {
                toast({
                    title: 'Pago con excedente',
                    description: `Se liquidó el préstamo y se generó una nueva cuenta por el excedente de ${surplus}.`
                });
            }
        }

        // 5. Sync with transactions (full amount)
        await addTransaction({
            type: payment.type === 'borrowed' ? 'transfer_out' : 'transfer_in',
            category: 'Préstamos',
            amount: payment.type === 'borrowed' ? -Math.abs(payment.amount) : Math.abs(payment.amount),
            description: `Abono a préstamo: ${payment.name}${isOverpayment ? ' (con excedente)' : ''}`,
            date: payment.date,
            payment_method_id: payment.payment_method_id || null
        });

        if (!isOverpayment) {
            toast({ title: 'Éxito', description: 'Pago registrado correctamente' });
        }

        // Invalidate loans to refresh list
        queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });

        return { data: pData, error: null };
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



