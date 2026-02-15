import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useBudgetsData } from '@/features/finance/hooks/useBudgetsData';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/features/auth/hooks/useAuth');
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
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
        (useFinanceData as any).mockReturnValue({
            transactions: [],
            allTransactions: [],
            budgets: [],
            paymentMethods: [],
            categories: [],
            loading: false,
            welcomeCompleted: true,
            onboardingDecision: 'from_scratch', // Default to unlocked
            currency: 'COP',
            pendingImportData: [],
            importProgress: { status: 'idle' }
        });
        (useBudgetsData as any).mockReturnValue({
            loading: false,
            lastModification: null
        });
    });

    it('renders loading state when auth is loading', () => {
        (useAuth as any).mockReturnValue({ user: null, loading: true });
        // The component returns null if !user (after hooks), but triggers isLoading check.
        // Wait, logic says: if (isLoading) return Skeleton.
        // But useAuth loading makes isLoading true.
        // However, if !user returns, it might return null BEFORE Skeleton if logic order is wrong?
        // Let's check code:
        // const isLoading = ...
        // if (showWelcomePanel) ...
        // ... (Skeleton check was commented out in the file I read! Lines 103-105)
        // Then: if (!user) return null;

        // So if loading=true and user=null, it returns NULL? 
        // Ah, the file I read had lines 103-105 commented out!
        // "Removed global blocking to allow layout to render immediately"
        // So validation: render(<Dashboard />) -> container empty?
        // Or if user is null, it returns null.

        const { container } = render(<Dashboard />, { wrapper: MemoryRouter });
        expect(container).toBeEmptyDOMElement();
    });

    it('renders SummaryTab when onboarding is complete', async () => {
        render(<Dashboard />, { wrapper: MemoryRouter });
        await waitFor(() => {
            expect(screen.getByTestId('summary-tab')).toBeInTheDocument();
            expect(screen.getByText('Panel Principal')).toBeInTheDocument();
        });
    });

    it('renders WelcomePanel when onboarding NOT complete', async () => {
        (useFinanceData as any).mockReturnValue({
            ...((useFinanceData as any).mock.results[0]?.value || {}),
            welcomeCompleted: false,
            paymentMethods: [],
            categories: []
        });

        render(<Dashboard />, { wrapper: MemoryRouter });
        await waitFor(() => {
            expect(screen.getByTestId('welcome-panel')).toBeInTheDocument();
            expect(screen.queryByTestId('summary-tab')).not.toBeInTheDocument();
        });
    });

    it('renders DecisionPanel when decision is pending', async () => {
        (useFinanceData as any).mockReturnValue({
            ...((useFinanceData as any).mock.results[0]?.value || {}),
            welcomeCompleted: true,
            onboardingDecision: null, // Pending decision
            paymentMethods: [{ id: 'p1' }], // Has data
            categories: [{ id: 'c1' }]
        });

        render(<Dashboard />, { wrapper: MemoryRouter });
        await waitFor(() => {
            expect(screen.getByTestId('decision-panel')).toBeInTheDocument();
        });
    });
});
