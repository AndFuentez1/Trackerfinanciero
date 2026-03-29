import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { FinanceProvider } from '@/features/finance/context/FinanceContext';
import { LoansProvider } from '@/features/finance/loans/context/LoansContext';
import { SavingsProvider } from '@/features/finance/savings/context/SavingsContext';
import { Toaster } from '@/shared/ui/toaster';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { DatabaseErrorOverlay } from '@/shared/components/DatabaseErrorOverlay';
import { getSkeletonTypeFromPath } from '@/shared/components/skeletons/skeletonUtils';

// Auth is imported directly (not lazy) because:
// 1. It's the first page unauthenticated users see — no benefit from lazy loading
// 2. Dynamic imports of Auth.tsx have been unreliable in this environment
import Auth from '@/features/auth/pages/Auth';

const isSupabasePausedError = (error: any) => {
  const msg = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return msg.includes('failed to fetch') || 
         msg.includes('networkerror') || 
         msg.includes('503') ||
         error?.status === 503 || 
         error?.code === '503';
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isSupabasePausedError(error)) {
        window.dispatchEvent(new CustomEvent('db-connection-error', { detail: error }));
      }
    }
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isSupabasePausedError(error)) {
        window.dispatchEvent(new CustomEvent('db-connection-error', { detail: error }));
      }
    }
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // User Requirement: Prevent jarring refetches
      refetchOnReconnect: 'always',
      staleTime: 10 * 60 * 1000, // 10 minutes (User Requirement: Cache inteligente)
      gcTime: 30 * 60 * 1000,    // 30 minutes (User Requirement: CacheTime razonable)
      refetchOnMount: false,     // Prefer cache if available
    },
  },
});

// Retry wrapper for lazy imports — retries up to 3 times on failure
function lazyWithRetry<T extends React.ComponentType<unknown>>(importFn: () => Promise<{ default: T }>) {
  return lazy(() =>
    importFn().catch((err: Error) => {
      console.warn('[lazyWithRetry] Import failed, retrying...', err.message);
      return new Promise<void>((resolve) => setTimeout(resolve, 1500))
        .then(() => importFn())
        .catch((err2: Error) => {
          console.warn('[lazyWithRetry] 2nd attempt failed, retrying...', err2.message);
          return new Promise<void>((resolve) => setTimeout(resolve, 2000))
            .then(() => importFn());
        });
    })
  );
}

// Lazy-loaded pages (with retry)
const MainLayout = lazyWithRetry(() => import('@/shared/layouts/MainLayout'));
const Index = lazyWithRetry(() => import('@/features/dashboard/pages/Dashboard'));
const History = lazyWithRetry(() => import('@/features/finance/transactions/pages/History'));
const Budgets = lazyWithRetry(() => import('@/features/finance/budgets/pages/Budgets'));
const CashFlow = lazyWithRetry(() => import('@/features/finance/cashflow/pages/CashFlow'));
const Savings = lazyWithRetry(() => import('@/features/finance/savings/pages/Savings'));
const Loans = lazyWithRetry(() => import('@/features/finance/loans/pages/Loans'));
const Configuracion = lazyWithRetry(() => import('@/features/settings/pages/Settings'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));

/**
 * ProtectedRoute - Redirects to /auth if not authenticated.
 * During OAuth callback (tokens in URL hash), keeps loading state
 * until Supabase processes the tokens to avoid redirect loops.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    const skeletonType = getSkeletonTypeFromPath(window.location.pathname) as any;
    return <SkeletonLoader tab={skeletonType} fullPage />;
  }

  // Not authenticated → redirect to /auth
  if (!user) {
    // Check for OAuth tokens in URL - if present, stay on current page
    // so Supabase can process them via onAuthStateChange
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const hasOAuthTokens =
      hash.includes('access_token') ||
      hash.includes('refresh_token') ||
      hash.includes('type=recovery') ||
      search.includes('code=') ||
      search.includes('error=');

    if (hasOAuthTokens) {
      // Render Auth inline to process tokens without redirect
      return <Auth />;
    }

    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

/**
 * PublicRoute - Redirects authenticated users to /
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    const skeletonType = getSkeletonTypeFromPath(window.location.pathname) as any;
    return <SkeletonLoader tab={skeletonType} fullPage />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => {
  return (
    <ErrorBoundary>
      <DatabaseErrorOverlay />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<SkeletonLoader tab={getSkeletonTypeFromPath(window.location.pathname) as any} fullPage />}>
              <Routes>
                {/* Public auth route */}
                <Route
                  path="/auth"
                  element={
                    <PublicRoute>
                      <Auth />
                    </PublicRoute>
                  }
                />

                {/* Protected routes under MainLayout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <FinanceProvider>
                        <LoansProvider>
                          <SavingsProvider>
                            <MainLayout />
                          </SavingsProvider>
                        </LoansProvider>
                      </FinanceProvider>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Index />} />
                  <Route path="history" element={<History />} />
                  <Route path="budgets" element={<Budgets />} />
                  <Route path="cashflow" element={<CashFlow />} />
                  <Route path="savings" element={<Savings />} />
                  <Route path="loans" element={<Loans />} />
                  <Route path="settings" element={<Configuracion />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;








