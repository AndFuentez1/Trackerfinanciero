import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SettingsPage from '@/features/settings/pages/Settings';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mocks
vi.mock('@/features/auth/hooks/useAuth');
vi.mock('@/features/finance/hooks/useFinanceData');

// Mock child components
vi.mock('@/features/settings/components/sections/ThemeSection', () => ({
    ThemeSection: () => <div data-testid="theme-section">Tema</div>
}));
vi.mock('@/features/settings/components/sections/CategoriesSection', () => ({
    CategoriesSection: () => <div data-testid="categories-section">Categorías</div>
}));
vi.mock('@/features/settings/components/sections/PaymentMethodsSection', () => ({
    PaymentMethodsSection: () => <div data-testid="payment-methods-section">Métodos de Pago</div>
}));
vi.mock('@/features/settings/components/sections/CurrencySection', () => ({
    CurrencySection: () => <div data-testid="currency-section">Moneda</div>
}));
vi.mock('@/features/settings/components/sections/SecuritySection', () => ({
    SecuritySection: () => <div data-testid="security-section">Seguridad</div>
}));
vi.mock('@/features/settings/components/sections/DangerZone', () => ({
    DangerZone: () => <div data-testid="danger-zone">Zona Peligro</div>
}));
vi.mock('@/features/settings/components/AdvancedSettings', () => ({
    AdvancedSettings: () => <div data-testid="advanced-settings">Avanzado</div>
}));

describe('SettingsPage', () => {
    const mockUser = { id: 'u1' };

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as Mock).mockReturnValue({ user: mockUser, loading: false });
        (useFinanceData as Mock).mockReturnValue({
            categories: [{ id: 'c1' }],
            loading: false,
            categoriesLoading: false,
            paymentMethodsLoading: false,
            profileLoading: false
        });

        // Mock scrollIntoView
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('renders all settings sections', () => {
        render(<SettingsPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.getByTestId('theme-section')).toBeInTheDocument();
        expect(screen.getByTestId('categories-section')).toBeInTheDocument();
        expect(screen.getByTestId('payment-methods-section')).toBeInTheDocument();
        expect(screen.getByTestId('currency-section')).toBeInTheDocument();
        expect(screen.getByTestId('security-section')).toBeInTheDocument();
        expect(screen.getByTestId('danger-zone')).toBeInTheDocument();
    });

    it('highlights section based on URL query param', async () => {
        render(
            <MemoryRouter initialEntries={['/settings?highlight=categories']}>
                <Routes>
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </MemoryRouter>
        );

        // We check if the scroll logic was triggered or if the class was applied.
        // The component uses document.getElementById(highlight)
        // In JSDOM, elements render.
        // We'd expect scrollIntoView to be called.

        await waitFor(() => {
            // Check if the container has the highlight class "scale-105"
            // The container for categories has id="categories"
            // eslint-disable-next-line testing-library/no-node-access
            const container = screen.getByTestId('categories-section').parentElement;
            // The parent of the section component is the div with id="categories" and classes
            expect(container).toHaveClass('scale-105');
        });
    });
});
