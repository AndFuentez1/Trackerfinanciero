
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import type { TransactionType } from '@/features/finance/hooks/useFinanceData';
import { Card, CardContent } from '@/shared/ui/card';
import { Check, X, Edit2, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { AddTransactionDialog } from './AddTransactionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingInvoice {
    id: string;
    created_at: string;
    arrival_date: string;
    amount: number;
    description: string;
    category?: string | null;
    category_id?: string | null;
    payment_method_id?: string | null;
    type?: TransactionType;
    date?: string | null;
    status: string;
    user_id: string;
}

export function PendingInvoicesPanel() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { addTransaction, paymentMethods, categories: financeCategories, refreshData } = useFinanceData();
    const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ amount: string, description: string, category: string, type: TransactionType, payment_method_id: string | null }>({ amount: '', description: '', category: '', type: 'expense', payment_method_id: null });

    const categories = financeCategories;
    const resolveCategoryName = (invoice: PendingInvoice) =>
        invoice.category ||
        categories.find(cat => cat.id === invoice.category_id)?.name ||
        '';

    useEffect(() => {
        if (!user) { return; }

        const fetchInvoices = async () => {
            const { data, error } = await (supabase
                .from('pending_invoices')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .or('source.is.null,source.eq.ai,source.eq.gmail')
                .order('arrival_date', { ascending: false }));

            if (error) {

                console.error('[PendingInvoicesPanel] Failed to fetch invoices', error);

                toast({

                    title: 'Error',

                    description: 'No se pudieron cargar las facturas pendientes.',

                    variant: 'destructive'

                });

            } else {
                setInvoices(data || []);
            }
            setLoading(false);
        };

        fetchInvoices();

        // Realtime Subscription
        const channel = supabase
            .channel('pending-invoices-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pending_invoices',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {

                    if (payload.errors?.length) {

                        console.error('[PendingInvoicesPanel] Realtime error', payload.errors);

                    }

                    fetchInvoices(); // Refresh consistent state

                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleStartEdit = (invoice: PendingInvoice) => {
        setEditingId(invoice.id);
        const defaultPaymentMethod = invoice.payment_method_id ?? (paymentMethods.length > 0 ? paymentMethods[0].id : null);
        const resolvedCategory = resolveCategoryName(invoice);
        const resolvedType = invoice.type || 'expense';
        setEditForm({
            amount: invoice.amount.toString(),
            description: invoice.description,
            category: resolvedCategory,
            type: resolvedType,
            payment_method_id: defaultPaymentMethod
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ amount: '', description: '', category: '', type: 'expense', payment_method_id: null });
    };

    const handleApprove = async (invoice: PendingInvoice) => {
        try {
            // Use the edit form data if editing, otherwise use invoice data
            const isEditing = editingId === invoice.id;
            const originalCategory = resolveCategoryName(invoice);
            const finalAmount = isEditing ? parseFloat(editForm.amount) : invoice.amount;
            const finalDescription = isEditing ? editForm.description : invoice.description;
            const finalCategory = (isEditing ? editForm.category : originalCategory).trim();
            const finalType = isEditing ? editForm.type : (invoice.type || 'expense');
            const finalPaymentMethodId = isEditing
                ? editForm.payment_method_id
                : (invoice.payment_method_id ?? (paymentMethods.length > 0 ? paymentMethods[0].id : null));

            // Validate payment method
            if (!finalPaymentMethodId) {
                toast({
                    title: 'Error',
                    description: 'Debes seleccionar un método de pago',
                    variant: 'destructive'
                });
                return;
            }

            // Find or create category
            let categoryId: string | null = null;
            if (finalCategory.trim()) {
                const existingCategory = categories.find(c => c.name.toLowerCase() === finalCategory.toLowerCase().trim());

                if (existingCategory) {
                    categoryId = existingCategory.id;
                } else {
                    // Create new category
                    const { data: newCategory, error: catError } = await supabase
                        .from('categories')
                        .insert({
                            name: finalCategory.trim(),
                            type: finalType,
                            user_id: user!.id,
                            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
                        })
                        .select()
                        .single();

                    if (catError) {
                        console.error('[PendingInvoicesPanel] Failed to create category', catError);
                        toast({ title: 'Error', description: 'No se pudo crear la categoría', variant: 'destructive' });
                        return;
                    }
                    categoryId = newCategory.id;
                    refreshData();
                }
            }

            // Create the transaction
            const transactionData = {
                amount: finalAmount,
                description: finalDescription,
                category: finalCategory.trim() || null,
                category_id: categoryId,
                type: finalType,
                payment_method_id: finalPaymentMethodId,
                date: invoice.arrival_date,
            };

            const result = await addTransaction(transactionData);

            if (result && result.error) {
                console.error('[PendingInvoicesPanel] Transaction failed', result.error);
                if (typeof result.error === 'string') {
                    // Toast likely shown by hook
                } else {
                    toast({ title: 'Error', description: 'No se pudo crear la transacción. Verifica los datos.', variant: 'destructive' });
                }
                return;
            }

            // Mark invoice as approved (delete it) ONLY if transaction succeeded
            const { error: deleteError } = await supabase
                .from('pending_invoices')
                .delete()
                .eq('id', invoice.id);

            if (deleteError) {
                console.error('[PendingInvoicesPanel] Failed to delete invoice', deleteError);
                toast({ title: 'Error', description: 'Se creó la transacción pero no se pudo eliminar de pendientes.', variant: 'destructive' });
                return;
            }

            toast({
                title: 'Factura aprobada',
                description: 'La transacción ha sido registrada exitosamente.'
            });
            setInvoices(prev => prev.filter(item => item.id !== invoice.id));
            setEditingId(null);
            setEditForm({ amount: '', description: '', category: '', type: 'expense', payment_method_id: null });

            // Retroalimentación para el clasificador (Aprendizaje)
            if (finalCategory.toLowerCase() !== originalCategory.toLowerCase()) {
                try {
                    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/classifier/learn`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user!.id,
                            pattern: finalDescription.split('(')[0].trim(),
                            category: finalCategory,
                            type: 'keyword'
                        })
                    });
                } catch (learnError) {
                    console.error('❌ Error enviando aprendizaje:', learnError);
                }
            }

            refreshData();

        } catch (error) {
            console.error('[PendingInvoicesPanel] Failed to approve invoice', error);
            toast({ title: 'Error', description: 'No se pudo aprobar la factura', variant: 'destructive' });
        }
    };

    const handleReject = async (id: string) => {
        const { error } = await supabase
            .from('pending_invoices')
            .delete()
            .eq('id', id);

        if (error) {
            toast({ title: 'Error', description: 'No se pudo rechazar la factura', variant: 'destructive' });
        } else {
            toast({ title: 'Factura rechazada', description: 'Se ha eliminado de la lista.' });
            setInvoices(prev => prev.filter(i => i.id !== id));
        }
    };

    if (loading || invoices.length === 0) { return null; }

    return (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 mb-6 animate-in slide-in-from-top-2">
            <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-orange-900">Facturas Pendientes</h3>
                        <p className="text-base text-orange-700">Tienes {invoices.length} nuevo(s) documento(s) por revisar.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {invoices.map(invoice => {
                        const isEditing = editingId === invoice.id;
                        const categoryLabel = resolveCategoryName(invoice);

                        return (
                            <div key={invoice.id} className="bg-white/80 p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col gap-4">
                                {isEditing ? (
                                    <div className="space-y-4 w-full">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">Descripción</label>
                                                <input
                                                    className="w-full mt-1 p-2 text-sm border rounded-md focus:ring-2 focus:ring-orange-500"
                                                    value={editForm.description}
                                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">Monto</label>
                                                <input
                                                    type="number"
                                                    className="w-full mt-1 p-2 text-sm border rounded-md focus:ring-2 focus:ring-orange-500"
                                                    value={editForm.amount}
                                                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">Tipo de Movimiento</label>
                                                <Select value={editForm.type} onValueChange={(v: TransactionType) => setEditForm({ ...editForm, type: v })}>
                                                    <SelectTrigger className="mt-1 h-10 bg-background/50 border-gray-100">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="expense">Gasto</SelectItem>
                                                        <SelectItem value="income">Ingreso</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 flex justify-between">
                                                    Categoría
                                                    {editForm.category && !categories.find(c => c.name.toLowerCase() === editForm.category.toLowerCase().trim()) && (
                                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                            Nueva
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="relative mt-1">
                                                    <input
                                                        className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-orange-500"
                                                        value={editForm.category}
                                                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                        placeholder="Escribe para buscar o crear..."
                                                        list={`cat-list-${invoice.id}`}
                                                    />
                                                    <datalist id={`cat-list-${invoice.id}`}>
                                                        {categories.filter(c => c.type === editForm.type).map(c => <option key={c.id} value={c.name} />)}
                                                    </datalist>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-slate-500">Método de Pago *</label>
                                                <Select
                                                    value={editForm.payment_method_id || ''}
                                                    onValueChange={(v) => setEditForm({ ...editForm, payment_method_id: v })}
                                                >
                                                    <SelectTrigger className="mt-1 h-10 bg-background/50 border-gray-100">
                                                        <SelectValue placeholder="Seleccionar método" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {paymentMethods.map(pm => (
                                                            <SelectItem key={pm.id} value={pm.id}>
                                                                {pm.name} ({pm.type})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 flex-wrap">
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(invoice)}
                                                disabled={!editForm.payment_method_id}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                                aria-label="Guardar y Aprobar"
                                                title="Guardar y Aprobar"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span className="hidden sm:inline ml-1">{!editForm.payment_method_id ? 'Selecciona método' : 'Guardar y Aprobar'}</span>
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg text-slate-800">${invoice.amount.toLocaleString('es-CO')}</span>
                                                {categoryLabel && (
                                                    <span className="text-xs text-orange-600 font-medium px-2 py-0.5 bg-orange-100 rounded-full truncate max-w-[150px]">
                                                        {categoryLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">{invoice.description}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Llegó: {format(new Date(invoice.arrival_date), "d MMM, h:mm a", { locale: es })}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                            <Button
                                                size="sm"
                                                className="text-white bg-slate-600 hover:bg-slate-700 shadow-sm border-none"
                                                onClick={() => handleStartEdit(invoice)}
                                                aria-label="Editar"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                <span className="hidden sm:inline ml-1">Editar</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-orange-500 hover:bg-orange-600 text-white border-none shadow-orange-200 shadow-md"
                                                onClick={() => handleApprove(invoice)}
                                                aria-label="Aprobar"
                                                title="Aprobar"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span className="hidden sm:inline ml-1">Aprobar</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="text-white bg-red-500 hover:bg-red-600 shadow-sm border-none"
                                                onClick={() => handleReject(invoice.id)}
                                                aria-label="Eliminar"
                                                title="Eliminar"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}




