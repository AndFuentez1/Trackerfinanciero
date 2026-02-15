import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useToast } from '@/shared/hooks/use-toast';

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
    installments?: number;
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
    installments?: number | null;
}

export function useLoansDataLogic() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) {return;}

        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase
            .from('loans' as any)
            .select('*, loan_payments(*)')
            .eq('user_id', user.id);

        if (err) {
            setError(err.message ?? 'No se pudieron cargar los préstamos');
            toast({ title: 'Error', description: err.message ?? 'No se pudieron cargar los préstamos. Revisa tu conexión.', variant: 'destructive' });
            setLoans([]);
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
                    installments: l.installments ? Number(l.installments) : undefined,
                };
            }));
        }
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { loans, loading, error, refetch: fetchData };
}



