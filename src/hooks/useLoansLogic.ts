import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFinanceData } from './useFinanceData';

import { Loan, LoanRow, LoanPayment, LoanPaymentRow } from './financeTypes';


export function useLoansDataLogic() {
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
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { loans, loading, refetch: fetchData };
}


