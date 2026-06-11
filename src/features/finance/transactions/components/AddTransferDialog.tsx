import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PaymentMethod, useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { Label } from '@/shared/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/shared/ui/form';
import { ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const transferSchema = z.object({
    fromId: z.string().min(1, "Selecciona una cuenta de origen"),
    toId: z.string().min(1, "Selecciona una cuenta de destino"),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
    description: z.string().optional(),
    date: z.string(),
}).refine((data) => data.fromId !== data.toId, {
    message: "La cuenta de origen y destino deben ser diferentes",
    path: ["toId"],
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface AddTransferDialogProps {
    onAdd: (args: { fromId: string; toId: string; amount: number; description: string; date: string }) => Promise<{ error: unknown }>;
}

export function AddTransferDialog({ onAdd }: AddTransferDialogProps) {
    const [open, setOpen] = useState(false);
    const { paymentMethods } = useFinanceData();
    const { currency, decimalPlaces } = useFinance();

    const getCurrencySymbol = () => {
        const curr = CURRENCIES.find(c => c.code === currency);
        return curr?.symbol || currency || '$';
    };



    const getPlaceholderAmount = () => {
        const decimals = '.'.padEnd(decimalPlaces + 1, '0');
        return decimalPlaces > 0 ? `100000${decimals}` : '100000';
    };

    const form = useForm<TransferFormValues>({
        resolver: zodResolver(transferSchema),
        defaultValues: {
            fromId: '',
            toId: '',
            amount: 0,
            description: '',
            date: format(new Date(), 'yyyy-MM-dd'),
        },
    });

    const { control, handleSubmit, reset, formState: { isSubmitting } } = form;

    const onFormSubmit = async (values: TransferFormValues) => {
        const { error } = await onAdd({
            fromId: values.fromId,
            toId: values.toId,
            amount: values.amount,
            description: values.description || 'Transferencia',
            date: values.date
        });

        if (!error) {
            reset();
            setOpen(false);
        }
    };

    // Removed manual formatting functions

    return (
        <Dialog open={open} onOpenChange={setOpen} modal={false}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    size="sm"
                    className="gap-2 min-w-[120px] sm:min-w-[140px] text-[15px] py-2 flex items-center justify-center hover:bg-primary/70 hover:text-white"
                    aria-label="Nueva transferencia"
                    title="Nueva transferencia"
                >
                    <span className="hidden sm:flex flex-row items-center gap-2"><ArrowRightLeft className="h-3 w-3" /> Nueva transferencia</span>
                    <span className="sm:hidden flex flex-row items-center gap-2"><ArrowRightLeft className="h-3 w-3" /> Nueva transferencia</span>
                </Button>
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-md max-h-[90vh] overflow-y-auto"
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Mover dinero entre cuentas</DialogTitle>
                    <DialogDescription className="sr-only">Transfiere saldo entre tus cuentas de forma interna.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 mt-4 pr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <FormField
                                control={control}
                                name="fromId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2 w-full">
                                        <FormLabel className="text-sm font-semibold">Desde (Cuenta Origen)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 text-sm bg-background">
                                                    <SelectValue placeholder="Seleccionar origen" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {paymentMethods.map((pm) => (
                                                    <SelectItem key={pm.id} value={pm.id}>
                                                        {pm.name} ({getCurrencySymbol()}{Number(pm.balance).toLocaleString()})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="hidden sm:flex justify-center pt-6">
                                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <FormField
                                control={control}
                                name="toId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2 w-full">
                                        <FormLabel className="text-sm font-semibold">Hacia (Cuenta Destino)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 text-sm bg-background">
                                                    <SelectValue placeholder="Seleccionar destino" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {paymentMethods.map((pm) => (
                                                    <SelectItem key={pm.id} value={pm.id}>
                                                        {pm.name} ({getCurrencySymbol()}{Number(pm.balance).toLocaleString()})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-sm font-semibold">Monto a Transferir</FormLabel>
                                    <FormControl>
                                        <MoneyInput
                                            id="transfer-amount"
                                            placeholder={getPlaceholderAmount()}
                                            value={field.value}
                                            onChange={field.onChange}
                                            className="pl-12 h-12 text-base"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-sm font-semibold">Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Ajuste de saldos" {...field} className="h-12 text-sm" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full mt-2 h-12 text-base font-semibold" disabled={isSubmitting}>
                            {isSubmitting ? 'Procesando...' : 'Completar Transferencia'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}




