import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import HistoryPage from "./pages/History";
import SavingsPage from "./pages/Savings";
import LoansPage from "./pages/Loans";
import ConfiguracionPage from "./pages/Configuracion";
import BudgetsPage from "./pages/Budgets";
import MainLayout from "@/layouts/MainLayout";
import CashFlow from "./pages/CashFlow";
import { FinanceProvider } from "./contexts/FinanceContext";
import { SavingsProvider } from "./contexts/SavingsContext";
import { LoansProvider } from "./contexts/LoansContext";
import { useFinance } from "./contexts/FinanceContext";
import { SkeletonLoader } from "./components/common/skeletons/SkeletonLoader";
import { BrowserRouter as Router } from 'react-router-dom';
const queryClient = new QueryClient();

// Inner component that consumes the finance context
const AppContent = () => {
    const { user, loading: authLoading } = useAuth();
    const { themeVars, loading: financeLoading } = useFinance();

    // Consolidated loading state
    const isLoading = authLoading || (!!user && financeLoading);

    // Apply theme variables with smooth transition
    useEffect(() => {
        if (themeVars) {
            // Apply variables
            Object.entries(themeVars).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
            // Ensure smooth transition for all color changes
            document.documentElement.classList.add('transition-colors', 'duration-300');
        }
    }, [themeVars]);

    // Helper for skeleton type
    const getSkeletonType = (path: string) => {
        if (path === '/') return 'dashboard';
        if (path.includes('historial')) return 'transactions';
        if (path.includes('ahorros')) return 'savings';
        if (path.includes('prestamos')) return 'loans';
        if (path.includes('presupuestos')) return 'budgets';
        if (path.includes('configuracion')) return 'config';
        if (path.includes('flujo-caja')) return 'cashflow';
        return 'default';
    };

    // 1. Strict Loading Guard — SkeletonLoader evita layout shift inicial
    if (isLoading) {
        // Safe check for hash router path
        const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace('/Trackerfinanciero', '') || '/' : '/';
        const skeletonType = getSkeletonType(currentPath) as any;
        return <SkeletonLoader fullPage message="Cargando aplicación..." tab={skeletonType} />;
    }

    // 2. Atomic Routing Decision
    return (
        <Router>
            <Routes>
                {user ? (
                    /* Authenticated Routes */
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/historial" element={<HistoryPage />} />
                        <Route path="/ahorros" element={<SavingsPage />} />
                        <Route path="/presupuestos" element={<BudgetsPage />} />
                        <Route path="/prestamos" element={<LoansPage />} />
                        <Route path="/configuracion" element={<ConfiguracionPage />} />
                        <Route path="/flujo-caja" element={<CashFlow />} />
                        {/* Catch-all for authenticated users: Redirect to Dashboard */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                ) : (
                    /* Public Routes */
                    <>
                        <Route path="/auth" element={<Auth />} />
                        {/* Catch-all for guests: Redirect to Auth */}
                        <Route path="*" element={<Navigate to="/auth" replace />} />
                    </>
                )}
            </Routes>
        </Router>
    );
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <FinanceProvider>
                <SavingsProvider>
                    <LoansProvider>
                        <AppContent />
                    </LoansProvider>
                </SavingsProvider>
            </FinanceProvider>
        </TooltipProvider>
        <Toaster />
        <SonnerToaster />
    </QueryClientProvider>
);

export default App;
