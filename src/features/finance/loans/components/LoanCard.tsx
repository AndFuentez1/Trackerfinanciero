import type React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { Progress } from '@/shared/ui/progress';
import { AlertCircle, Percent, Calendar, Wallet, XCircle, CheckCircle2, Edit2, Trash2, HandCoins } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/core/utils';
import type { Loan } from '../hooks/useLoans';
import type { PaymentMethod } from '@/features/finance/hooks/useFinanceData';

interface LoanCardProps {
    loan: Loan;
    ctxCurrency: string;
    paymentMethods: PaymentMethod[];
    isOverdue: (loan: Loan) => boolean;
    formatCurrencySmall: (val: number, decimals?: number) => React.ReactNode;
    onOpenDisbursement: (loan: Loan) => void;
    onOpenEdit: (loan: Loan) => void;
    onDelete: (id: string) => void;
    onEditLoan: (loan: Loan) => void;
    onOpenPayment: (loan: Loan, amount?: number) => void;
}

export function LoanCard({
    loan,
    ctxCurrency,
    paymentMethods,
    isOverdue,
    formatCurrencySmall,
    onOpenDisbursement,
    onOpenEdit,
    onDelete,
    onEditLoan,
    onOpenPayment
}: LoanCardProps) {
    const percentage = loan.total_amount > 0 ? (loan.paid_amount / loan.total_amount) * 100 : 0;
    const isDebt = loan.type === 'borrowed';
    const overdue = isOverdue(loan);
    const isPendingDisbursement = !loan.is_disbursed && !loan.payment_method_id;
    const isOrphaned = loan.is_disbursed && !loan.payment_method_id;
    const isFullyPaid = loan.paid_amount >= loan.total_amount;

    return (
        <Card className={cn(
            "overflow-hidden border-l-4 transition-all hover:shadow-md border-border bg-gray-50/50 dark:bg-muted/20",
            isPendingDisbursement ? "border-l-slate-300 opacity-90" :
                isOrphaned ? "border-l-red-400 opacity-90" :
                    isDebt ? "border-l-destructive/60" : "border-l-emerald-500/60",
            overdue && !isPendingDisbursement && !isOrphaned && "bg-orange-50/30 border-l-orange-400"
        )}>
            <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg leading-tight truncate">{loan.name}</h3>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0",
                                isPendingDisbursement ? "bg-slate-100 text-slate-600" :
                                    isOrphaned ? "bg-red-100 text-red-600" :
                                        isDebt ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"
                            )}>
                                {isPendingDisbursement ? 'Pendiente Desembolso' :
                                    isOrphaned ? 'Reclassify' :
                                        (isDebt ? 'Deuda' : 'Por Cobrar')}
                            </span>
                            {overdue && !isPendingDisbursement && !isOrphaned && (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-100 text-orange-600 shrink-0">
                                    <AlertCircle className="h-3 w-3" />
                                    Vencido
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-x-3 gap-y-1 text-sm text-muted-foreground flex-wrap">
                            <p className="font-medium text-foreground/80">{formatCurrencySmall(loan.paid_amount)} / {formatCurrencySmall(loan.total_amount)}</p>
                            {loan.interest_rate > 0 && (
                                <p className="flex items-center gap-1">
                                    <Percent className="h-3 w-3" />
                                    {loan.interest_rate}%
                                </p>
                            )}
                            {loan.due_date && (
                                <p className={cn(
                                    "flex items-center gap-1",
                                    overdue ? "text-orange-600 font-medium" : ""
                                )}>
                                    <Calendar className="h-3 w-3" />
                                    {format(parseISO(loan.due_date), "d MMM", { locale: es })}
                                </p>
                            )}
                            {loan.payment_method_id ? (
                                <p className="flex items-center gap-1">
                                    <Wallet className="h-3 w-3" />
                                    {paymentMethods.find(pm => pm.id === loan.payment_method_id)?.name}
                                </p>
                            ) : (
                                <p className="flex items-center gap-1 text-slate-400">
                                    <XCircle className="h-3 w-3" />
                                    Sin cuenta
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-center sm:self-center">
                        {isPendingDisbursement ? (
                            <Button
                                size="sm"
                                className="gap-2 flex items-center justify-center hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60"
                                onClick={() => onOpenDisbursement(loan)}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm font-medium">{isDebt ? 'Recibir' : 'Confirmar'}</span>
                            </Button>
                        ) : isOrphaned ? (
                            <Button
                                size="sm"
                                className="gap-2 shadow-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center"
                                onClick={() => onOpenEdit(loan)}
                            >
                                Reclasificar <Edit2 className="h-4 w-4" />
                            </Button>
                        ) : isFullyPaid ? (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 bg-background border border-primary text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm"
                                onClick={() => onDelete(loan.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-sm flex items-center justify-center"
                                    onClick={() => onEditLoan(loan)}
                                    title="Editar"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-sm flex items-center justify-center"
                                    onClick={() => onOpenPayment(loan, loan.total_amount - loan.paid_amount)}
                                    title="Pagar Totalidad"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-sm flex items-center justify-center"
                                    onClick={() => onOpenPayment(loan)}
                                    title="Abonar"
                                >
                                    <HandCoins className="h-3.5 w-3.5" />
                                </Button>
                                <div className="flex flex-col items-end ml-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 flex items-center gap-1 leading-none mb-1">
                                        <Wallet className="h-3 w-3" /> Saldo
                                    </span>
                                    <p className="text-lg font-bold leading-tight tracking-tight text-foreground">
                                        <CurrencyDisplay amount={loan.total_amount} currencyCode={ctxCurrency} />
                                    </p>
                                    {loan.interest_rate > 0 && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-bold bg-amber-100 text-amber-800 leading-none mt-1 border-0">
                                            +{loan.interest_rate}%
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar & Paid Amount */}
                <div className="space-y-1.5 w-full">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Pagado: <CurrencyDisplay amount={loan.paid_amount} currencyCode={ctxCurrency} className="font-medium text-foreground" variant="small" /></span>
                        <span>Restante: <CurrencyDisplay amount={loan.total_amount - loan.paid_amount} currencyCode={ctxCurrency} className={cn("font-medium", overdue ? "text-destructive" : "text-foreground")} variant="small" /></span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span>Progreso de {isDebt ? 'pago' : 'cobro'}</span>
                            <span>{percentage.toFixed(2)}%</span>
                        </div>
                        <Progress
                            value={percentage}
                            className="h-2"
                            indicatorClassName={cn(
                                isPendingDisbursement ? "bg-slate-400" :
                                    isOrphaned ? "bg-destructive/80" :
                                        isDebt ? "bg-destructive" : "bg-emerald-500",
                                overdue && !isPendingDisbursement && !isOrphaned && "bg-orange-500"
                            )}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
