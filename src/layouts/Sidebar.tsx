import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, PiggyBank, HandCoins, Settings, Wallet, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useBudgetsData } from "@/hooks/useBudgetsData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, memo } from "react";

const items = [
    { name: "Panel", icon: LayoutDashboard, href: "/" },
    { name: "Historial", icon: Receipt, href: "/historial" },
    { name: "Flujo de Caja", icon: Wallet, href: "/flujo-caja" },
    { name: "Presupuestos", icon: PieChart, href: "/presupuestos" },
    { name: "Ahorros", icon: PiggyBank, href: "/ahorros" },
    { name: "Préstamos", icon: HandCoins, href: "/prestamos" },
    { name: "Configuración", icon: Settings, href: "/configuracion" },
];

export const Sidebar = memo(function Sidebar() {
    const location = useLocation();
    const pathname = location.pathname;
    const { lastUpdated: financeLastUpdated } = useFinanceData();
    const { lastModification: budgetLastUpdated } = useBudgetsData();

    const lastUpdated = useMemo(() => {
        if (!financeLastUpdated && !budgetLastUpdated) return null;
        if (!financeLastUpdated) return budgetLastUpdated;
        if (!budgetLastUpdated) return financeLastUpdated;
        return financeLastUpdated > budgetLastUpdated ? financeLastUpdated : budgetLastUpdated;
    }, [financeLastUpdated, budgetLastUpdated]);

    return (
        <div
            className="hidden lg:flex flex-col w-72 border-r h-screen p-6 fixed top-0 left-0 bottom-0 z-40 bg-background"
            style={{
                backgroundColor: 'hsl(var(--container))',
                color: 'hsl(var(--color-muted-foreground))',
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

            {/* Header / Logo - Adjusted top padding to align with PageHeader title (approx 3.5rem from top: 24px + 32px = 56px) */}
            <div className="flex items-center gap-4 mb-10 px-3 flex-shrink-0 pt-8">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Wallet className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-2xl leading-none tracking-tight">FinTrack</h1>
                    <p className="text-sm text-muted-foreground mt-1.5 font-medium">Minimalist Finance</p>
                </div>
            </div>

            {/* Navegación con Scroll Invisible */}
            <nav className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group font-medium text-[15px]",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/25 scale-[1.02]"
                                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary hover:translate-x-1"
                            )}
                        >
                            <item.icon className={cn(
                                "w-6 h-6 stroke-[2px]",
                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Last Updated con Skeleton dinámico */}
            <div className="mt-auto pt-6 flex-shrink-0">
                <div className="text-center min-h-[42px] flex items-center justify-center">
                    <div className="w-full bg-muted/30 px-3 py-2.5 rounded-xl border border-border/50 transition-all duration-300">
                        {lastUpdated ? (
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
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
});