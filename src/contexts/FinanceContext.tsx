import React, { useContext, ReactNode } from 'react';
import { useFinanceDataLogic } from '../hooks/useFinanceData';
import { FinanceContext } from './FinanceContextInstance';

export { FinanceContext };

export function FinanceProvider({ children }: { children: ReactNode }) {

    const financeData = useFinanceDataLogic();
    const memoizedData = React.useMemo(() => financeData, [financeData]);

    return (
        <FinanceContext.Provider value={memoizedData}>
            {children}
        </FinanceContext.Provider>
    );
}

export function useFinance() {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
}
