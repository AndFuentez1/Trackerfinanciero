import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { useSettingsPaymentMethods } from '../hooks/useSettingsPaymentMethods';
import { AddPaymentMethodDialog } from '@/features/payment-methods/components/AddPaymentMethodDialog';
import { EditPaymentMethodDialog } from '@/features/payment-methods/components/EditPaymentMethodDialog';
import { PaymentMethod } from '@/hooks/useFinanceData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaymentMethodList } from '@/features/payment-methods/components/PaymentMethodList';

export function PaymentMethodsSection() {
    const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useSettingsPaymentMethods();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedPM, setSelectedPM] = useState<PaymentMethod | null>(null);

    const handleEdit = (pm: PaymentMethod) => {
        setSelectedPM(pm);
        setIsEditOpen(true);
    };

    const handleAddPaymentMethod = async (pm: any) => {
        const result = await addPaymentMethod(pm);
        if (!result.error && searchParams.get('section')) {
            navigate('/');
        }
        return result;
    };

    const handleUpdatePaymentMethod = async (id: string, pm: any) => {
        const result = await updatePaymentMethod(id, pm);
        if (!result.error && searchParams.get('section')) {
            navigate('/');
        }
        return result;
    };

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <Wallet className="h-5 w-5 text-primary" />
                        Mis Cuentas ({paymentMethods.length})
                    </CardTitle>
                    <CardDescription>Cuentas bancarias, tarjetas y efectivo</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="pr-4 pb-2">
                        <PaymentMethodList
                            paymentMethods={paymentMethods}
                            variant="settings"
                            onEdit={handleEdit}
                            onDelete={(pm) => deletePaymentMethod(pm.id)}
                            onAdd={() => setIsAddOpen(true)}
                        />
                    </div>
                </ScrollArea>

                <AddPaymentMethodDialog
                    open={isAddOpen}
                    onOpenChange={setIsAddOpen}
                    onAdd={handleAddPaymentMethod}
                />

                {selectedPM && (
                    <EditPaymentMethodDialog
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        paymentMethod={selectedPM}
                        onSave={handleUpdatePaymentMethod}
                    />
                )}
            </CardContent>
        </Card>
    );
}
