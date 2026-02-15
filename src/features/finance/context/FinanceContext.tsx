import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import { useFinanceDataLogic } from '../hooks/useFinanceDataLogic';

const FinanceContext = createContext<ReturnType<typeof useFinanceDataLogic> | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
    const financeData = useFinanceDataLogic();
    return (
        <FinanceContext.Provider value={financeData}>
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
