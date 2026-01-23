import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PaymentMethod, useFinanceData } from '@/hooks/useFinanceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
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
    onAdd: (fromId: string, toId: string, amount: number, description: string, date: string) => Promise<{ error: any }>;
}

export function AddTransferDialog({ onAdd }: AddTransferDialogProps) {
    const [open, setOpen] = useState(false);
    const { paymentMethods } = useFinanceData();

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
        const { error } = await onAdd(
            values.fromId,
            values.toId,
            values.amount,
            values.description || 'Transferencia',
            values.date
        );

        if (!error) {
            reset();
            setOpen(false);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: number) => void) => {
        const rawValue = e.target.value;
        const cleanValue = rawValue.replace(/\./g, '').replace(/,/g, '.');
        const parsedValue = parseFloat(cleanValue);
        onChange(isNaN(parsedValue) ? 0 : parsedValue);
    };

    const formatDisplayedAmount = (value: number) => {
        if (value === 0) return '';
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} modal={false}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2"
                    aria-label="Transferencia"
                    title="Transferencia"
                >
                    <ArrowRightLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Transferencia</span>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <FormField
                                control={control}
                                name="fromId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel>Desde</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Origen" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {paymentMethods.map((pm) => (
                                                    <SelectItem key={pm.id} value={pm.id}>
                                                        {pm.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="hidden sm:flex justify-center pb-3">
                                <ArrowRightLeft className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" />
                            </div>

                            <FormField
                                control={control}
                                name="toId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel>Hacia</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Destino" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {paymentMethods.map((pm) => (
                                                    <SelectItem key={pm.id} value={pm.id}>
                                                        {pm.name}
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
                                    <FormLabel>Monto</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                            <Input
                                                className="pl-7"
                                                placeholder="0"
                                                value={formatDisplayedAmount(field.value)}
                                                onChange={(e) => handleAmountChange(e, field.onChange)}
                                            />
                                        </div>
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
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Ajuste de saldos" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                            {isSubmitting ? 'Procesando...' : 'Completar Transferencia'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
