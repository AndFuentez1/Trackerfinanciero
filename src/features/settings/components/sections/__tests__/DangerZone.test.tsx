import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DangerZone } from '../DangerZone';
import { useSettingsProfile } from '../../hooks/useSettingsProfile';
import { useDataExport } from '../../hooks/useDataExport';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../hooks/useSettingsProfile');
vi.mock('../../hooks/useDataExport');

describe('DangerZone UI/UX Logic', () => {
    const mockResetProfileData = vi.fn();
    const mockResetOperationalData = vi.fn();
    const mockExportSelectedData = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useSettingsProfile as Mock).mockReturnValue({
            resetProfileData: mockResetProfileData,
            resetOperationalData: mockResetOperationalData,
            loading: false,
        });
        (useDataExport as Mock).mockReturnValue({
            exportSelectedData: mockExportSelectedData,
            isExporting: false,
        });
    });

    it('should include "Préstamos" toggle in Borrar datos section', () => {
        render(<DangerZone />, { wrapper: MemoryRouter });

        // Open the dialog
        const deleteDataButton = screen.getByRole('button', { name: /borrar datos/i });
        fireEvent.click(deleteDataButton);

        // Check if Préstamos toggle is visible
        expect(screen.getByText('Préstamos')).toBeInTheDocument();
        expect(screen.getByLabelText('Préstamos')).toBeInTheDocument();
    });

    it('should allow "Resetear perfil" without marking "Eliminar perfil completo"', async () => {
        render(<DangerZone />, { wrapper: MemoryRouter });

        // Open reset profile dialog
        const resetProfileButton = screen.getByRole('button', { name: /resetear perfil/i });
        fireEvent.click(resetProfileButton);

        // Check the default states
        const fullProfileSwitch = screen.getByLabelText(/eliminar perfil completo/i);
        const continueButton = screen.getByRole('button', { name: /estoy seguro, borrar/i });

        expect(fullProfileSwitch).not.toBeChecked();

        // It's enabled by default because profileResetOptions has transactions=true as default
        expect(continueButton).not.toBeDisabled();

        // If we uncheck everything else, it should disable
        const transactionsSwitch = screen.getByLabelText(/transacciones/i);
        const budgetsSwitch = screen.getByLabelText(/presupuestos/i);
        const savingsSwitch = screen.getByLabelText(/ahorros/i);
        const loansSwitch = screen.getByLabelText(/préstamos/i);
        const futureExpensesSwitch = screen.getByLabelText(/gastos futuros/i);
        const paymentMethodsSwitch = screen.getByLabelText(/métodos de pago/i);
        const categoriesSwitch = screen.getByLabelText(/categorías/i);
        // Uncheck all defaults (Transactions, Budgets, Savings, Loans, Future, PM, Categories are true by default)
        fireEvent.click(transactionsSwitch);
        fireEvent.click(budgetsSwitch);
        fireEvent.click(savingsSwitch);
        fireEvent.click(loansSwitch);
        fireEvent.click(futureExpensesSwitch);
        fireEvent.click(paymentMethodsSwitch);
        fireEvent.click(categoriesSwitch);

        // Validating the "canDeleteProfile" logic: should be disabled now
        expect(continueButton).toBeDisabled();
        expect(screen.getByText(/selecciona al menos una opción para continuar/i)).toBeInTheDocument();

        // Check just one (e.g. Transactions) - Should enable button WITHOUT full profile
        fireEvent.click(transactionsSwitch);
        expect(continueButton).not.toBeDisabled();
        expect(fullProfileSwitch).not.toBeChecked();
    });
});
