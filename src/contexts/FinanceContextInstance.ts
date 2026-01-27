import { createContext } from 'react';
import { FinanceContextState } from '../hooks/financeTypes';

export const FinanceContext = createContext<FinanceContextState | undefined>(undefined);
