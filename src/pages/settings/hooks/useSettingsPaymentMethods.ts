import { useFinanceData } from '@/hooks/useFinanceData';

export function useSettingsPaymentMethods() {
    const {
        paymentMethods,
        addPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,
        loading
    } = useFinanceData();

    return {
        paymentMethods,
        addPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,
        loading
    };
}
