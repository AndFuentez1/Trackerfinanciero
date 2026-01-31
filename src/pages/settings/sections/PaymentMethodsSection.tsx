import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Plus, Edit2, Trash2, PiggyBank, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsPaymentMethods } from '../hooks/useSettingsPaymentMethods';
import { AddPaymentMethodDialog } from '@/features/payment-methods/components/AddPaymentMethodDialog';
import { EditPaymentMethodDialog } from '@/features/payment-methods/components/EditPaymentMethodDialog';
import { PaymentMethod } from '@/hooks/useFinanceData';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PaymentMethodsSection() {
    const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useSettingsPaymentMethods();
    const { formatCurrency } = useFormatCurrency();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedPM, setSelectedPM] = useState<PaymentMethod | null>(null);

    const handleEdit = (pm: PaymentMethod) => {
        setSelectedPM(pm);
        setIsEditOpen(true);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'credit': return <CreditCard className="h-4 w-4" />;
            case 'savings': return <PiggyBank className="h-4 w-4" />;
            case 'investment': return <PiggyBank className="h-4 w-4" />;
            default: return <Banknote className="h-4 w-4" />;
        }
    };

    const typeLabels: Record<string, string> = {
        debit: 'Débito / Efectivo',
        credit: 'Tarjeta de Crédito',
        savings: 'Ahorros',
        investment: 'Inversión'
    };

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Wallet className="h-5 w-5 text-primary" />
                            Mis Cuentas ({paymentMethods.length})
                        </CardTitle>
                        <CardDescription>Cuentas bancarias, tarjetas y efectivo</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2 h-10 px-4 rounded-xl shrink-0">
                        <Plus className="h-4 w-4" />
                        Nueva Cuenta
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 -mx-2 px-2 max-h-[400px]">
                    <div className="grid grid-cols-1 gap-3 pr-4 pb-2">
                        {paymentMethods.map((pm) => (
                            <div
                                key={pm.id}
                                className="group flex flex-col p-4 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-muted/30 transition-all duration-200 gap-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                                            style={{ backgroundColor: pm.color || '#64748b' }}
                                        >
                                            {getIcon(pm.type)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold truncate max-w-[150px]">{pm.name}</span>
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-none bg-muted font-bold tracking-wider uppercase">
                                                {typeLabels[pm.type] || pm.type}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm font-mono font-bold">{formatCurrency(pm.balance)}</p>
                                        {pm.type === 'credit' && pm.credit_limit && (
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                                Límite: {formatCurrency(pm.credit_limit)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity border-t border-dashed border-border/50 pt-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(pm)}
                                        className="h-8 gap-2 rounded-lg text-xs font-semibold"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Editar
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 gap-2 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Eliminar
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Se eliminará <strong>{pm.name}</strong>.
                                                    Las transacciones asociadas a esta cuenta podrían quedar sin método de pago.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => deletePaymentMethod(pm.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                                >
                                                    Sí, eliminar cuenta
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <AddPaymentMethodDialog
                    open={isAddOpen}
                    onOpenChange={setIsAddOpen}
                    onAdd={addPaymentMethod}
                />

                {selectedPM && (
                    <EditPaymentMethodDialog
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        paymentMethod={selectedPM}
                        onSave={updatePaymentMethod}
                    />
                )}
            </CardContent>
        </Card>
    );
}
