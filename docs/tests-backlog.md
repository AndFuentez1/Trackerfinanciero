# Tests Backlog (Guardado para futuro)

Este archivo conserva el código de los tests y la configuración mínima para reactivarlos en el futuro.

## Checklist de reactivación
1. Restaurar dependencias en `package.json` (Vitest/RTL/Playwright) y ejecutar `npm install`.
2. Reponer `vitest.config.ts` y `src/test/setup.ts` desde este archivo.
3. Re-crear los tests en sus rutas originales (unit y e2e).
4. Reponer scripts `test`, `test:run`, `test:coverage`, `test:e2e`.
5. Para E2E: instalar browsers con `npx playwright install`.
6. Ejecutar `npm run test:run` y `npm run test:e2e`.

## Vitest Config
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      'e2e/**',
      'playwright.config.ts',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'dist_deploy/**',
        'src/test/**',
        'src/**/__tests__/**/helpers/**',
      ],
    },
  },
});
```

## Setup de Tests
```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error - global assignment for test env
global.ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error - global assignment for test env
global.IntersectionObserver = IntersectionObserverMock;
```

## Unit Test: financeCalculations
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSummary,
  calculateBudgetProgress,
  calculateInsights,
  calculateExpensesByCategory,
} from '@/features/finance/utils/financeCalculations';
import type { Transaction, Budget, PaymentMethod } from '@/features/finance/types/financeTypes';

const baseTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  type: 'expense',
  category: 'General',
  amount: 100,
  description: 'Test',
  date: '2024-05-10',
  payment_method_id: 'pm1',
  ...overrides,
});

describe('financeCalculations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculateSummary excludes transfers and undisbursed loans', () => {
    const transactions: Transaction[] = [
      baseTransaction({ type: 'income', amount: 1000, category: 'Salario' }),
      baseTransaction({ type: 'expense', amount: 200, category: 'Comida' }),
      baseTransaction({ type: 'transfer_out', amount: -300, category: 'Transferencia Enviada' }),
      baseTransaction({ type: 'transfer_in', amount: 300, category: 'Transferencia Recibida' }),
      baseTransaction({ type: 'expense', amount: 500, category: 'Préstamos', payment_method_id: null }),
    ];

    const summary = calculateSummary(transactions, 'COP');
    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpenses).toBe(200);
    expect(summary.netWorth).toBe(800);
  });

  it('calculateBudgetProgress uses current month and computes percentage', () => {
    const budgets: Budget[] = [
      {
        id: 'b1',
        category: 'Comida',
        category_id: 'cat1',
        amount: 500,
        month: '2024-05-01',
      },
    ];

    const transactions: Transaction[] = [
      baseTransaction({ type: 'expense', amount: 100, category: 'Comida', category_id: 'cat1', date: '2024-05-03' }),
      baseTransaction({ type: 'expense', amount: 50, category: 'Comida', category_id: 'cat1', date: '2024-05-10' }),
      baseTransaction({ type: 'expense', amount: 200, category: 'Comida', category_id: 'cat1', date: '2024-04-10' }),
    ];

    const result = calculateBudgetProgress(budgets, transactions);
    expect(result).toHaveLength(1);
    expect(result[0].spent).toBe(150);
    expect(Math.round(result[0].percentage)).toBe(30);
  });

  it('calculateInsights flags low savings and high credit usage', () => {
    const summary = calculateSummary([
      baseTransaction({ type: 'income', amount: 1000 }),
      baseTransaction({ type: 'expense', amount: 900 }),
    ], 'COP');

    const expensesByCategory = calculateExpensesByCategory([
      baseTransaction({ type: 'expense', amount: 300, category: 'Comida' }),
    ]);

    const paymentMethods: PaymentMethod[] = [
      { id: 'pm1', name: 'TC', type: 'credit', balance: 900, credit_limit: 1000 },
    ];

    const budgets: Budget[] = [];
    const insights = calculateInsights(summary, expensesByCategory, paymentMethods, budgets, []);
    const hasSavingsWarning = insights.some(i => i.title.toLowerCase().includes('ahorro'));
    const hasCreditWarning = insights.some(i => i.title.toLowerCase().includes('alto uso'));

    expect(hasSavingsWarning).toBe(true);
    expect(hasCreditWarning).toBe(true);
  });
});
```

## Unit Test: onboardingGate
```ts
import { describe, it, expect } from 'vitest';
import { getOnboardingGateState, isOnboardingAllowedRoute } from '@/core/utils/onboardingGate';

describe('onboardingGate', () => {
  it('locks when empty state and welcome not completed', () => {
    const state = getOnboardingGateState({
      currency: null,
      paymentMethods: { length: 0 },
      categories: { length: 0 },
      onboardingDecision: null,
      welcomeCompleted: false,
    });

    expect(state.isEmptyState).toBe(true);
    expect(state.showWelcomePanel).toBe(true);
    expect(state.isOnboardingLocked).toBe(true);
  });

  it('shows decision panel when data exists but decision pending', () => {
    const state = getOnboardingGateState({
      currency: 'COP',
      paymentMethods: { length: 1 },
      categories: { length: 1 },
      onboardingDecision: 'pending',
      welcomeCompleted: true,
    });

    expect(state.isEmptyState).toBe(false);
    expect(state.showDecisionPanel).toBe(true);
    expect(state.isOnboardingLocked).toBe(true);
  });

  it('unlocks when onboarding is complete', () => {
    const state = getOnboardingGateState({
      currency: 'COP',
      paymentMethods: { length: 1 },
      categories: { length: 1 },
      onboardingDecision: 'from_scratch',
      welcomeCompleted: true,
    });

    expect(state.isOnboardingLocked).toBe(false);
  });

  it('allows only dashboard and settings routes during onboarding', () => {
    expect(isOnboardingAllowedRoute('/')).toBe(true);
    expect(isOnboardingAllowedRoute('/configuracion')).toBe(true);
    expect(isOnboardingAllowedRoute('/presupuestos')).toBe(false);
  });
});
```

## Unit Test: PendingInvoicesPanel
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingInvoicesPanel } from '@/features/finance/transactions/components/PendingInvoicesPanel';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useAuth } from '@/features/auth/hooks/useAuth';

vi.mock('@/features/finance/hooks/useFinanceData');
vi.mock('@/features/auth/hooks/useAuth');
vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: '1',
                  amount: 50000,
                  description: 'Test Invoice',
                  arrival_date: '2023-01-01',
                  status: 'pending',
                  user_id: 'user1',
                  category: null
                }
              ],
              error: null
            })
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    })),
    removeChannel: vi.fn()
  }
}));

describe('PendingInvoicesPanel', () => {
  const mockAddTransaction = vi.fn();
  const mockRefreshData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'user1' } });
    (useFinanceData as any).mockReturnValue({
      addTransaction: mockAddTransaction,
      paymentMethods: [{ id: 'pm1', name: 'Cash', type: 'cash' }],
      categories: [{ id: 'cat1', name: 'Food', type: 'expense' }],
      refreshData: mockRefreshData
    });
  });

  it('renders pending invoices', async () => {
    render(<PendingInvoicesPanel />);
    await waitFor(() => {
      expect(screen.getByText('Test Invoice')).toBeInTheDocument();
      expect(screen.getByText('$50.000')).toBeInTheDocument();
    });
  });

  it('approves invoice successfully', async () => {
    mockAddTransaction.mockResolvedValue({ error: null });
    render(<PendingInvoicesPanel />);

    await waitFor(() => screen.getByText('Test Invoice'));

    const approveBtn = screen.getByRole('button', { name: /Aprobar/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
        amount: 50000,
        description: 'Test Invoice'
      }));
    });
  });

  it('does NOT delete invoice if transaction fails', async () => {
    mockAddTransaction.mockResolvedValue({ error: 'Balance validation failed' });
    render(<PendingInvoicesPanel />);

    await waitFor(() => screen.getByText('Test Invoice'));

    const approveBtn = screen.getByRole('button', { name: /Aprobar/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });
  });
});
```

## Playwright Config
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host --port 8080',
    url: process.env.E2E_BASE_URL || 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## E2E: auth.spec.ts
```ts
import { test, expect } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('auth', () => {
  test('login with password and navigate to historial', async ({ page }) => {
    test.skip(!email || !password, 'E2E_USER_EMAIL/PASSWORD not set');

    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Contraseña' }).click();
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('link', { name: 'Historial' }).click();
    await expect(page).toHaveURL(/\/historial$/);
    await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();
  });
});
```

## E2E: advanced-settings-gmail.spec.ts
\\\	s
import { test, expect } from '@playwright/test';

test.describe('Gmail Integration - Invoice Import', () => {
    // ... (tests for sorting, hiding approved, select all)
});
\\\

