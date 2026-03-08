import type { LucideIcon } from 'lucide-react';
import {
    HandCoins,
    LayoutDashboard,
    PiggyBank,
    PieChart,
    Receipt,
    Settings,
    Wallet,
} from 'lucide-react';

export type AppTabPath =
    | '/dashboard'
    | '/history'
    | '/cashflow'
    | '/budgets'
    | '/savings'
    | '/loans'
    | '/settings';

export interface AppTabItem {
    name: string;
    icon: LucideIcon;
    href: AppTabPath;
}

export const APP_TAB_ITEMS: AppTabItem[] = [
    { name: 'Panel', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Historial', icon: Receipt, href: '/history' },
    { name: 'Flujo de Caja', icon: Wallet, href: '/cashflow' },
    { name: 'Presupuestos', icon: PieChart, href: '/budgets' },
    { name: 'Ahorros', icon: PiggyBank, href: '/savings' },
    { name: 'Préstamos', icon: HandCoins, href: '/loans' },
    { name: 'Configuración', icon: Settings, href: '/settings' },
];

const TAB_ROUTE_LOADERS: Record<AppTabPath, () => Promise<unknown>> = {
    '/dashboard': () => import('@/features/dashboard/pages/Dashboard'),
    '/history': () => import('@/features/finance/transactions/pages/History'),
    '/cashflow': () => import('@/features/finance/cashflow/pages/CashFlow'),
    '/budgets': () => import('@/features/finance/budgets/pages/Budgets'),
    '/savings': () => import('@/features/finance/savings/pages/Savings'),
    '/loans': () => import('@/features/finance/loans/pages/Loans'),
    '/settings': () => import('@/features/settings/pages/Settings'),
};

const preloadedTabs = new Set<AppTabPath>();

export async function preloadTabRoute(path: AppTabPath): Promise<void> {
    if (preloadedTabs.has(path)) {
        return;
    }

    preloadedTabs.add(path);
    try {
        await TAB_ROUTE_LOADERS[path]();
    } catch (error) {
        // Allow retries if the dynamic import fails.
        preloadedTabs.delete(path);
        console.warn('[tabRoutes] Failed to preload route:', path, error);
    }
}

export async function preloadAllTabRoutes(currentPath?: string): Promise<void> {
    const tasks = APP_TAB_ITEMS
        .filter((item) => item.href !== currentPath)
        .map((item) => preloadTabRoute(item.href));

    await Promise.allSettled(tasks);
}
