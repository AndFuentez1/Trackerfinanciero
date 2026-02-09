import React, { createContext, useContext, ReactNode } from 'react';
import { useLoansDataLogic } from '@/features/finance/hooks/useLoansLogic';

const LoansContext = createContext<ReturnType<typeof useLoansDataLogic> | undefined>(undefined);

export function LoansProvider({ children }: { children: ReactNode }) {
    const loansData = useLoansDataLogic();
    return (
        <LoansContext.Provider value={loansData}>
            {children}
        </LoansContext.Provider>
    );
}

export function useLoans() {
    const context = useContext(LoansContext);
    if (context === undefined) {
        throw new Error('useLoans must be used within a LoansProvider');
    }
    return context;
}
