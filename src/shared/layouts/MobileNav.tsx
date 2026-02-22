import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, PiggyBank, HandCoins, Settings, PieChart, Wallet } from "lucide-react";
import { cn } from "@/core/utils";
import { useFinanceData } from "@/features/finance/hooks/useFinanceData";
import { getOnboardingGateState, isOnboardingAllowedRoute } from "@/core/utils";

const items = [
    { name: "Panel", icon: LayoutDashboard, href: "/" },
    { name: "Historial", icon: Receipt, href: "/historial" },
    { name: "Flujo de Caja", icon: Wallet, href: "/flujo-caja" },
    { name: "Presupuestos", icon: PieChart, href: "/presupuestos" },
    { name: "Ahorros", icon: PiggyBank, href: "/ahorros" },
    { name: "Préstamos", icon: HandCoins, href: "/prestamos" },
    { name: "Configuración", icon: Settings, href: "/configuracion" },
];

export function MobileNav() {
    const location = useLocation();
    const pathname = location.pathname;
    const {
        currency,
        paymentMethods,
        categories,
        onboardingDecision,
        welcomeCompleted,
    } = useFinanceData();

    const { isOnboardingLocked } = getOnboardingGateState({
        currency,
        paymentMethods,
        categories,
        onboardingDecision,
        welcomeCompleted,
    });

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 pb-safe z-50 flex justify-around items-center">
            {items.map((item) => {
                const isActive = pathname === item.href;
                const isDisabled = isOnboardingLocked && !isOnboardingAllowedRoute(item.href);
                return (
                    isDisabled ? (
                        <div
                            key={item.name}
                            aria-disabled="true"
                            className="flex items-center justify-center p-3 rounded-xl min-w-[48px] opacity-50 cursor-not-allowed bg-muted/20 text-muted-foreground"
                        >
                            <item.icon className="w-6 h-6" />
                        </div>
                    ) : (
                        <Link
                            key={item.name}
                            to={item.href}
                            aria-label={item.name}
                            className={cn(
                                "flex items-center justify-center p-3 rounded-xl transition-colors min-w-[48px]",
                                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <item.icon className="w-6 h-6" />
                        </Link>
                    )
                );
            })}
        </div>
    );
}

