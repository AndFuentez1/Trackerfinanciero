import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, PiggyBank, HandCoins, Settings, Wallet, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useBudgetsData } from "@/hooks/useBudgetsData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo } from "react";

const items = [
    { name: "Panel", icon: LayoutDashboard, href: "/" },
    { name: "Historial", icon: Receipt, href: "/historial" },
    { name: "Flujo de Caja", icon: Wallet, href: "/flujo-caja" },
    { name: "Presupuestos", icon: PieChart, href: "/presupuestos" },
    { name: "Ahorros", icon: PiggyBank, href: "/ahorros" },
    { name: "Préstamos", icon: HandCoins, href: "/prestamos" },
    { name: "Configuración", icon: Settings, href: "/configuracion" },
];

export function Sidebar() {
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
            className="hidden lg:flex flex-col w-64 border-r h-screen p-6 sticky top-0 flex-shrink-0"
            style={{
                backgroundColor: 'hsl(var(--container))',
                color: 'hsl(var(--muted-foreground))',
                boxShadow: '1px 0 0 rgba(0,0,0,0.08)',
                overflow: 'hidden', // Evita que el contenedor padre genere scroll
            }}
        >
            {/* Estilos inyectados para ocultar la barra de scroll visualmente */}
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Header / Logo */}
            <div className="flex items-center gap-3 mb-10 px-2 flex-shrink-0">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Wallet className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-xl leading-none">FinTrack</h1>
                    <p className="text-xs text-muted-foreground mt-1">Minimalist Finance</p>
                </div>
            </div>

            {/* Navegación con Scroll Invisible */}
            <nav className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link 
                            key={item.name} 
                            to={item.href} 
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:translate-x-1"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5", 
                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
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
}