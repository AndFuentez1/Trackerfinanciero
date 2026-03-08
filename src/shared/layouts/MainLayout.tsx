import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { useInactivityLogout } from "@/features/auth/hooks/useInactivityLogout";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { SkeletonLoader } from "@/shared/components/skeletons/SkeletonLoader";
import { SetPasswordDialog } from "@/features/auth/components/SetPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { getSkeletonTypeFromPath } from "@/shared/components/skeletons/skeletonUtils";
import { useScrollRestoration } from "@/shared/hooks/useScrollRestoration";
import { getOnboardingGateState, isOnboardingAllowedRoute } from "@/core/utils";
import { queryKeys } from "@/core/api/queryKeys";
import { fetchUserConfigStatus } from "@/features/settings/components/hooks/useUserConfigStatus";
import { DataTreatmentGuard } from "@/features/auth/components/DataTreatmentGuard";
import { cn } from "@/core/utils";
import { PageBootContext } from "./PageBootContext";
import { preloadAllTabRoutes } from "./tabRoutes";

export default function MainLayout() {
    const { user, loading, signOut } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const {
        currency,
        paymentMethods,
        categories,
        onboardingDecision,
        welcomeCompleted,
        categoriesLoading,
        paymentMethodsLoading,
        profileLoading,
    } = useFinanceData();
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [hasCheckedPassword, setHasCheckedPassword] = useState(false);
    const [pageBootLoading, setPageBootLoading] = useState(true);
    const scrollRef = useScrollRestoration<HTMLElement>();
    const activePathRef = useRef(location.pathname);
    const hasInitializedPathRef = useRef(false);

    // Auto logout after 5 minutes of inactivity (Security Requirement)
    useInactivityLogout(5);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    useLayoutEffect(() => {
        activePathRef.current = location.pathname;
        if (!hasInitializedPathRef.current) {
            hasInitializedPathRef.current = true;
            return;
        }
        setPageBootLoading(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!user?.id || typeof window === 'undefined') { return; }
        const timerId = window.setTimeout(() => {
            void preloadAllTabRoutes(location.pathname);
        }, 350);
        return () => window.clearTimeout(timerId);
    }, [user?.id, location.pathname]);

    useEffect(() => {
        if (!user?.id) { return; }
        queryClient.prefetchQuery({
            queryKey: queryKeys.user.config(user.id),
            queryFn: () => fetchUserConfigStatus(user.id),
            staleTime: Infinity,
        });
    }, [user?.id, queryClient]);

    const onboardingGateLoading = categoriesLoading || paymentMethodsLoading || profileLoading;

    const { isOnboardingLocked } = getOnboardingGateState({
        currency,
        paymentMethods,
        categories,
        onboardingDecision,
        welcomeCompleted,
        isLoading: onboardingGateLoading,
    });
    const isAllowedRoute = isOnboardingAllowedRoute(location.pathname);

    useEffect(() => {
        if (!onboardingGateLoading && user && isOnboardingLocked && !isAllowedRoute) {
            navigate("/dashboard");
        }
    }, [onboardingGateLoading, user, isOnboardingLocked, isAllowedRoute, navigate]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                navigate("/settings?highlight=password");
            }
        });
        return () => subscription.unsubscribe();
    }, [navigate]);

    // Check if user has password set (con cleanup para evitar setState tras unmount)
    useEffect(() => {
        let cancelled = false;
        let timerId: ReturnType<typeof setTimeout> | null = null;

        const checkUserPassword = async () => {
            if (!user || !user.email_confirmed_at || hasCheckedPassword) {
                return;
            }

            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (cancelled) {
                    return;
                }

                if (currentUser) {
                    const lastSignInMethod = currentUser.app_metadata?.provider;
                    if (lastSignInMethod === 'email' && !localStorage.getItem('password_dialog_shown')) {
                        timerId = setTimeout(() => {
                            if (!cancelled) {
                                setShowPasswordDialog(true);
                                localStorage.setItem('password_dialog_shown', 'true');
                            }
                        }, 2000);
                    }
                }
                if (!cancelled) {
                    setHasCheckedPassword(true);
                }
            } catch (error) {
                console.error('[MainLayout] Failed to check user password', error);
                if (!cancelled) {
                    setHasCheckedPassword(true);
                }
            }
        };

        checkUserPassword();
        return () => {
            cancelled = true;
            if (timerId) {
                clearTimeout(timerId);
            }
        };
    }, [user, hasCheckedPassword]);

    const skeletonType = getSkeletonTypeFromPath(location.pathname) as 'dashboard' | 'transactions' | 'savings' | 'loans' | 'budgets' | 'config' | 'cashflow' | 'default';
    const reportPageBootLoading = useCallback((path: string, isLoading: boolean) => {
        if (path !== activePathRef.current) {
            return;
        }
        setPageBootLoading(isLoading);
    }, []);
    const pageBootContextValue = useMemo(() => ({
        reportPageBootLoading,
    }), [reportPageBootLoading]);

    if (loading) {
        return <SkeletonLoader fullPage tab={skeletonType} withLayoutWrapper={false} />;
    }

    if (!user) { return null; }

    // Email Confirmation Guard
    if (!user.email_confirmed_at) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
                <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                    <div className="p-4 rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mx-auto shadow-inner">
                        <Mail className="h-10 w-10 text-amber-600" />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Verifica tu correo</h1>
                        <p className="text-muted-foreground text-sm">
                            Tu cuenta está casi lista. Hemos enviado un correo de confirmación a <span className="font-bold text-foreground">{user.email}</span>.
                        </p>
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-left">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                                <strong>Acceso limitado:</strong> Por seguridad, debes confirmar tu identidad antes de acceder a tus datos financieros. Revisa tu bandeja de entrada y spam.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Button variant="default" className="w-full h-11" onClick={() => window.location.reload()}>
                            Ya lo he confirmado
                        </Button>
                        <Button variant="destructive" className="w-full text-muted-foreground" onClick={() => signOut()}>
                            Cerrar sesión
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DataTreatmentGuard>
            <PageBootContext.Provider value={pageBootContextValue}>
                <div className="relative h-screen max-h-[100dvh] w-full overflow-hidden">
                    {pageBootLoading && (
                        <div className="absolute inset-0 z-50">
                            <SkeletonLoader fullPage tab={skeletonType} withLayoutWrapper={false} />
                        </div>
                    )}

                    <div
                        className={cn(
                            "flex h-screen max-h-[100dvh] w-full overflow-hidden font-sans antialiased",
                            pageBootLoading && "opacity-0 pointer-events-none select-none"
                        )}
                        aria-hidden={pageBootLoading}
                    >
                        <Sidebar />
                        <main ref={scrollRef} className="flex-1 min-h-0 pb-20 lg:pb-0 overflow-y-auto overflow-x-hidden h-screen max-h-[100dvh] relative scrollbar-stable">
                            <Outlet />
                        </main>
                        <MobileNav />
                    </div>
                </div>

                <SetPasswordDialog
                    open={showPasswordDialog}
                    onOpenChange={setShowPasswordDialog}
                    userEmail={user?.email || ''}
                />
            </PageBootContext.Provider>
        </DataTreatmentGuard>
    );
}





