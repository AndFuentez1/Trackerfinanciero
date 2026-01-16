import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, PiggyBank, HandCoins, Settings, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
    { name: "Panel", icon: LayoutDashboard, href: "/" },
    { name: "Historial", icon: Receipt, href: "/historial" },
    { name: "Presupuestos", icon: PieChart, href: "/presupuestos" },
    { name: "Ahorros", icon: PiggyBank, href: "/ahorros" },
    { name: "Préstamos", icon: HandCoins, href: "/prestamos" },
    { name: "Configuración", icon: Settings, href: "/configuracion" },
];

export function MobileNav() {
    const location = useLocation();
    const pathname = location.pathname;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 z-50 flex justify-around items-center pb-safe">
            {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link key={item.name} to={item.href} className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}
