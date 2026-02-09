import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useSettingsPaymentMethods } from '../hooks/useSettingsPaymentMethods';
import { AddPaymentMethodDialog } from '@/features/finance/payment-methods/components/AddPaymentMethodDialog';
import { EditPaymentMethodDialog } from '@/features/finance/payment-methods/components/EditPaymentMethodDialog';
import { PaymentMethod } from '@/features/finance/hooks/useFinanceData';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { PaymentMethodList } from '@/features/finance/payment-methods/components/PaymentMethodList';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

interface PaymentMethodsSectionProps {
    highlighted?: boolean;
    onPaymentMethodCreated?: () => void;
}

export function PaymentMethodsSection({ highlighted, onPaymentMethodCreated }: PaymentMethodsSectionProps = {}) {
    const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useSettingsPaymentMethods();
    const { formatCurrency } = useFormatCurrency();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedPM, setSelectedPM] = useState<PaymentMethod | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleEdit = (pm: PaymentMethod) => {
        setSelectedPM(pm);
        setIsEditOpen(true);
    };

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                            <Wallet className="h-5 w-5 text-primary" />
                            Mis Cuentas ({paymentMethods.length})
                        </CardTitle>
                        <CardDescription>Cuentas bancarias, tarjetas y efectivo</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 -mx-2 px-2 max-h-[600px]">
                    <PaymentMethodList
                        paymentMethods={paymentMethods}
                        variant="settings"
                        onEdit={handleEdit}
                        onDelete={(pm) => {
                            setSelectedPM(pm);
                            setIsDeleteDialogOpen(true);
                        }}
                        onAdd={() => setIsAddOpen(true)}
                    />
                </ScrollArea>

                <AddPaymentMethodDialog
                    open={isAddOpen}
                    onOpenChange={setIsAddOpen}
                    onAdd={async (pm) => {
                        const result = await addPaymentMethod(pm);
                        // Trigger callback after adding payment method
                        if (onPaymentMethodCreated && !result.error) {
                            onPaymentMethodCreated();
                        }
                        return result;
                    }}
                />

                {selectedPM && (
                    <EditPaymentMethodDialog
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        paymentMethod={selectedPM}
                        onSave={updatePaymentMethod}
                    />
                )}

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Se eliminará <strong>{selectedPM?.name}</strong>.
                                Las transacciones asociadas se mantendrán pero sin método de pago asignado.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (selectedPM) deletePaymentMethod(selectedPM.id);
                                    setIsDeleteDialogOpen(false);
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                            >
                                Sí, eliminar cuenta
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}




