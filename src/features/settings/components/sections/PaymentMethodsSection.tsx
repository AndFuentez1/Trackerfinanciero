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
import { DeleteAccountConfirmDialog } from '@/features/finance/payment-methods/components/DeleteAccountConfirmDialog';

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
        // FIX 1: Cambiar h-full por h-fit y remover overflow-hidden si el padre lo impone.
        <Card className="rounded-2xl shadow-sm border-border bg-gray-50/50 dark:bg-muted/20 h-fit flex flex-col">
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
                            <p className="text-[15px] text-muted-foreground mt-1 leading-tight">Cuentas bancarias, tarjetas y efectivo</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            {/* FIX 2: Remover flex-1 y restricciones de min-h-0 */}
            <CardContent className="space-y-4">
                {/* FIX 3: Remover el ScrollArea de Shadcn. El scroll lo maneja el PaymentMethodList */}
                <div className="-mx-2 px-2">
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
                </div>

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

                <DeleteAccountConfirmDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    accountId={selectedPM?.id}
                    accountName={selectedPM?.name}
                    paymentMethods={paymentMethods}
                    onConfirm={(option, transferToId) => {
                        if (selectedPM) {
                            deletePaymentMethod(selectedPM.id, option, transferToId);
                        }
                    }}
                />
            </CardContent>
        </Card>
    );
}




