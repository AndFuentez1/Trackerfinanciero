import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import HistoryPage from "./pages/History";
import SavingsPage from "./pages/Savings";
import LoansPage from "./pages/Loans";
import ConfiguracionPage from "./pages/Configuracion";
import BudgetsPage from "./pages/Budgets";
import MainLayout from "./components/MainLayout";
import { FinanceProvider } from "./contexts/FinanceContext";
import { SavingsProvider } from "./contexts/SavingsContext";
import { LoansProvider } from "./contexts/LoansContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FinanceProvider>
        <SavingsProvider>
          <LoansProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/historial" element={<HistoryPage />} />
                  <Route path="/ahorros" element={<SavingsPage />} />
                  <Route path="/presupuestos" element={<BudgetsPage />} />
                  <Route path="/prestamos" element={<LoansPage />} />
                  <Route path="/configuracion" element={<ConfiguracionPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </LoansProvider>
        </SavingsProvider>
      </FinanceProvider>
    </TooltipProvider>
    <Toaster />
    <Sonner />
  </QueryClientProvider>
);

export default App;
