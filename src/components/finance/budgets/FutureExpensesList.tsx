
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Plus, DollarSign, Wallet, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFinanceData } from '@/hooks/useFinanceData';
import { PaymentMethod } from '@/hooks/useFinanceData';
import { AddCategoryDialog } from '../AddCategoryDialog';

interface FutureExpense {
    id: string;
    payment_date: string;
    amount: number;
    description: string;
    category_id: string | null;
    status: 'pending' | 'paid';
}

export function FutureExpensesList() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { categories, paymentMethods, addTransaction, addCategory, loading: dataLoading } = useFinanceData();
    const [expenses, setExpenses] = useState<FutureExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Add Form State
    const [newExpense, setNewExpense] = useState({
        description: '',
        amount: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        category_id: ''
    });

    // Pay Dialog State
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<FutureExpense | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<FutureExpense | null>(null);

    useEffect(() => {
        if (!user) return;
        fetchExpenses();

        // Realtime Subscription
        const channel = supabase
            .channel('future-expenses-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'future_expenses', filter: `user_id=eq.${user.id}` },
                () => fetchExpenses()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const fetchExpenses = async () => {
        const { data } = await supabase
            .from('future_expenses' as any)
            .select('*')
            .eq('user_id', user!.id)
            .eq('status', 'pending')
            .order('payment_date', { ascending: true });

        if (data) setExpenses(data as any as FutureExpense[]);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newExpense.amount || !newExpense.description || !newExpense.payment_date) {
            toast({ title: 'Error', description: 'Por favor completa los campos obligatorios.', variant: 'destructive' });
            return;
        }

        const { error } = await supabase
            .from('future_expenses' as any)
            .insert({
                user_id: user!.id,
                description: newExpense.description,
                amount: parseFloat(newExpense.amount),
                payment_date: newExpense.payment_date,
                category_id: newExpense.category_id || null,
                status: 'pending'
            });

        if (error) {
            toast({ title: 'Error', description: 'No se pudo crear el gasto futuro.', variant: 'destructive' });
        } else {
            toast({ title: 'Creado', description: 'Gasto futuro programado.' });
            setIsAddOpen(false);
            setNewExpense({ description: '', amount: '', payment_date: format(new Date(), 'yyyy-MM-dd'), category_id: '' });
        }
    };

    const handlePay = async () => {
        if (!selectedExpense || !selectedPaymentMethod) return;

        try {
            // 1. Create Transaction (Deduct balance)
            const expenseCategory = categories.find(c => c.id === selectedExpense.category_id);

            await addTransaction({
                type: 'expense',
                category: expenseCategory?.name || 'Otros', // Fallback name if needed
                category_id: selectedExpense.category_id,
                amount: selectedExpense.amount,
                description: selectedExpense.description,
                date: new Date().toISOString().split('T')[0], // Paid TODAY? Or on payment_date? Usually "Pay Now" means Today.
                payment_method_id: selectedPaymentMethod
            });

            // 2. Update Future Expense status to 'paid'
            const { error } = await supabase
                .from('future_expenses' as any)
                .update({ status: 'paid' })
                .eq('id', selectedExpense.id);

            if (error) throw error;

            toast({ title: 'Pagado', description: 'El gasto ha sido registrado y descontado.' });
            setIsPayOpen(false);
            setSelectedExpense(null);
            setSelectedPaymentMethod('');

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Ocurrió un error al procesar el pago.', variant: 'destructive' });
        }
    };

    const handleDelete = async () => {
        if (!expenseToDelete) return;

        try {
            const { error } = await supabase
                .from('future_expenses' as any)
                .delete()
                .eq('id', expenseToDelete.id);

            if (error) throw error;

            toast({ title: 'Eliminado', description: 'El gasto futuro ha sido eliminado.' });
            setIsDeleteAlertOpen(false);
            setExpenseToDelete(null);
            fetchExpenses(); // Refresh list immediately
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo eliminar el gasto.', variant: 'destructive' });
        }
    };

    // Filter Expense Categories
    const expenseCategories = useMemo(() =>
        categories
            .filter(c => c.type === 'expense')
            .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
        [categories]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    Gastos Futuros y Compromisos
                </h2>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-dashed"
                            onClick={(e) => {
                                if (dataLoading) {
                                    e.preventDefault();
                                    return;
                                }
                                if (expenseCategories.length === 0) {
                                    e.preventDefault();
                                    toast({
                                        title: "Configuración requerida",
                                        description: "Primero debes configurar al menos una categoría de gasto.",
                                        variant: "destructive"
                                    });
                                }
                            }}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Agregar
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nuevo Gasto Futuro</DialogTitle>
                            <DialogDescription className="sr-only">
                                Completa la información para programar un gasto futuro.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Descripción</label>
                                    <Input
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        placeholder="Ej. Matrícula U"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Monto</label>
                                    <Input
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fecha de Pago</label>
                                <Input
                                    type="date"
                                    value={newExpense.payment_date}
                                    onChange={e => setNewExpense({ ...newExpense, payment_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Categoría</label>
                                <div className="flex items-center gap-2">
                                    <Select value={newExpense.category_id} onValueChange={v => setNewExpense({ ...newExpense, category_id: v })}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {expenseCategories.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex-shrink-0">
                                        <AddCategoryDialog 
                                            type="expense" 
                                            onAdd={addCategory}
                                            onSuccess={(cat) => {
                                                setNewExpense({ ...newExpense, category_id: cat.id });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full mt-4" onClick={handleCreate}>Guardar Compromiso</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenses.length === 0 && !loading && (
                    <div className="col-span-full text-center py-8 text-muted-foreground bg-slate-50 rounded-xl border border-dashed">
                        No tienes gastos futuros pendientes.
                    </div>
                )}
                {expenses.map(expense => {
                    const category = categories.find(c => c.id === expense.category_id);
                    return (
                        <Card key={expense.id} className="overflow-hidden border-l-4 border-l-indigo-400">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-slate-800">{expense.description}</h4>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            {format(new Date(expense.payment_date), "d 'de' MMMM", { locale: es })}
                                        </p>
                                    </div>
                                    <span className="font-bold text-indigo-600">
                                        ${expense.amount.toLocaleString('es-CO')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600 font-medium">
                                        {category?.name || 'Sin categoría'}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                                            setExpenseToDelete(expense);
                                            setIsDeleteAlertOpen(true);
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" className="h-8 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 border" onClick={() => {
                                            setSelectedExpense(expense);
                                            setIsPayOpen(true);
                                        }}>
                                            <DollarSign className="w-3 h-3 mr-1" /> Pagar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Delete Confirmation Alert */}
            <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Eliminar Gasto Futuro</DialogTitle>
                        <DialogDescription className="sr-only">
                            Confirma si deseas eliminar este gasto futuro. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            ¿Estás seguro de que quieres eliminar <strong>{expenseToDelete?.description}</strong>?
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsDeleteAlertOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pay Dialog */}
            <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
                <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Realizar Pago</DialogTitle>
                        <DialogDescription className="sr-only">
                            Registra el pago de este compromiso seleccionando el método de pago.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Estás a punto de pagar <strong>{selectedExpense?.description}</strong> por valor de <strong>${selectedExpense?.amount.toLocaleString('es-CO')}</strong>.
                            Selecciona la cuenta de origen:
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Método de Pago</label>
                            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cuenta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map(pm => (
                                        <SelectItem key={pm.id} value={pm.id}>
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-4 h-4 text-muted-foreground" />
                                                <span>{pm.name}</span>
                                                <span className="text-xs text-muted-foreground">(${Number(pm.balance).toLocaleString()})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button className="w-full mt-2" onClick={handlePay} disabled={!selectedPaymentMethod}>
                            Confirmar Pago
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
