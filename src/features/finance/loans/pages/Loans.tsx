import { useState } from 'react';
import { useSEO } from '@/shared/hooks/useSEO';
import type { Loan } from '../hooks/useLoans';
import { useLoans, useCreateLoan, useUpdateLoan, useCreateLoanPayment } from '../hooks/useLoans';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { useToast } from '@/shared/hooks/use-toast';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/shared/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/shared/ui/select';
import { Progress } from '@/shared/ui/progress';
import { Wallet, Trash2, Edit2, HandCoins, ArrowDownCircle, ArrowUpCircle, Calendar, AlertCircle, Percent, Save, CheckCircle2, XCircle, Loader2, Activity } from 'lucide-react';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/core/utils';
import { format, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { getTodayLocalDate } from '@/core/utils';
import { Badge } from '@/shared/ui/badge';
import { LoansSummary } from '../components/LoansSummary';
import { LoanCard } from '../components/LoanCard';
import { usePageBootLoading } from '@/shared/layouts/PageBootContext';

export default function LoansPage() {
    useSEO({
        title: 'Préstamos',
        description: 'Loans & Debts - Manage your personal loans and tracked debts.'
    });
    const { user, loading: authLoading } = useAuth();
    const { loans, loading, bootLoading: loansBootLoading, error, refetch } = useLoans();
    const { createLoan } = useCreateLoan();
    const { updateLoan, deleteLoan } = useUpdateLoan();
    const { createPayment } = useCreateLoanPayment();
    const { paymentMethods, updateTransaction, transactions, bootLoading: financeBootLoading } = useFinanceData();
    const { toast } = useToast();
    const decimalPlaces = useDecimalPlaces();
    const { formatCurrency, formatCurrencySmall, decimalPlaces: dp } = useFormatCurrency();
    const { currency: ctxCurrency, decimalPlaces: ctxDecimalPlaces } = useFinance();
    const activeDecimals = ctxDecimalPlaces ?? decimalPlaces ?? 0;
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const getPlaceholderAmount = () => {
        const decimals = '.'.padEnd(activeDecimals + 1, '0');
        return activeDecimals > 0 ? `100000${decimals}` : '100000';
    };

    const getStepValue = () => {
        if (!activeDecimals || activeDecimals <= 0) { return '1'; }
        return `0.${'0'.repeat(activeDecimals - 1)}1`;
    };

    const getPlaceholderInterest = () => {
        if (activeDecimals && activeDecimals > 0) {
            const decimals = '.'.padEnd(activeDecimals + 1, '0');
            return `5${decimals}`;
        }
        return '5';
    };


    // Payment Dialog State
    const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [paymentData, setPaymentData] = useState({ amount: 0, date: getTodayLocalDate(), methodId: '' });

    // Disbursement Dialog State
    const [disbursementDialog, setDisbursementDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [disbursementData, setDisbursementData] = useState({ date: getTodayLocalDate(), methodId: '' });

    // Edit Dialog State for Orphaned Loans
    const [editDialog, setEditDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [editData, setEditData] = useState({ methodId: '' });


    const [formData, setFormData] = useState({
        name: '',
        total_amount: 0,
        paid_amount: 0,
        interest_rate: 0,
        type: 'borrowed' as 'borrowed' | 'lent',
        due_date: '',
        payment_method_id: '',
        is_disbursed: true,
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) { return; }
        setIsSubmitting(true);

        const payload = {
            name: formData.name,
            total_amount: Number(formData.total_amount),
            interest_rate: Number(formData.interest_rate),
            type: formData.type,
            due_date: formData.due_date || null,
            payment_method_id: formData.payment_method_id || null, // Allow null if not disbursed
            is_disbursed: formData.is_disbursed,
            updated_at: new Date().toISOString(),
        };

        let submitError;

        if (editingId) {
            const { error: err } = await updateLoan(editingId, payload);
            submitError = err;
        } else {
            const { error: err } = await createLoan(payload, Number(formData.paid_amount));
            submitError = err;
        }

        if (!submitError) {
            setIsDialogOpen(false);
            setFormData({ name: '', total_amount: 0, paid_amount: 0, interest_rate: 0, type: 'borrowed', due_date: '', payment_method_id: '', is_disbursed: true });
            setEditingId(null);
            refetch();
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este préstamo?')) {
            await deleteLoan(id);
            refetch();
        }
    };

    const handleOpenPayment = (loan: Loan, amount?: number) => {
        setPaymentDialog({ open: true, loan });
        setPaymentData({ amount: amount ?? 0, date: getTodayLocalDate(), methodId: '' });
    };

    const handleOpenDisbursement = (loan: Loan) => {
        setDisbursementDialog({ open: true, loan });
        setDisbursementData({ date: getTodayLocalDate(), methodId: '' });
    };

    const handleOpenEdit = (loan: Loan) => {
        setEditDialog({ open: true, loan });
        setEditData({ methodId: '' });
    };

    const handleEditFormOpen = (loan: Loan) => {
        setFormData({
            name: loan.name,
            total_amount: Number(loan.total_amount),
            paid_amount: Number(loan.paid_amount),
            interest_rate: Number(loan.interest_rate),
            type: loan.type,
            due_date: loan.due_date ? loan.due_date.split('T')[0] : '',
            payment_method_id: loan.payment_method_id || '',
            is_disbursed: !!loan.payment_method_id
        });
        setEditingId(loan.id);
        setIsDialogOpen(true);
    };



    const submitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentDialog.loan) { return; }

        const amount = Number(paymentData.amount);
        const remaining = paymentDialog.loan.total_amount - paymentDialog.loan.paid_amount;

        // Support overpayments - surplus handling is now in useCreateLoanPayment hook
        // if (amount > remaining) {
        //     toast({
        //         title: 'Monto excedido',
        //         description: `No puedes abonar más del saldo pendiente (${formatCurrency(remaining)})`,
        //         variant: 'destructive'
        //     });
        //     return;
        // }

        await createPayment({
            loan_id: paymentDialog.loan.id,
            amount: amount,
            date: paymentData.date,
            type: paymentDialog.loan.type,
            name: paymentDialog.loan.name,
            payment_method_id: paymentData.methodId
        });

        setPaymentDialog({ open: false, loan: null });
        refetch();
    };

    const confirmDisbursement = async () => {
        if (!disbursementDialog.loan || !disbursementData.methodId) { return; }

        const loan = disbursementDialog.loan;
        const pmId = disbursementData.methodId;
        const date = disbursementData.date;

        // 1. Update Loan
        await updateLoan(loan.id, {
            payment_method_id: pmId,
            is_disbursed: true
        });

        // 2. Find and Update the placeholder transaction
        // We look for a transaction with the same amount, approx date, and "Préstamos" category
        // that has NO payment method.
        // Or simpler: We search for the transaction created with description containing " (Sin desembolso)" 
        // and matching name.

        const candidateTx = transactions.find(t =>
            t.description.includes(loan.name) &&
            t.description.includes("(Sin desembolso)") &&
            Number(t.amount) === Number(loan.total_amount)
        );

        if (candidateTx) {
            const newDescription = candidateTx.description.replace(' (Sin desembolso)', '');
            await updateTransaction(candidateTx.id, {
                payment_method_id: pmId,
                date: date, // Update date to actual disbursement date
                description: newDescription
            });
        } else {
            // Fallback: If for some reason we can't find it, we might need to create one? 
            // Or just warn. But usually it should be there if createLoan made it.
            // If createLoan failed to make it, we might want to make one now using addTransaction logic
            // But let's assume it exists for now or the user manually manages it.

        }

        setDisbursementDialog({ open: false, loan: null });
        refetch();
    };

    const confirmEdit = async () => {
        if (!editDialog.loan || !editData.methodId) { return; }

        const loan = editDialog.loan;
        const pmId = editData.methodId;

        // Update loan
        await updateLoan(loan.id, { payment_method_id: pmId });

        // Update associated transactions (disbursement and payments)
        const associatedTxs = transactions.filter(t => t.description.includes(loan.name));
        for (const tx of associatedTxs) {
            await updateTransaction(tx.id, { payment_method_id: pmId });
        }

        setEditDialog({ open: false, loan: null });
        refetch();
    };

    const isOverdue = (loan: Loan) => {
        if (!loan.due_date || loan.paid_amount >= loan.total_amount) { return false; }
        return isPast(parseISO(loan.due_date));
    };

    const myDebts = loans.filter(l => l.type === 'borrowed' && Number(l.paid_amount) < Number(l.total_amount));
    const myReceivables = loans.filter(l => l.type === 'lent' && Number(l.paid_amount) < Number(l.total_amount));

    // Only count debts that are disbursed (have payment method)
    const totalRemainingDebt = myDebts
        .filter(l => l.payment_method_id)
        .reduce((acc, l) => acc + (l.total_amount - l.paid_amount), 0);

    const totalRemainingReceivable = myReceivables
        .filter(l => l.payment_method_id)
        .reduce((acc, l) => acc + (l.total_amount - l.paid_amount), 0);

    const pendingDisbursementCount = loans.filter(l => !l.is_disbursed && !l.payment_method_id).length;


    const isBootLoading = authLoading || financeBootLoading || loansBootLoading;
    const isLoading = loading || authLoading;
    usePageBootLoading(isBootLoading);

    if (!user && !isBootLoading) { return null; }

    if (error && loans.length === 0 && !isBootLoading) {
        return (
            <div className="min-h-screen bg-background/30">
                <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="container max-w-6xl mx-auto px-4 py-4">
                        <h1 className="text-lg sm:text-xl font-semibold">Préstamos y Deudas</h1>
                    </div>
                </header>
                <main className="container max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <p className="text-muted-foreground max-w-md">{error}</p>
                    <Button onClick={() => refetch()} variant="default">Reintentar</Button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background/30">
            <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
                {isBootLoading ? (
                    <SkeletonLoader tab="loans" withLayoutWrapper={true} fullPage={false} />
                ) : (
                    <>
                        <header className="border-b border-border pb-8">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                                        <HandCoins className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Préstamos y Deudas</h1>
                                        <p className="text-muted-foreground font-medium mt-[-6px] leading-none text-sm">Gestiona tus préstamos personales y deudas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-center md:justify-end md:mt-1">
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                className="gap-2 flex items-center justify-center hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60 md:text-[15px]"
                                                aria-label="Nuevo préstamo"
                                                title="Nuevo préstamo"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="hidden sm:inline">Nuevo préstamo</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>{editingId ? "Editar Préstamo" : "Agregar Nuevo Préstamo"}</DialogTitle>
                                                <DialogDescription className="sr-only">Formulario de préstamos</DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={handleCreate} className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Tipo</label>
                                                    <Select
                                                        value={formData.type}
                                                        onValueChange={(val: 'borrowed' | 'lent') => setFormData({ ...formData, type: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="borrowed">Dinero que recibí (Deuda)</SelectItem>
                                                            <SelectItem value="lent">Dinero que presté (Por cobrar)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Nombre del Préstamo</label>
                                                    <Input
                                                        required
                                                        placeholder="Ej: Préstamo Carro"
                                                        value={formData.name}
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Monto Total Original</label>
                                                        <div className="relative">
                                                            <MoneyInput
                                                                required
                                                                placeholder={getPlaceholderAmount()}
                                                                value={formData.total_amount}
                                                                onChange={val => setFormData({ ...formData, total_amount: val })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Monto Ya Pagado</label>
                                                        <div className="relative">
                                                            <MoneyInput
                                                                required
                                                                placeholder={getPlaceholderAmount()}
                                                                value={formData.paid_amount}
                                                                onChange={val => setFormData({ ...formData, paid_amount: val })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Tasa de Interés (%)</label>
                                                        <Input
                                                            type="number"
                                                            step={getStepValue()}
                                                            placeholder={getPlaceholderInterest()}
                                                            value={formData.interest_rate}
                                                            onChange={e => setFormData({ ...formData, interest_rate: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Fecha de Vencimiento (Opcional)</label>
                                                        <Input
                                                            type="date"
                                                            value={formData.due_date}
                                                            onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-4 py-2 px-1 bg-secondary/5 rounded-xl border border-border/30">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-sm font-semibold flex items-center gap-2">
                                                                {formData.is_disbursed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                                                                ¿Se desembolsó el dinero?
                                                            </Label>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formData.is_disbursed
                                                                    ? "El dinero entrará/saldrá de tu cuenta ahora."
                                                                    : "Solo registrar como recordatorio, sin afectar saldos."}
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={formData.is_disbursed}
                                                            onCheckedChange={(val) => setFormData({ ...formData, is_disbursed: val })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={cn("space-y-2 transition-opacity", !formData.is_disbursed && "opacity-50 pointer-events-none")}>
                                                    <label className="text-sm font-medium">Método de Origen/Destino</label>
                                                    <Select
                                                        value={formData.payment_method_id}
                                                        onValueChange={(val) => setFormData({ ...formData, payment_method_id: val })}
                                                        disabled={!formData.is_disbursed}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar cuenta..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {paymentMethods.map(pm => (
                                                                <SelectItem key={pm.id} value={pm.id}>
                                                                    <span className="flex items-center justify-between w-full gap-2">
                                                                        <span className="truncate">{pm.name}</span>
                                                                        <span className="text-[11px] text-muted-foreground inline-flex items-baseline gap-0.5">
                                                                            <span className="opacity-80">(</span>
                                                                            {formatCurrencySmall(pm.balance)}
                                                                            <span className="opacity-80">)</span>
                                                                        </span>
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-sm text-muted-foreground mt-1">Cuenta donde se registra el movimiento inicial del préstamo.</p>
                                                </div>
                                                <Button type="submit" disabled={isSubmitting} className="w-full min-w-[140px] flex items-center justify-center gap-2">
                                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                                                </Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </header>

                        {pendingDisbursementCount > 0 && (
                            <Alert variant="destructive" className="bg-destructive/5 border-destructive/10 text-destructive animate-in fade-in slide-in-from-top-4 duration-500">
                                <AlertCircle className="h-5 w-5" />
                                <AlertTitle className="font-bold">Acción requerida</AlertTitle>
                                <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                                    <span>Tienes {pendingDisbursementCount} préstamos pendientes de desembolso.</span>
                                </AlertDescription>
                            </Alert>
                        )}

                        <LoansSummary
                            totalRemainingDebt={totalRemainingDebt}
                            totalRemainingReceivable={totalRemainingReceivable}
                            ctxCurrency={ctxCurrency}
                        />

                        <div className="flex flex-col gap-6">
                            <div className="flex items-start gap-4 px-1">
                                <div className="flex shrink-0 items-center justify-center p-1">
                                    <Activity className="h-5 w-5 text-primary" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none mt-1">
                                        Controla tus pagos y saldos pendientes
                                    </h2>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                {loans.filter(l => l.paid_amount < l.total_amount).length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground bg-gray-50/50 dark:bg-muted/20 rounded-xl border border-border shadow-sm transition-all duration-300">
                                        No tienes préstamos activos.
                                    </div>
                                ) : (
                                    loans
                                        .filter(l => l.paid_amount < l.total_amount)
                                        .map(loan => (
                                            <LoanCard
                                                key={loan.id}
                                                loan={loan}
                                                ctxCurrency={ctxCurrency}
                                                paymentMethods={paymentMethods}
                                                isOverdue={isOverdue}
                                                formatCurrencySmall={formatCurrencySmall}
                                                onOpenDisbursement={handleOpenDisbursement}
                                                onOpenEdit={handleOpenEdit}
                                                onDelete={handleDelete}
                                                onEditLoan={handleEditFormOpen}
                                                onOpenPayment={handleOpenPayment}
                                            />
                                        ))
                                )}
                            </div>
                        </div>

                        {/* Additional Dialogs (Payment, Disbursement, Edit) */}
                        <Dialog open={paymentDialog.open} onOpenChange={(open) => !open && setPaymentDialog({ open: false, loan: null })} modal={true}>
                            <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Registrar Abono - {paymentDialog.loan?.name}</DialogTitle>
                                    <DialogDescription className="sr-only">Registra un abono o pago a este préstamo.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submitPayment} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Monto del Abono</label>
                                        <div className="relative">
                                            <MoneyInput
                                                required
                                                placeholder={getPlaceholderAmount()}
                                                value={paymentData.amount}
                                                onChange={val => setPaymentData({ ...paymentData, amount: val })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fecha</label>
                                        <Input
                                            required
                                            type="date"
                                            value={paymentData.date}
                                            onChange={e => setPaymentData({ ...paymentData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Método de Pago (Origen/Destino)</label>
                                        <Select
                                            value={paymentData.methodId}
                                            onValueChange={(val) => setPaymentData({ ...paymentData, methodId: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cuenta..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map(pm => (
                                                    <SelectItem key={pm.id} value={pm.id}>
                                                        <span className="flex items-center justify-between w-full gap-2">
                                                            <span className="truncate">{pm.name}</span>
                                                            <span className="text-[11px] text-muted-foreground inline-flex items-baseline gap-0.5">
                                                                <span className="opacity-80">(</span>
                                                                {formatCurrencySmall(pm.balance)}
                                                                <span className="opacity-80">)</span>
                                                            </span>
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="submit" className="w-full border border-primary min-w-[170px] flex items-center justify-center gap-2">Registrar Pago <HandCoins className="h-4 w-4" /></Button>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={disbursementDialog.open} onOpenChange={(open) => !open && setDisbursementDialog({ open: false, loan: null })} modal={true}>
                            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Confirmar Desembolso - {disbursementDialog.loan?.name}</DialogTitle>
                                    <DialogDescription className="sr-only">Confirma el desembolso del préstamo.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="p-3 bg-blue-50 text-blue-800 dark:text-blue-300 rounded-xl text-sm border border-blue-100">
                                        Confirmar el desembolso de <strong>{formatCurrency(disbursementDialog.loan?.total_amount || 0)}</strong>.
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fecha de Desembolso</label>
                                        <Input
                                            required
                                            type="date"
                                            value={disbursementData.date}
                                            onChange={e => setDisbursementData({ ...disbursementData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Cuenta asociada</label>
                                        <span className="sr-only">Seleccionar cuenta para el desembolso</span>
                                        <Select
                                            value={disbursementData.methodId}
                                            onValueChange={(val) => setDisbursementData({ ...disbursementData, methodId: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cuenta..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map(pm => (
                                                    <SelectItem key={pm.id} value={pm.id}>
                                                        {pm.name} ({formatCurrencySmall(pm.balance)})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={confirmDisbursement} className="w-full" disabled={!disbursementData.methodId}>Confirmar</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, loan: null })} modal={true}>
                            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Reclasificar Préstamo - {editDialog.loan?.name}</DialogTitle>
                                    <DialogDescription className="sr-only">Asocia una cuenta a este préstamo.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nueva Cuenta Asociada</label>
                                        <Select
                                            value={editData.methodId}
                                            onValueChange={(val) => setEditData({ ...editData, methodId: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cuenta..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map(pm => (
                                                    <SelectItem key={pm.id} value={pm.id}>
                                                        {pm.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={confirmEdit} className="w-full" disabled={!editData.methodId}>Reclasificar</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </main>
        </div>
    );
}
