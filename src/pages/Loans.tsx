import { useState } from 'react';
import { useLoans, useCreateLoan, useUpdateLoan, useCreateLoanPayment, Loan } from '@/hooks/useLoans';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Wallet, Plus, Trash2, Edit2, HandCoins, LogOut, ArrowDownCircle, ArrowUpCircle, Calendar, AlertCircle, Percent, Save, CheckCircle2, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export default function LoansPage() {
    const navigate = useNavigate();
    const { loans, loading, refetch } = useLoans();
    const { createLoan } = useCreateLoan();
    const { updateLoan, deleteLoan } = useUpdateLoan();
    const { createPayment } = useCreateLoanPayment();
    const { paymentMethods, updateTransaction, transactions } = useFinanceData();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Payment Dialog State
    const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [paymentData, setPaymentData] = useState({ amount: '', date: new Date().toISOString().split('T')[0], methodId: '' });

    // Disbursement Dialog State
    const [disbursementDialog, setDisbursementDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [disbursementData, setDisbursementData] = useState({ date: new Date().toISOString().split('T')[0], methodId: '' });

    // Edit Dialog State for Orphaned Loans
    const [editDialog, setEditDialog] = useState<{ open: boolean; loan: Loan | null }>({ open: false, loan: null });
    const [editData, setEditData] = useState({ methodId: '' });


    const [formData, setFormData] = useState({
        name: '',
        total_amount: '',
        paid_amount: '0',
        interest_rate: '0',
        type: 'borrowed' as 'borrowed' | 'lent',
        due_date: '',
        payment_method_id: '',
        is_disbursed: true,
    });

    const formatCurrency = (val: number) => {
        return val.toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await createLoan({
            name: formData.name,
            total_amount: Number(formData.total_amount),
            interest_rate: Number(formData.interest_rate),
            type: formData.type,
            due_date: formData.due_date || null,
            payment_method_id: formData.payment_method_id || null, // Allow null if not disbursed
            is_disbursed: formData.is_disbursed,
        }, Number(formData.paid_amount));

        if (!error) {
            setIsDialogOpen(false);
            setFormData({ name: '', total_amount: '', paid_amount: '0', interest_rate: '0', type: 'borrowed', due_date: '', payment_method_id: '', is_disbursed: true });
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
        setPaymentData({ amount: '', date: new Date().toISOString().split('T')[0], methodId: '' });
    };

    const handleOpenDisbursement = (loan: Loan) => {
        setDisbursementDialog({ open: true, loan });
        setDisbursementData({ date: new Date().toISOString().split('T')[0], methodId: '' });
    };

    const handleOpenEdit = (loan: Loan) => {
        setEditDialog({ open: true, loan });
        setEditData({ methodId: '' });
    };


    const submitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentDialog.loan) return;

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
        if (!disbursementDialog.loan || !disbursementData.methodId) return;

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
            console.warn("Could not find original transaction for disbursement. Data might be out of sync.");
        }

        setDisbursementDialog({ open: false, loan: null });
        refetch();
    };

    const confirmEdit = async () => {
        if (!editDialog.loan || !editData.methodId) return;

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
        if (!loan.due_date || loan.paid_amount >= loan.total_amount) return false;
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


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Cargando préstamos...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <HandCoins className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-semibold">Préstamos y Deudas</h1>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className="gap-2"
                                    aria-label="Nuevo Préstamo"
                                    title="Nuevo Préstamo"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Nuevo Préstamo</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agregar Nuevo Préstamo</DialogTitle>
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
                                            <Input
                                                required
                                                type="number"
                                                placeholder="5000000"
                                                value={formData.total_amount}
                                                onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Monto Ya Pagado</label>
                                            <Input
                                                required
                                                type="number"
                                                placeholder="0"
                                                value={formData.paid_amount}
                                                onChange={e => setFormData({ ...formData, paid_amount: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Tasa de Interés (%)</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
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
                                    <div className="space-y-4 py-2 px-1 bg-secondary/10 rounded-xl border border-secondary/20">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-semibold flex items-center gap-2">
                                                    {formData.is_disbursed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                                                    ¿Se desembolsó el dinero?
                                                </Label>
                                                <p className="text-[10px] text-muted-foreground">
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
                                                        {pm.name}
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            (${Number(pm.balance).toLocaleString()})
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground mt-1">Cuenta donde se registra el movimiento inicial del préstamo.</p>
                                    </div>
                                    <Button type="submit" className="w-full">Guardar</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </header >

            {/* Payment Dialog */}
            < Dialog open={paymentDialog.open} onOpenChange={(open) => !open && setPaymentDialog({ open: false, loan: null })
            }>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Abono - {paymentDialog.loan?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPayment} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Monto del Abono</label>
                            <Input
                                required
                                type="number"
                                placeholder="0.00"
                                value={paymentData.amount}
                                onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                            />
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
                                        <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                                {paymentDialog.loan?.type === 'borrowed'
                                    ? 'Cuenta de donde sale el dinero para pagar.'
                                    : 'Cuenta donde entra el dinero recibido.'}
                            </p>
                        </div>
                        <Button type="submit" className="w-full">Registrar Pago</Button>
                    </form>
                </DialogContent>
            </Dialog >


            {/* Disbursement Dialog */}
            <Dialog open={disbursementDialog.open} onOpenChange={(open) => !open && setDisbursementDialog({ open: false, loan: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Desembolso - {disbursementDialog.loan?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-200">
                            Al confirmar, el monto de <strong>{formatCurrency(disbursementDialog.loan?.total_amount || 0)}</strong> impactará el saldo de la cuenta seleccionada.
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
                            <label className="text-sm font-medium">Cuenta de {disbursementDialog.loan?.type === 'borrowed' ? 'Destino (Ingreso)' : 'Origen (Salida)'}</label>
                            <Select
                                value={disbursementData.methodId}
                                onValueChange={(val) => setDisbursementData({ ...disbursementData, methodId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cuenta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map(pm => (
                                        <SelectItem key={pm.id} value={pm.id}>{pm.name} (${Number(pm.balance).toLocaleString()})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={confirmDisbursement} className="w-full" disabled={!disbursementData.methodId}>Confirmar Desembolso</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog for Orphaned Loans */}
            <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, loan: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reclasificar Préstamo - {editDialog.loan?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
                            Este préstamo no tiene cuenta asociada. Selecciona una cuenta para reclasificarlo.
                        </div>
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
                                        <SelectItem key={pm.id} value={pm.id}>{pm.name} (${Number(pm.balance).toLocaleString()})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={confirmEdit} className="w-full" disabled={!editData.methodId}>Reclasificar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
                {pendingDisbursementCount > 0 && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-4 duration-500">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle className="font-bold">Acción requerida</AlertTitle>
                        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                            <span>Tienes {pendingDisbursementCount} préstamos pendientes de desembolso.</span>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-destructive/5 border-destructive/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                                <ArrowDownCircle className="h-4 w-4" />
                                Mis Deudas Pendientes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalRemainingDebt)}</div>
                            <p className="text-xs text-muted-foreground mt-1">(Solo préstamos desembolsados)</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-500/5 border-emerald-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                <ArrowUpCircle className="h-4 w-4" />
                                Por Cobrar (Prestado)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRemainingReceivable)}</div>
                            <p className="text-xs text-muted-foreground mt-1">(Solo préstamos desembolsados)</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <h2 className="text-lg font-semibold px-1">Controla tus pagos y saldos pendientes</h2>

                    <div className="space-y-4">
                        {loans.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
                                No tienes préstamos registrados.
                            </div>
                        ) : (
                            loans.map(loan => {
                                const percentage = (loan.paid_amount / loan.total_amount) * 100;
                                const isDebt = loan.type === 'borrowed';
                                const overdue = isOverdue(loan);
                                const isPendingDisbursement = !loan.is_disbursed && !loan.payment_method_id;
                                const isOrphaned = loan.is_disbursed && !loan.payment_method_id;

                                return (
                                    <Card key={loan.id} className={cn(
                                        "overflow-hidden border-l-4 transition-all hover:shadow-md",
                                        isPendingDisbursement ? "border-l-slate-300 opacity-90" :
                                            isOrphaned ? "border-l-red-500 opacity-90" :
                                                isDebt ? "border-l-destructive border-border/50" : "border-l-emerald-500 border-border/50",
                                        overdue && !isPendingDisbursement && !isOrphaned && "bg-orange-50/30 border-l-orange-500"
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
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                                        <p>{formatCurrency(loan.paid_amount)} de {formatCurrency(loan.total_amount)}</p>
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
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2">
                                                        {isPendingDisbursement ? (
                                                            <Button
                                                                size="sm"
                                                                className="gap-2 shadow-sm bg-blue-600 hover:bg-blue-700 text-white animate-pulse"
                                                                onClick={() => handleOpenDisbursement(loan)}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                {isDebt ? 'Recibir Dinero' : 'Confirmar Desembolso'}
                                                            </Button>
                                                        ) : isOrphaned ? (
                                                            <Button
                                                                size="sm"
                                                                className="gap-2 shadow-sm bg-red-600 hover:bg-red-700 text-white"
                                                                onClick={() => handleOpenEdit(loan)}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                                Reclasificar
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                className="gap-2 shadow-sm"
                                                                onClick={() => handleOpenPayment(loan)}
                                                            >
                                                                <Save className="h-4 w-4" />
                                                                Abonar
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(loan.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span>Progreso de {isDebt ? 'pago' : 'cobro'}</span>
                                                    <span>{percentage.toFixed(1)}%</span>
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
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div >
    );
}
