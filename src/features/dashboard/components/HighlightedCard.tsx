import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';

interface HighlightedCardProps {
    title: string;
    amount: number;
    icon: LucideIcon;
    breakdown?: {
        label: string;
        value: number;
        color?: string;
    }[];
    footer?: {
        label: string;
        value: number;
    };
}

export function HighlightedCard({ title, amount, icon: Icon, breakdown, footer }: HighlightedCardProps) {
    const { currency, decimalPlaces } = useFinance();
    
    const getCurrencySymbol = (currencyCode: string): string => {
        const curr = CURRENCIES.find(c => c.code === currencyCode);
        return curr?.symbol || currencyCode;
    };
    
    const formatSmartCurrency = (value: number) => {
        const symbol = getCurrencySymbol(currency || 'COP');
        let formatted = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency || 'COP',
            currencyDisplay: 'code',
            minimumFractionDigits: decimalPlaces ?? 2,
        }).format(value);
        
        formatted = formatted.replace(currency || 'COP', symbol);

        const [main, cents] = formatted.split(',');

        return (
            <span className="tracking-tight">
                {main}
                <span className="text-[0.55em] opacity-80 font-medium ml-0.5">
                    ,{cents}
                </span>
            </span>
        );
    };

    return (
        <div className="bg-card text-slate-900 rounded-[2.5rem] p-8 shadow-md border border-border/40 relative overflow-hidden group flex flex-col h-full hover:shadow-lg transition-all duration-300">
            {/* Decorative background element - subtler for white theme */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-colors duration-500" />

            <div className="relative flex-1 space-y-4">
                <div className="flex items-start justify-between">
                    <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] pt-1">
                        {title}
                    </p>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-border/40 transition-transform group-hover:scale-110 shadow-sm">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                </div>

                <div className="font-black leading-none tracking-tighter text-3xl lg:text-4xl text-slate-900">
                    {formatSmartCurrency(amount)}
                </div>

                {breakdown && breakdown.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        {breakdown.map((item, idx) => (
                            <div key={idx} className="bg-slate-50/50 p-3 px-4 rounded-xl border border-border/40 backdrop-blur-sm">
                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1 truncate">
                                    {item.label}
                                </p>
                                <p className={cn("text-xs font-black tracking-tight", item.color || "text-slate-900")}>
                                    {(() => {
                                        const symbol = getCurrencySymbol(currency || 'COP');
                                        const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency || 'COP', currencyDisplay: 'code', maximumFractionDigits: 0 }).format(item.value);
                                        return formatted.replace(currency || 'COP', symbol);
                                    })()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {footer && (
                <div className="relative mt-6 pt-6 border-t border-border/40">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                            <span>{footer.label}</span>
                            <span className="text-primary font-black">{footer.value.toFixed(decimalPlaces)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--color-primary),0.4)]"
                                style={{ width: `${Math.min(footer.value, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
