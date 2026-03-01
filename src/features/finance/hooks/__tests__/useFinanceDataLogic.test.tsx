import { renderHook } from '@testing-library/react';
import { useFinanceDataLogic } from '../useFinanceDataLogic';
import { describe, it, expect, vi } from 'vitest';

// Mocks
vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user1' } })
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() }))
}));

vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('../useFinanceQueries', () => ({
  useFinanceQueries: () => ({
    paymentMethods: [{ id: 'pm1', balance: 100 }],
    categories: [],
    budgets: [],
    profile: { currency: 'COP' },
    pendingInvoices: [],
    queriesLoading: false,
    pmLoading: false,
    catsLoading: false,
  })
}));

vi.mock('../useFinanceUI', () => ({
  useFinanceUI: () => ({
    dateFilter: 'all',
    sortConfig: { column: 'date', direction: 'desc' },
    page: 1,
    pendingImportData: [],
    loading: false,
    actionLoading: false,
    setPendingImportData: vi.fn(),
    setManualLoading: vi.fn(),
    setOnboardingDecision: vi.fn(),
    setHasPendingImport: vi.fn(),
    setWelcomeCompleted: vi.fn(),
    setHasMore: vi.fn(),
  })
}));

vi.mock('../useProfileManagement', () => ({
  useProfileManagement: () => ({
    currency: 'COP',
    updateProfile: vi.fn()
  })
}));

vi.mock('../useTheme', () => ({
  useTheme: () => ({
    baseColor: 'blue',
  })
}));

vi.mock('../useTransactionData', () => ({
  useTransactionData: () => ({
    transactions: [{ id: 't1', amount: 50 }],
    allTransactions: [],
    rangeTransactions: [],
    budgetsWithSpending: [{ id: 'b1', amount: 500, spent: 100 }],
    summary: { totalIncome: 0, totalExpenses: 0, totalSavings: 0, totalInvestments: 0 },
    hasMore: false,
    transactionsLoading: false
  })
}));

vi.mock('../useFinanceMutations', () => ({
  useFinanceMutations: () => ({
    addTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  })
}));

describe('useFinanceDataLogic', () => {
    it('aggregates data correctly from all injected sub-hooks', () => {
        const { result } = renderHook(() => useFinanceDataLogic());
        
        // Assertions verifying it successfully pulled from mocks
        expect(result.current.transactions).toHaveLength(1);
        expect(result.current.transactions[0].id).toBe('t1');
        
        expect(result.current.paymentMethods).toHaveLength(1);
        expect(result.current.currency).toBe('COP');

        // Validating calculated values logic
        expect(result.current.totalBudget).toBe(500);
        expect(result.current.totalSpentCurrentMonth).toBe(100);

        // Validating action references
        expect(typeof result.current.addTransaction).toBe('function');
    });
});
