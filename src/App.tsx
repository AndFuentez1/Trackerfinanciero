import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
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
import { AuthProvider } from "./contexts/AuthContext";


const queryClient = new QueryClient();

// Inner component that consumes the finance context
const AppContent = () => {
  const { themeVars, loading } = useFinance();

  // Apply theme variables to document root
  useEffect(() => {
    if (themeVars) {
      Object.entries(themeVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }
  }, [themeVars]);

  // Helper to determine skeleton type based on current URL
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

  // Prevent flash of default theme by waiting for data load (OPTIONAL: Keep only if critical, but for perf we want to unblock)
  // For better PERCEIVED performance, we let the app shell render immediately.
  // The individual pages will handle their own "content" loading state.

  // if (loading) {
  //   return <SkeletonLoader tab={getSkeletonType(window.location.pathname) as any} />;
  // }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/historial" element={<HistoryPage />} />
          <Route path="/ahorros" element={<SavingsPage />} />
          <Route path="/presupuestos" element={<BudgetsPage />} />
          <Route path="/prestamos" element={<LoansPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/flujo-caja" element={<CashFlow />} />
        </Route>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <FinanceProvider>
          <SavingsProvider>
            <LoansProvider>
              <AppContent />
            </LoansProvider>
          </SavingsProvider>
        </FinanceProvider>
      </AuthProvider>
    </TooltipProvider>
    <Toaster />
    <SonnerToaster />
  </QueryClientProvider>
);

export default App;
