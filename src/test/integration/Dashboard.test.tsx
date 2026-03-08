import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useBudgetsData } from '@/features/finance/hooks/useBudgetsData';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/features/auth/hooks/useAuth', () => ({
    useAuth: vi.fn()
}));
vi.mock('@/features/finance/hooks/useUserConfig', () => ({
    useUserConfig: vi.fn(() => ({
        config: { hide_incomplete_alert: false, keep_session_alive: true },
        updateConfig: vi.fn(),
        loaded: true
    }))
}));
vi.mock('@/features/finance/hooks/useFinanceData');
vi.mock('@/features/finance/hooks/useBudgetsData');

// Mock child components to focus on Dashboard logic
vi.mock('@/features/dashboard/components/SummaryTab', () => ({
    SummaryTab: () => <div data-testid="summary-tab">Resumen Financiero</div>
}));
vi.mock('@/features/auth/components/WelcomePanel', () => ({
    WelcomePanel: () => <div data-testid="welcome-panel">Bienvenido</div>
}));
vi.mock('@/features/auth/components/OnboardingDecisionPanel', () => ({
    OnboardingDecisionPanel: () => <div data-testid="decision-panel">Decisión</div>
}));
vi.mock('@/features/finance/transactions/components/AddTransactionDialog', () => ({
    AddTransactionDialog: () => <button>Agregar Transacción</button>
}));
vi.mock('@/features/finance/transactions/components/ImportExcelDialog', () => ({
    ImportExcelDialog: () => <button>Importar Excel</button>
}));

// Mock utils to avoid calculation errors
vi.mock('@/features/finance/utils/financeUtils', () => ({
    calculateSummary: vi.fn(() => ({
        totalIncome: 1000,
        totalExpenses: 500,
        totalSavings: 200,
        totalInvestments: 100,
        netWorth: 500,
        currency: 'COP'
    })),
    calculateExpensesByCategory: vi.fn(() => []),
    calculateInsights: vi.fn(() => [])
}));

describe('Dashboard (Index)', () => {
    const mockUser = { id: 'u1', email: 'test@example.com' };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, loading: false } as unknown as ReturnType<typeof useAuth>);
        vi.mocked(useFinanceData).mockReturnValue({
            summary: { totalBalance: 1000, monthlyIncome: 500, monthlyExpense: 300 },
            loading: false,
            paymentMethods: [],
            categories: [],
            transactions: [],
            allTransactions: [],
            budgets: [],
            welcomeCompleted: true,
            onboardingDecision: 'from_scratch',
            currency: 'COP',
            pendingImportData: [],
            importProgress: { status: 'idle', progress: 0, message: '' },
            hasPendingImport: false
        } as unknown as ReturnType<typeof useFinanceData>);
        vi.mocked(useBudgetsData).mockReturnValue({
            budgets: [],
            loading: false,
            totalBudgeted: 200,
            totalSpent: 100,
            lastModification: null
        } as unknown as ReturnType<typeof useBudgetsData>);
    });

    it('renders loading state when auth is loading', () => {
        vi.mocked(useAuth).mockReturnValue({ user: null, loading: true } as unknown as ReturnType<typeof useAuth>);
        // The component returns loading state
        render(<Dashboard />, { wrapper: MemoryRouter });
        expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
    });

    it('renders SummaryTab when onboarding is complete', async () => {
        render(<Dashboard />, { wrapper: MemoryRouter });
        await waitFor(() => {
            expect(screen.getByTestId('summary-tab')).toBeInTheDocument();
            expect(screen.getByText('Panel Principal')).toBeInTheDocument();
        });
    });

    it('renders WelcomePanel when onboarding NOT complete', async () => {
        vi.mocked(useFinanceData).mockReturnValue({
            loading: false,
            transactions: [],
            allTransactions: [],
            budgets: [],
            paymentMethods: [], // Empty for empty state
            categories: [], // Empty for empty state
            welcomeCompleted: false, // Target condition
            onboardingDecision: null,
            currency: 'COP',
            pendingImportData: [],
            importProgress: { status: 'idle', progress: 0, message: '' }
        } as unknown as ReturnType<typeof useFinanceData>);

        render(<Dashboard />, { wrapper: MemoryRouter });
        await waitFor(() => {
            expect(screen.getByTestId('welcome-panel')).toBeInTheDocument();
            expect(screen.queryByTestId('summary-tab')).not.toBeInTheDocument();
        });
    });

    it('renders DecisionPanel when decision is pending', async () => {
        vi.mocked(useFinanceData).mockReturnValue({
            loading: false,
            transactions: [],
            allTransactions: [],
            budgets: [],
            welcomeCompleted: true,
            onboardingDecision: null, // Pending decision
            paymentMethods: [{ id: 'p1', name: 'Test PM', type: 'cash', balance: 0 }], // Has data
            categories: [{ id: 'c1', name: 'Test Cat', type: 'expense', color: '#000' }],
            currency: 'COP',
            pendingImportData: [],
            importProgress: { status: 'idle', progress: 0, message: '' },
            hasPendingImport: false
        } as unknown as ReturnType<typeof useFinanceData>);

        render(<Dashboard />, { wrapper: MemoryRouter });
        await waitFor(() => {
            expect(screen.getByTestId('decision-panel')).toBeInTheDocument();
        });
    });
});
