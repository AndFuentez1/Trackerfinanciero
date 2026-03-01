import { Card } from '@/shared/ui/card';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface LoansSummaryProps {
    totalRemainingDebt: number;
    totalRemainingReceivable: number;
    ctxCurrency: string;
}

export function LoansSummary({ totalRemainingDebt, totalRemainingReceivable, ctxCurrency }: LoansSummaryProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col p-6 bg-gray-50/50 dark:bg-muted/20 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <ArrowDownCircle className="h-5 w-5 text-destructive transition-colors duration-300" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base sm:text-lg font-bold text-muted-foreground tracking-tight leading-none">
                                Mis Deudas Pendientes
                            </p>
                        </div>
                    </div>
                    <div className="pl-0 space-y-1">
                        <div className="text-2xl font-bold text-foreground leading-none">
                            <CurrencyDisplay amount={totalRemainingDebt} currencyCode={ctxCurrency} />
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal leading-tight">
                            (Solo préstamos desembolsados)
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="flex flex-col p-6 bg-gray-50/50 dark:bg-muted/20 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <ArrowUpCircle className="h-5 w-5 text-emerald-600 transition-colors duration-300" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base sm:text-lg font-bold text-muted-foreground tracking-tight leading-none">
                                Por Cobrar (Prestado)
                            </p>
                        </div>
                    </div>
                    <div className="pl-0 space-y-1">
                        <div className="text-2xl font-bold text-foreground leading-none">
                            <CurrencyDisplay amount={totalRemainingReceivable} currencyCode={ctxCurrency} />
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal leading-tight">
                            (Solo préstamos desembolsados)
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
