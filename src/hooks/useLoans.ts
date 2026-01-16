import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFinanceData } from './useFinanceData';

export interface LoanPayment {
    id: string;
    loan_id: string;
    amount: number;
    date: string;
    created_at: string;
}

export interface Loan {
    id: string;
    name: string;
    total_amount: number;
    paid_amount: number; // Derived field
    interest_rate: number;
    due_date: string | null;
    payment_method_id: string | null;
    created_at: string;
    user_id: string;
    type: 'borrowed' | 'lent';
    payments?: LoanPayment[];
    is_disbursed?: boolean;
}

// Row types from the database
export interface LoanPaymentRow {
    id: string;
    loan_id: string;
    amount: number | string;
    date: string;
    created_at?: string;
}

export interface LoanRow {
    id: string;
    name: string;
    total_amount: number | string;
    interest_rate: number | string;
    due_date?: string | null;
    payment_method_id?: string | null;
    created_at?: string;
    user_id: string;
    type?: 'borrowed' | 'lent' | string;
    loan_payments?: LoanPaymentRow[];
    is_disbursed?: boolean;
}

export function useLoans() {
    const { user } = useAuth();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('loans' as any)
            .select('*, loan_payments(*)')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching loans:', error);
        } else if (data) {
            setLoans((data as unknown as LoanRow[]).map((l: LoanRow) => {
                const payments = ((l.loan_payments || []) as LoanPaymentRow[]).map((p) => ({
                    id: p.id,
                    loan_id: p.loan_id,
                    amount: Number(p.amount || 0),
                    date: p.date,
                    created_at: p.created_at || new Date().toISOString(),
                }));
                const paid_amount = payments.reduce((sum: number, p) => sum + Number(p.amount), 0);

                return {
                    id: l.id,
                    name: l.name,
                    total_amount: Number(l.total_amount || 0),
                    paid_amount,
                    interest_rate: Number(l.interest_rate || 0),
                    due_date: l.due_date || null,
                    payment_method_id: l.payment_method_id || null,
                    created_at: l.created_at || new Date().toISOString(),
                    user_id: l.user_id,
                    type: (l.type as 'borrowed' | 'lent') || 'borrowed',
                    payments,
                    is_disbursed: l.is_disbursed,
                };
            }));
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { loans, loading, refetch: fetchData };
}

export function useCreateLoan() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { addTransaction } = useFinanceData();

    const createLoan = async (loan: Omit<Loan, 'id' | 'created_at' | 'user_id' | 'paid_amount' | 'payments'> & { is_disbursed?: boolean }, initialPaidAmount: number = 0) => {
        if (!user) return { error: 'No autenticado' };

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
                    date: new Date().toISOString().split('T')[0],
                });

            if (paymentError) {
                console.error('Error creating initial payment:', paymentError);
            }
        }

        // 3. Auto-generate transaction for loan creation (cash-in/out)
        await addTransaction({
            type: loan.type === 'borrowed' ? 'income' : 'expense',
            category: 'Préstamos',
            amount: loan.total_amount,
            description: `Préstamo: ${loan.name}${loan.is_disbursed === false ? ' (Sin desembolso)' : ''}`,
            date: new Date().toISOString().split('T')[0],
            payment_method_id: loan.is_disbursed === false ? null : (loan.payment_method_id || null),
        });

        // 4. Record initial payment as transaction
        if (initialPaidAmount > 0) {
            await addTransaction({
                type: loan.type === 'borrowed' ? 'expense' : 'income',
                category: 'Préstamos',
                amount: initialPaidAmount,
                description: `Abono inicial préstamo: ${loan.name}`,
                date: new Date().toISOString().split('T')[0],
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
        // Remove virtual fields
        const { paid_amount, payments, ...cleanUpdates } = updates as Partial<Loan>;

        const { data, error } = await supabase
            .from('loans' as any)
            .update(cleanUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
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
