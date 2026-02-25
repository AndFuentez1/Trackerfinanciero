import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, PiggyBank, HandCoins, Settings, Wallet, PieChart } from "lucide-react";
import { cn } from "@/core/utils";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { useBudgetsData } from "@/features/finance/hooks/useBudgetsData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo } from "react";
import { getOnboardingGateState, isOnboardingAllowedRoute } from "@/core/utils";

const items = [
    { name: "Panel", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Historial", icon: Receipt, href: "/history" },
    { name: "Flujo de Caja", icon: Wallet, href: "/cashflow" },
    { name: "Presupuestos", icon: PieChart, href: "/budgets" },
    { name: "Ahorros", icon: PiggyBank, href: "/savings" },
    { name: "Préstamos", icon: HandCoins, href: "/loans" },
    { name: "Configuración", icon: Settings, href: "/settings" },
];

export function Sidebar() {
    const location = useLocation();
    const pathname = location.pathname;
    const {
        lastUpdated: financeLastUpdated,
        currency,
        paymentMethods,
        categories,
        onboardingDecision,
        welcomeCompleted,
        loading: financeLoading,
    } = useFinanceData();
    const { lastModification: budgetLastUpdated } = useBudgetsData();

    const lastUpdated = useMemo(() => {
        if (!financeLastUpdated && !budgetLastUpdated) { return null; }
        if (!financeLastUpdated) { return budgetLastUpdated; }
        if (!budgetLastUpdated) { return financeLastUpdated; }
        return financeLastUpdated > budgetLastUpdated ? financeLastUpdated : budgetLastUpdated;
    }, [financeLastUpdated, budgetLastUpdated]);

    const { isOnboardingLocked } = getOnboardingGateState({
        currency,
        paymentMethods,
        categories,
        onboardingDecision,
        welcomeCompleted,
        isLoading: financeLoading,
    });

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
            <div className="flex items-center gap-3 mb-10 px-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-border bg-primary/10">
                    <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col justify-center">
                    <h1 className="font-display font-bold text-xl leading-none">FinTrack</h1>
                    <p className="text-xs text-muted-foreground mt-1">Minimalist Finance</p>
                </div>
            </div>

            {/* Navegación con Scroll Invisible */}
            <nav className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                {items.map((item) => {
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
                        {lastUpdated ? (
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80">
                                Modificado: {format(lastUpdated, "dd/MM/yy HH:mm", { locale: es })}
                            </p>
                        ) : (
                            <div className="flex flex-col items-center gap-1 animate-pulse">
                                <div className="h-2 w-20 bg-muted-foreground/20 rounded" />
                                <div className="h-2 w-12 bg-muted-foreground/10 rounded" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


