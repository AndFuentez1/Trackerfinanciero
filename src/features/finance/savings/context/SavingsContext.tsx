import React, { createContext, useContext, ReactNode } from 'react';
import { useSavingsDataLogic } from '@/features/finance/hooks/useSavingsLogic';

const SavingsContext = createContext<ReturnType<typeof useSavingsDataLogic> | undefined>(undefined);

export function SavingsProvider({ children }: { children: ReactNode }) {
    const savingsData = useSavingsDataLogic();
    return (
        <SavingsContext.Provider value={savingsData}>
            {children}
        </SavingsContext.Provider>
    );
}

export function useSavings() {
    const context = useContext(SavingsContext);
    if (context === undefined) {
        throw new Error('useSavings must be used within a SavingsProvider');
    }
    return context;
}
