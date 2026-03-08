import { Link, useLocation } from "react-router-dom";
import { Wallet } from "lucide-react";
import { cn } from "@/core/utils";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getOnboardingGateState, isOnboardingAllowedRoute } from "@/core/utils";
import { APP_TAB_ITEMS, preloadTabRoute } from "./tabRoutes";

export function Sidebar() {
    const location = useLocation();
    const pathname = location.pathname;
    const {
        lastUpdated: financeLastUpdated,
        onboardingDecision,
        welcomeCompleted,
        categoriesLoading,
        paymentMethodsLoading,
        profileLoading,
        keepSessionAlive,
        setKeepSessionAlive
    } = useFinanceData();
    const onboardingGateLoading = categoriesLoading || paymentMethodsLoading || profileLoading;

    const toggleKeepAlive = async () => {
        const newValue = !keepSessionAlive;
        await setKeepSessionAlive(newValue);
        // Sync localStorage so useInactivityLogout reads the correct key
        localStorage.setItem('keep_alive_enabled', newValue ? 'true' : 'false');
        if (newValue) {
            localStorage.setItem('lastActiveTime', Date.now().toString());
        }
    };

    const { isOnboardingLocked } = getOnboardingGateState({
        onboardingDecision,
        welcomeCompleted,
        isLoading: onboardingGateLoading,
    });

    const handlePrefetch = (path: (typeof APP_TAB_ITEMS)[number]["href"]) => {
        void preloadTabRoute(path);
    };

    return (
        <div
            className="hidden lg:flex flex-col w-64 border-r h-screen p-6 sticky top-0 flex-shrink-0"
            style={{
                backgroundColor: 'hsl(var(--container))',
                color: 'hsl(var(--muted-foreground))',
                boxShadow: '1px 0 0 rgba(0,0,0,0.08)',
                overflow: 'hidden', // Evita que el contenedor padre genere scroll
            }}
        >
            {/* Estilos inyectados para ocultar la barra de scroll visualmente */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Header / Logo */}
            <div className="mb-10 px-2 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleKeepAlive}
                        title={keepSessionAlive ? "Mantener sesión activa (Activado)" : "Mantener sesión activa (Desactivado)"}
                        className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition-colors flex-shrink-0",
                            keepSessionAlive
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-primary/10 border-border text-primary"
                        )}
                    >
                        <Wallet className="w-6 h-6 current-color" />
                    </button>
                    <div className="flex flex-col justify-center h-10 relative">
                        <h1 className="font-display font-bold text-xl leading-none">FinTrack</h1>
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap absolute top-[26px] left-0 leading-none">
                            Minimalist Finance
                        </p>
                    </div>
                </div>
            </div>

            {/* Navegación con Scroll Invisible */}
            <nav className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                {APP_TAB_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const isDisabled = isOnboardingLocked && !isOnboardingAllowedRoute(item.href);
                    const baseClasses = cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                        isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]"
                            : "text-muted-foreground"
                    );
                    const hoverClasses = !isDisabled ? "hover:bg-primary hover:text-white hover:shadow-md hover:translate-x-1" : "";
                    const disabledClasses = isDisabled ? "opacity-50 cursor-not-allowed bg-muted/20" : "";

                    const content = (
                        <>
                            <item.icon
                                className={cn(
                                    "w-5 h-5",
                                    isActive ? "text-white" : "text-muted-foreground group-hover:text-white"
                                )}
                            />
                            {item.name}
                        </>
                    );

                    if (isDisabled) {
                        return (
                            <div
                                key={item.name}
                                aria-disabled="true"
                                className={cn(baseClasses, disabledClasses)}
                            >
                                {content}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(baseClasses, hoverClasses)}
                            onMouseEnter={() => handlePrefetch(item.href)}
                            onFocus={() => handlePrefetch(item.href)}
                            onTouchStart={() => handlePrefetch(item.href)}
                        >
                            {content}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Last Updated con Skeleton dinámico */}
            <div className="mt-auto pt-6 flex-shrink-0">
                <div className="text-center min-h-[42px] flex items-center justify-center">
                    <div className="w-full bg-muted/30 px-3 py-2.5 rounded-xl border border-border/50 transition-all duration-300">
                        {financeLastUpdated ? (
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">
                                Modificado: {format(financeLastUpdated, "dd/MM/yy HH:mm", { locale: es })}
                            </p>
                        ) : (
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                                Sin modificaciones
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


