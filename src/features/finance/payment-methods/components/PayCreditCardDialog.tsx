
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PaymentMethod, useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
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
import { CreditCard, Wallet, Banknote, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { useToast } from '@/shared/hooks/use-toast';

const payCardSchema = z.object({
    sourceId: z.string().min(1, "Selecciona una cuenta de origen"),
    amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
    date: z.string(),
    description: z.string().optional(),
});

type PayCardFormValues = z.infer<typeof payCardSchema>;

interface PayCreditCardDialogProps {
    card: PaymentMethod;
    onPay: (sourceId: string, targetId: string, amount: number, description: string, date: string) => Promise<{ error: unknown }>;
    trigger?: React.ReactNode;
}

export function PayCreditCardDialog({ card, onPay, trigger }: PayCreditCardDialogProps) {
    const [open, setOpen] = useState(false);
    const { paymentMethods, transactions } = useFinanceData();
    const { currency, decimalPlaces } = useFinance();
    const { toast } = useToast();

    // State for calculation options
    const [paymentType, setPaymentType] = useState<'month' | 'total' | 'custom'>('month');

    // Calculate debts
    const { totalDebt, monthlyDebt } = useMemo(() => {
        const total = card.balance; // Assuming balance represents current debt for credit cards

        let monthly = 0;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const cardTransactions = transactions.filter(t =>
            t.payment_method_id === card.id &&
            t.type === 'expense'
        );

        cardTransactions.forEach(tx => {
            const txDate = new Date(tx.date);
            const installments = tx.installments || 1;

            // Calculate months difference
            const monthsDiff = (currentYear - txDate.getFullYear()) * 12 + (currentMonth - txDate.getMonth());

            if (installments > 1) {
                // For installments: if we are within the payment period
                if (monthsDiff >= 0 && monthsDiff < installments) {
                    monthly += tx.amount / installments;
                }
            } else {
                // For one-time purchases: if made in current month
                // Note: strict billing cycle logic omitted as per request for "current month's debt"
                if (monthsDiff === 0) {
                    monthly += tx.amount;
                }
            }
        });

        return { totalDebt: total, monthlyDebt: monthly };
    }, [card, transactions]);

    const form = useForm<PayCardFormValues>({
        resolver: zodResolver(payCardSchema),
        defaultValues: {
            sourceId: '',
            amount: monthlyDebt,
            date: format(new Date(), 'yyyy-MM-dd'),
            description: `Pago Tarjeta ${card.name}`,
        },
    });

    // Update amount when payment type changes
    useEffect(() => {
        if (paymentType === 'month') {
            form.setValue('amount', monthlyDebt);
        } else if (paymentType === 'total') {
            form.setValue('amount', totalDebt);
        }
    }, [paymentType, monthlyDebt, totalDebt, form]);

    // Available source accounts (exclude the card itself and other credit cards)
    const sourceAccounts = paymentMethods.filter(pm =>
        pm.id !== card.id && pm.type !== 'credit'
    );

    const onFormSubmit = async (values: PayCardFormValues) => {
        try {
            const result = await onPay(
                values.sourceId,
                card.id,
                values.amount,
                values.description || `Pago Tarjeta ${card.name}`,
                values.date
            );

            if (result && result.error) {
                toast({
                    title: "Error",
                    description: "No se pudo procesar el pago.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Pago Exitoso",
                    description: "El pago a la tarjeta se ha registrado correctamente.",
                });
                setOpen(false);
                form.reset();
                setPaymentType('month');
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado.",
                variant: "destructive"
            });
        }
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency || 'COP',
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(val);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Pagar</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pagar Tarjeta de Crédito</DialogTitle>
                    <DialogDescription>
                        Registra un pago desde tus cuentas a {card.name}.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 pt-2">

                        {/* 1. Select Amount Type */}
                        <div className="space-y-3">
                            <Label>¿Cuánto deseas pagar?</Label>
                            <RadioGroup
                                value={paymentType}
                                onValueChange={(v: 'month' | 'total' | 'custom') => setPaymentType(v)}
                                className="grid gap-2"
                            >
                                <div className={`flex items-center justify-between space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50 ${paymentType === 'month' ? 'border-primary bg-primary/5' : ''}`}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="month" id="opt-month" />
                                        <Label htmlFor="opt-month" className="cursor-pointer">Pago del Mes</Label>
                                    </div>
                                    <span className="font-bold text-sm">{formatMoney(monthlyDebt)}</span>
                                </div>

                                <div className={`flex items-center justify-between space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50 ${paymentType === 'total' ? 'border-primary bg-primary/5' : ''}`}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="total" id="opt-total" />
                                        <Label htmlFor="opt-total" className="cursor-pointer">Deuda Total</Label>
                                    </div>
                                    <span className="font-bold text-sm">{formatMoney(totalDebt)}</span>
                                </div>

                                <div className={`flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50 ${paymentType === 'custom' ? 'border-primary bg-primary/5' : ''}`}>
                                    <RadioGroupItem value="custom" id="opt-custom" />
                                    <Label htmlFor="opt-custom" className="cursor-pointer">Otro Valor</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* 2. Custom Amount Input (if selected) */}
                        {paymentType === 'custom' && (
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor a pagar</FormLabel>
                                        <FormControl>
                                            <MoneyInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="0"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* 3. Source Account */}
                        <FormField
                            control={form.control}
                            name="sourceId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cuenta de Origen</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cuenta" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {sourceAccounts.map((acc) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    <div className="flex items-center gap-2">
                                                        {acc.type === 'cash' ? <Banknote className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                                                        <span>{acc.name}</span>
                                                        <span className="text-muted-foreground text-xs">({formatMoney(acc.balance)})</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 4. Date & Description (Collapsible/Optional visually, but fields exist) */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descripción</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
