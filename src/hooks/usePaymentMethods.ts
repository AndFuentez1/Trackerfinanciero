import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PaymentMethod, PaymentMethodType } from './useFinanceData';

export function usePaymentMethods() {
    const { user } = useAuth();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPaymentMethods = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching payment methods:', error);
        } else {
            setPaymentMethods(data.map(pm => ({
                id: pm.id,
                name: pm.name,
                type: pm.type as PaymentMethodType,
                balance: Number(pm.balance),
                credit_limit: pm.credit_limit ? Number(pm.credit_limit) : null,
            })));
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchPaymentMethods();
    }, [fetchPaymentMethods]);

    return { paymentMethods, loading, refetch: fetchPaymentMethods };
}
