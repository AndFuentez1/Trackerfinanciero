import { useState } from 'react';
import type { Loan } from '../hooks/useLoans';
import { useLoans, useCreateLoan, useUpdateLoan, useCreateLoanPayment } from '../hooks/useLoans';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
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
import { Wallet, Trash2, Edit2, HandCoins, ArrowDownCircle, ArrowUpCircle, Calendar, AlertCircle, Percent, Save, CheckCircle2, XCircle } from 'lucide-react';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/core/utils';
import { format, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { LoansSkeleton } from '@/shared/components/skeletons/SkeletonLoader';
import { getTodayLocalDate } from '@/core/utils';
import { Badge } from '@/shared/ui/badge';

export default function LoansPage() {
    const { user, loading: authLoading } = useAuth();
    const { loans, loading, error, refetch } = useLoans();
    const { createLoan } = useCreateLoan();
    const { updateLoan, deleteLoan } = useUpdateLoan();
    const { createPayment } = useCreateLoanPayment();
    const { paymentMethods, updateTransaction, transactions } = useFinanceData();
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
    const [paymentData, setPaymentData] = useState({ amount: '', date: getTodayLocalDate(), methodId: '' });

    // Disbursement Dialog State
    const [disbursementDialog, setDisbursementDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [disbursementData, setDisbursementData] = useState({ date: getTodayLocalDate(), methodId: '' });

    // Edit Dialog State for Orphaned Loans
    const [editDialog, setEditDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [editData, setEditData] = useState({ methodId: '' });


    const [formData, setFormData] = useState({
        name: '',
        total_amount: '',
        paid_amount: '',
        interest_rate: '',
        type: 'borrowed' as 'borrowed' | 'lent',
        due_date: '',
        payment_method_id: '',
        is_disbursed: true,
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            name: formData.name,
            total_amount: Number(formData.total_amount),
            interest_rate: Number(formData.interest_rate),
            type: formData.type,
            due_date: formData.due_date || null,
            payment_method_id: formData.payment_method_id || null, // Allow null if not disbursed
            is_disbursed: formData.is_disbursed,
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
            setFormData({ name: '', total_amount: '', paid_amount: '', interest_rate: '', type: 'borrowed', due_date: '', payment_method_id: '', is_disbursed: true });
            setEditingId(null);
            refetch();
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este préstamo?')) {
            await deleteLoan(id);
            refetch();
        }
    };

    const handleOpenPayment = (loan: Loan) => {
        setPaymentDialog({ open: true, loan });
        setPaymentData({ amount: '', date: getTodayLocalDate(), methodId: '' });
    };

    const handleOpenDisbursement = (loan: Loan) => {
        setDisbursementDialog({ open: true, loan });
        setDisbursementData({ date: getTodayLocalDate(), methodId: '' });
    };

    const handleOpenEdit = (loan: Loan) => {
        setEditDialog({ open: true, loan });
        setEditData({ methodId: '' });
    };



    const submitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentDialog.loan) { return; }

        await createPayment({
            loan_id: paymentDialog.loan.id,
            amount: Number(paymentData.amount),
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

    const myDebts = loans.filter(l => l.type === 'borrowed');
    const myReceivables = loans.filter(l => l.type === 'lent');

    // Only count debts that are disbursed (have payment method)
    const totalRemainingDebt = myDebts
        .filter(l => l.payment_method_id)
        .reduce((acc, l) => acc + (l.total_amount - l.paid_amount), 0);

    const totalRemainingReceivable = myReceivables
        .filter(l => l.payment_method_id)
        .reduce((acc, l) => acc + (l.total_amount - l.paid_amount), 0);

    const pendingDisbursementCount = loans.filter(l => !l.is_disbursed && !l.payment_method_id).length;


    const isLoading = loading || authLoading;

    if (!user && !isLoading) { return null; }

    if (error && loans.length === 0 && !isLoading) {
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
                {isLoading ? (
                    <LoansSkeleton />
                ) : (
                    <>
                        <header className="border-b border-border pb-6">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                                        <HandCoins className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Préstamos y Deudas</h1>
                                        <p className="text-muted-foreground font-medium mt-1 leading-none text-sm">Gestiona tus préstamos personales y deudas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end md:mt-1">
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                className="gap-2 border border-primary min-w-[44px] sm:min-w-[140px] text-[15px] md:text-[16px] py-2 flex items-center justify-center p-2 sm:px-4" // Better touch target
                                                aria-label="Nuevo préstamo"
                                                title="Nuevo préstamo"
                                            >
                                                <CheckCircle2 className="h-5 w-5 sm:h-4 sm:w-4" />
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
                                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{ctxCurrency}</span>
                                                            <Input
                                                                required
                                                                type="number"
                                                                placeholder={getPlaceholderAmount()}
                                                                value={formData.total_amount}
                                                                onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
                                                                step={getStepValue()}
                                                                className="pl-16"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Monto Ya Pagado</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{ctxCurrency}</span>
                                                            <Input
                                                                required
                                                                type="number"
                                                                placeholder={getPlaceholderAmount()}
                                                                value={formData.paid_amount}
                                                                onChange={e => setFormData({ ...formData, paid_amount: e.target.value })}
                                                                step={getStepValue()}
                                                                className="pl-16"
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
                                                            onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
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
                                                <Button type="submit" className="w-full min-w-[140px] flex items-center justify-center gap-2">Guardar <Save className="h-4 w-4" /></Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </header>

                        {/* Additional Dialogs (Payment, Disbursement, Edit) */}
                        <Dialog open={paymentDialog.open} onOpenChange={(open) => !open && setPaymentDialog({ open: false, loan: null })} modal={false}>
                            <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Registrar Abono - {paymentDialog.loan?.name}</DialogTitle>
                                    <DialogDescription className="sr-only">Registra un abono o pago a este préstamo.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submitPayment} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Monto del Abono</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{ctxCurrency}</span>
                                            <Input
                                                required
                                                type="number"
                                                placeholder={getPlaceholderAmount()}
                                                value={paymentData.amount}
                                                onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                                                step={getStepValue()}
                                                className="pl-16"
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

                        <Dialog open={disbursementDialog.open} onOpenChange={(open) => !open && setDisbursementDialog({ open: false, loan: null })} modal={false}>
                            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Confirmar Desembolso - {disbursementDialog.loan?.name}</DialogTitle>
                                    <DialogDescription className="sr-only">Confirma el desembolso del préstamo.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
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

                        <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, loan: null })} modal={false}>
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
                                            onValueChange={(val) => setEditData({ methodId: val })}
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

                        {pendingDisbursementCount > 0 && (
                            <Alert variant="destructive" className="bg-destructive/5 border-destructive/10 text-destructive animate-in fade-in slide-in-from-top-4 duration-500">
                                <AlertCircle className="h-5 w-5" />
                                <AlertTitle className="font-bold">Acción requerida</AlertTitle>
                                <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                                    <span>Tienes {pendingDisbursementCount} préstamos pendientes de desembolso.</span>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="flex flex-col p-6 bg-gray-50/50 dark:bg-muted/20 hover:shadow-md transition-shadow">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center p-0.5 rounded-md bg-background/50 ring-1 ring-border/50">
                                            <ArrowDownCircle className="h-4 w-4 text-destructive" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-lg sm:text-xl md:text-2xl font-bold text-muted-foreground leading-none tracking-tight">
                                                Mis Deudas Pendientes
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pl-[2.125rem] space-y-1">
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
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center p-0.5 rounded-md bg-background/50 ring-1 ring-border/50">
                                            <ArrowUpCircle className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-lg sm:text-xl md:text-2xl font-bold text-muted-foreground leading-none tracking-tight">
                                                Por Cobrar (Prestado)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pl-[2.125rem] space-y-1">
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

                        <div className="flex flex-col gap-6">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold px-1 tracking-tight leading-none">Controla tus pagos y saldos pendientes</h2>

                            <div className="flex flex-col gap-4">
                                {loans.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground bg-secondary/10 rounded-xl border border-dashed border-border/50">
                                        No tienes préstamos registrados.
                                    </div>
                                ) : (
                                    loans.map(loan => {
                                        const percentage = loan.total_amount > 0 ? (loan.paid_amount / loan.total_amount) * 100 : 0;
                                        const isDebt = loan.type === 'borrowed';
                                        const overdue = isOverdue(loan);
                                        const isPendingDisbursement = !loan.is_disbursed && !loan.payment_method_id;
                                        const isOrphaned = loan.is_disbursed && !loan.payment_method_id;
                                        const isFullyPaid = loan.paid_amount >= loan.total_amount;

                                        return (
                                            <Card key={loan.id} className={cn(
                                                "overflow-hidden border-l-4 transition-all hover:shadow-md border-border bg-gray-50/50 dark:bg-muted/20", // Added border-border
                                                isPendingDisbursement ? "border-l-slate-300 opacity-90" :
                                                    isOrphaned ? "border-l-red-400 opacity-90" :
                                                        isDebt ? "border-l-destructive/60" : "border-l-emerald-500/60", // Reduced opacity
                                                overdue && !isPendingDisbursement && !isOrphaned && "bg-orange-50/30 border-l-orange-400"
                                            )}>
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="font-semibold text-lg">{loan.name}</h3>
                                                                <span className={cn(
                                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                                                    isPendingDisbursement ? "bg-slate-100 text-slate-600" :
                                                                        isOrphaned ? "bg-red-100 text-red-600" :
                                                                            isDebt ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"
                                                                )}>
                                                                    {isPendingDisbursement ? 'Pendiente Desembolso' :
                                                                        isOrphaned ? 'Reclassify: No Account Linked' :
                                                                            (isDebt ? 'Deuda' : 'Por Cobrar')}
                                                                </span>
                                                                {overdue && !isPendingDisbursement && !isOrphaned && (
                                                                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-100 text-orange-600 animate-pulse">
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        Vencido
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-base text-muted-foreground flex-wrap">
                                                                <p>{formatCurrencySmall(loan.paid_amount)} de {formatCurrencySmall(loan.total_amount)}</p>
                                                                {loan.interest_rate > 0 && (
                                                                    <p className="flex items-center gap-1">
                                                                        <Percent className="h-3 w-3" />
                                                                        Int: {loan.interest_rate}%
                                                                    </p>
                                                                )}
                                                                {loan.due_date && (
                                                                    <p className={cn(
                                                                        "flex items-center gap-1",
                                                                        overdue ? "text-orange-600 font-medium" : ""
                                                                    )}>
                                                                        <Calendar className="h-3 w-3" />
                                                                        Vence: {format(parseISO(loan.due_date), "d 'de' MMM, yyyy", { locale: es })}
                                                                    </p>
                                                                )}
                                                                {loan.payment_method_id ? (
                                                                    <p className="flex items-center gap-1">
                                                                        <Wallet className="h-3 w-3" />
                                                                        Cuenta: {paymentMethods.find(pm => pm.id === loan.payment_method_id)?.name || 'Desconocida'}
                                                                    </p>
                                                                ) : (
                                                                    <p className="flex items-center gap-1 text-slate-400 font-medium">
                                                                        <XCircle className="h-3 w-3" />
                                                                        Sin desembolso
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 mt-4 md:mt-0">
                                                            {isPendingDisbursement ? (
                                                                <Button
                                                                    size="sm"
                                                                    className="gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white animate-pulse"
                                                                    onClick={() => handleOpenDisbursement(loan)}
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                    <span className="hidden sm:inline">{isDebt ? 'Recibir Dinero' : 'Confirmar Desembolso'}</span>
                                                                </Button>
                                                            ) : isOrphaned ? (
                                                                <Button
                                                                    size="sm"
                                                                    className="gap-2 shadow-sm bg-red-600 hover:bg-red-700 text-white min-w-[140px] flex items-center justify-center"
                                                                    onClick={() => handleOpenEdit(loan)}
                                                                >
                                                                    Reclasificar <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                            ) : isFullyPaid ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-9 w-9 bg-background border border-primary text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm"
                                                                    onClick={() => handleDelete(loan.id)}
                                                                    title="Eliminar historial"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-9 w-9 bg-background border border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-sm"
                                                                        onClick={() => {
                                                                            setFormData({
                                                                                name: loan.name,
                                                                                total_amount: loan.total_amount.toString(),
                                                                                paid_amount: loan.paid_amount.toString(),
                                                                                interest_rate: loan.interest_rate.toString(),
                                                                                type: loan.type,
                                                                                due_date: loan.due_date ? loan.due_date.split('T')[0] : '',
                                                                                payment_method_id: loan.payment_method_id || '',
                                                                                is_disbursed: !!loan.payment_method_id
                                                                            });
                                                                            setEditingId(loan.id);
                                                                            setIsDialogOpen(true);
                                                                        }}
                                                                        title="Editar"
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-9 w-9 bg-background border border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-sm"
                                                                        onClick={() => handleOpenPayment(loan)}
                                                                        title="Registrar Abono"
                                                                    >
                                                                        <HandCoins className="h-4 w-4" />
                                                                    </Button>
                                                                    <p className="text-lg font-semibold leading-none tracking-tight">
                                                                        <CurrencyDisplay amount={loan.total_amount} currencyCode={ctxCurrency} />
                                                                    </p>
                                                                    {loan.interest_rate > 0 && (
                                                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 font-normal border-amber-200 bg-amber-50 text-amber-700">
                                                                            +{loan.interest_rate}%
                                                                        </Badge>
                                                                    )}
                                                                </>
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
                                                                        isOrphaned ? "bg-red-500" :
                                                                            isDebt ? "bg-destructive" : "bg-emerald-500",
                                                                    overdue && !isPendingDisbursement && !isOrphaned && "bg-orange-500"
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )
                }
            </main >
        </div >
    );
}
