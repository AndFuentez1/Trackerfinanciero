import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useSettingsPaymentMethods } from '../hooks/useSettingsPaymentMethods';
import { AddPaymentMethodDialog } from '@/features/finance/payment-methods/components/AddPaymentMethodDialog';
import { EditPaymentMethodDialog } from '@/features/finance/payment-methods/components/EditPaymentMethodDialog';
import type { PaymentMethod } from '@/features/finance/hooks/useFinanceData';
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

import { AccountsListSkeleton } from '@/shared/components/skeletons/SkeletonLoader';

interface PaymentMethodsSectionProps {
    highlighted?: boolean;
    onPaymentMethodCreated?: () => void;
}

export function PaymentMethodsSection({ highlighted, onPaymentMethodCreated }: PaymentMethodsSectionProps = {}) {
    const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, loading } = useSettingsPaymentMethods();
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <Wallet className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                                Mis Cuentas ({paymentMethods.length})
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 leading-tight">Cuentas bancarias, tarjetas y efectivo</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 -mx-2 px-2 max-h-[600px]">
                    {loading ? (
                        <AccountsListSkeleton count={2} />
                    ) : (
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
                    )}
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
                                    if (selectedPM) { deletePaymentMethod(selectedPM.id); }
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




