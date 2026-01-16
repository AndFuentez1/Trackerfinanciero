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

    // Variables de presupuesto eliminadas para la nueva UI
    // const percentage = 0; 
    // const isOverBudget = false;

    // const formatCurrency = (value: number) => {
    //     return new Intl.NumberFormat('es-CO', {
    //         style: 'currency',
    //         currency: 'COP',
    //         maximumFractionDigits: 0,
    //     }).format(value);
    // };

    return (
        <div className="hidden lg:flex flex-col w-64 border-r border-border bg-card min-h-screen p-6">
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Wallet className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-xl leading-none">FinTrack</h1>
                    <p className="text-xs text-muted-foreground mt-1">Minimalist Finance</p>
                </div>
            </div>

            <nav className="space-y-2 flex-1">
                {items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} to={item.href} className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1"
                        )}>
                            <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto px-4 py-4">
                {lastUpdated && (
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl inline-block w-full border border-border/50">
                            Última mod. {lastUpdated ? format(lastUpdated, "dd/MM/yyyy HH:mm:ss", { locale: es }) : '--:--'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
