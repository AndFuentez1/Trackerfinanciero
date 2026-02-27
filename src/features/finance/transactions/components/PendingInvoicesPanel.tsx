import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Check, X, Edit2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AddTransactionDialog } from './AddTransactionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getBackendUrl } from '@/core/api/backend';

export interface PanelItem {
    id: string;
    isTransaction: boolean;
    amount: number;
    description: string;
    category?: string | null;
    category_id?: string | null;
    payment_method_id?: string | null;
    type?: TransactionType;
    date: string;
    originalData: any;
}

export function PendingInvoicesPanel() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { addTransaction, paymentMethods, categories: financeCategories, refreshData, allTransactions, updateTransaction, deleteTransaction } = useFinanceData();
    const [searchParams, setSearchParams] = useSearchParams();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<PanelItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ amount: string, description: string, category: string, type: TransactionType, payment_method_id: string | null }>({ amount: '', description: '', category: '', type: 'expense', payment_method_id: null });

    const categories = financeCategories;
    const resolveCategoryName = (invoice: { category_id?: string | null, category?: string | null }) =>
        categories.find(cat => cat.id === invoice.category_id)?.name ||
        invoice.category ||
        '';

    const reclassifyTxs = useMemo(() => {
        const safeTransactions = allTransactions || [];
        return safeTransactions.filter(tx => {
            const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
            if (isTransfer) { return false; }
            return (!tx.category_id || !tx.payment_method_id) && tx.type !== 'saving' && tx.type !== 'investment';
        });
    }, [allTransactions]);

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

    const handleStartEdit = (invoice: PanelItem) => {
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

    const handleApprove = async (invoice: PanelItem) => {
        // Optimistic UI updates - Apply changes instantly
        const isEditing = editingId === invoice.id;
        const originalCategory = resolveCategoryName(invoice);
        const finalAmount = isEditing ? parseFloat(editForm.amount) : invoice.amount;
        const finalDescription = isEditing ? editForm.description : invoice.description;
        const finalCategory = (isEditing ? editForm.category : originalCategory).trim();
        const finalType = isEditing ? editForm.type : (invoice.type || 'expense');
        const finalPaymentMethodId = isEditing
            ? editForm.payment_method_id
            : (invoice.payment_method_id ?? (paymentMethods.length > 0 ? paymentMethods[0].id : null));

        if (!finalPaymentMethodId) {
            toast({ title: 'Error', description: 'Debes seleccionar un método de pago', variant: 'destructive' });
            return;
        }

        // 1. Snapshot for rollback
        const rollbackInvoices = [...invoices];

        // 2. Hide from UI immediately
        if (!invoice.isTransaction) {
            setInvoices(prev => prev.filter(item => item.id !== invoice.id));
        }
        setEditingId(null);
        setEditForm({ amount: '', description: '', category: '', type: 'expense', payment_method_id: null });

        // Soft success toast for perception of speed
        toast({ title: 'Aprobada', description: 'Procesando transacción...', duration: 2000 });

        // 3. Perform backend operation asynchronously (fire and forget pattern from user perspective)
        const performBackendOperation = async () => {
            try {
                let categoryId: string | null = null;
                if (finalCategory.trim()) {
                    const existingCategory = categories.find(c => c.name.toLowerCase() === finalCategory.toLowerCase().trim());
                    if (existingCategory) { categoryId = existingCategory.id; }
                    else {
                        const { data: newCategory, error: catError } = await supabase
                            .from('categories')
                            .insert({
                                name: finalCategory.trim(), type: finalType, user_id: user!.id,
                                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
                            }).select().single();

                        if (catError) throw new Error('No se pudo crear la categoría');
                        categoryId = newCategory.id;
                    }
                }

                const transactionData = {
                    amount: finalAmount, description: finalDescription, category: finalCategory.trim() || null,
                    category_id: categoryId, type: finalType, payment_method_id: finalPaymentMethodId, date: invoice.date,
                };

                if (invoice.isTransaction) {
                    const result = await updateTransaction(invoice.id, transactionData);
                    if (result && result.error) throw new Error('No se pudo actualizar la transacción.');
                } else {
                    const result = await addTransaction(transactionData);
                    if (result && result.error) throw new Error('No se pudo crear la transacción. Verifica los datos.');

                    const { error: deleteError } = await supabase.from('pending_invoices').delete().eq('id', invoice.id);
                    if (deleteError) throw new Error('Se creó la transacción pero no se limpió la alerta.');
                }

                if (finalCategory.toLowerCase() !== originalCategory.toLowerCase()) {
                    try {
                        await fetch(`${getBackendUrl()}/api/classifier/learn`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user!.id, pattern: finalDescription.split('(')[0].trim(), category: finalCategory, type: 'keyword' })
                        });
                    } catch (e) { /* silent fail for ML */ }
                }

                // Actually sync real context data now that backend has processed
                refreshData();
            } catch (error: any) {
                console.error('[PendingInvoicesPanel] Optimistic update failed on backend', error);

                // Rollback UI
                if (!invoice.isTransaction) { setInvoices(rollbackInvoices); }
                toast({ title: 'Error de sincronización', description: error.message || 'Error al guardar.', variant: 'destructive' });
            }
        };

        // Fire & Forget call
        performBackendOperation();
    };

    const handleReject = async (invoice: PanelItem) => {
        // Optimistic UI updates
        const rollbackInvoices = [...invoices];
        if (!invoice.isTransaction) {
            setInvoices(prev => prev.filter(i => i.id !== invoice.id));
        }

        toast({ title: 'Rechazada', description: 'Eliminando...', duration: 2000 });

        const performBackendOperation = async () => {
            try {
                if (invoice.isTransaction) {
                    await deleteTransaction(invoice.id);
                } else {
                    const { error } = await supabase.from('pending_invoices').delete().eq('id', invoice.id);
                    if (error) throw new Error('No se pudo rechazar la factura en servidor');
                }
            } catch (error: any) {
                // Rollback
                if (!invoice.isTransaction) { setInvoices(rollbackInvoices); }
                toast({ title: 'Error al rechazar', description: error.message || 'No se pudo eliminar', variant: 'destructive' });
            }
        };

        performBackendOperation();
    };



    const missingDataInvoices: PanelItem[] = [
        ...reclassifyTxs.map(tx => ({
            id: tx.id,
            isTransaction: true,
            amount: tx.amount ?? 0,
            description: tx.description || '',
            category: tx.category,
            category_id: tx.category_id,
            payment_method_id: tx.payment_method_id,
            type: tx.type,
            date: tx.date || '',
            originalData: tx
        })),
        ...invoices.filter(inv => !inv.payment_method_id || !resolveCategoryName(inv) || inv.amount <= 0).map(inv => ({
            id: inv.id,
            isTransaction: false,
            amount: inv.amount,
            description: inv.description,
            category: inv.category,
            category_id: inv.category_id,
            payment_method_id: inv.payment_method_id,
            type: inv.type,
            date: inv.arrival_date,
            originalData: inv
        }))
    ];

    const readyToApproveInvoices: PanelItem[] = invoices.filter(inv => !!inv.payment_method_id && !!resolveCategoryName(inv) && inv.amount > 0).map(inv => ({
        id: inv.id,
        isTransaction: false,
        amount: inv.amount,
        description: inv.description,
        category: inv.category,
        category_id: inv.category_id,
        payment_method_id: inv.payment_method_id,
        type: inv.type,
        date: inv.arrival_date,
        originalData: inv
    }));

    const renderInvoiceList = (invoiceList: PanelItem[]) => {
        if (invoiceList.length === 0) {
            return (
                <div className="py-8 text-center bg-white/50 rounded-xl border border-dashed border-orange-200">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-orange-300 mb-2" />
                    <p className="text-sm font-medium text-slate-500">No hay facturas en esta sección.</p>
                </div>
            );
        }

        const displayedInvoices = invoiceList.slice(0, 3);
        const hasMore = invoiceList.length > 3;

        return (
            <div className="flex flex-col gap-3">
                {hasMore && (
                    <div className="text-sm font-normal bg-orange-200 text-orange-900 px-3 py-1 rounded-full place-self-end w-max">
                        Mostrando 3 de {invoiceList.length}
                    </div>
                )}
                {displayedInvoices.map(invoice => {
                    const isEditing = editingId === invoice.id;
                    const categoryLabel = resolveCategoryName(invoice);

                    return (
                        <div key={invoice.id} className="bg-white/80 p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col gap-4">
                            {isEditing ? (
                                <div className="space-y-4 w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500">Descripción</label>
                                            <input
                                                className="w-full mt-1 p-2 text-sm border rounded-md focus:ring-2 focus:ring-orange-500"
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500">Monto</label>
                                            <input
                                                type="number"
                                                className="w-full mt-1 p-2 text-sm border rounded-md focus:ring-2 focus:ring-orange-500"
                                                value={editForm.amount}
                                                onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
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
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500">Categoría</label>
                                            <Select
                                                value={editForm.category || ''}
                                                onValueChange={(v) => setEditForm({ ...editForm, category: v })}
                                            >
                                                <SelectTrigger className="mt-1 h-10 bg-background/50 border-gray-100">
                                                    <SelectValue placeholder="Seleccionar categoría" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.filter(c => c.type === editForm.type).map(c => (
                                                        <SelectItem key={c.id} value={c.name}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
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
                                                            {pm.name}
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
                                            className="bg-primary hover:bg-primary/60 text-primary-foreground shadow-sm"
                                            aria-label="Guardar y Aprobar"
                                            title="Guardar y Aprobar"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            className="hover:bg-primary/60 hover:text-primary-foreground"
                                            aria-label="Cancelar"
                                            title="Cancelar"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
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
                                            Llegó: {format(new Date(invoice.date), "d MMM, h:mm a", { locale: es })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                        <Button
                                            size="sm"
                                            className="bg-orange-500 hover:bg-orange-500/60 text-white border-none shadow-orange-200 shadow-md"
                                            onClick={() => handleApprove(invoice)}
                                            aria-label="Aprobar"
                                            title="Aprobar"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="text-white bg-slate-600 hover:bg-slate-600/60 shadow-sm border-none"
                                            onClick={() => handleStartEdit(invoice)}
                                            aria-label="Editar"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="text-white bg-red-500 hover:bg-red-500/60 shadow-sm border-none"
                                            onClick={() => handleReject(invoice)}
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
        );
    };

    const isPanelHidden = searchParams.get('hide_pending') === 'true';
    if (loading || isPanelHidden || invoices.length + reclassifyTxs.length === 0) {
        return null;
    }

    return (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 mb-6 animate-in slide-in-from-top-2">
            <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-0 mb-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-100 rounded-full text-orange-600 shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col mt-0.5">
                                <h3 className="font-semibold text-lg text-orange-900 tracking-tight leading-none">Facturas Pendientes ({invoices.length + reclassifyTxs.length})</h3>
                                <p className="text-sm text-orange-700 mt-1 font-medium leading-tight">Revisa las transacciones que requieren tu atención.</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-700 hover:bg-orange-100 h-8 w-8 p-0 shrink-0"
                            onClick={() => {
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set('hide_pending', 'true');
                                setSearchParams(newParams);
                            }}
                            title="Ocultar notificaciones de facturas"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="missing" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-orange-100/50 text-orange-900 mb-4">
                        <TabsTrigger value="missing" className="data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
                            Falta Clasificar
                            {missingDataInvoices.length > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-orange-200 text-orange-700 border-none hover:bg-orange-300">
                                    {missingDataInvoices.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="ready" className="data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
                            Listas para Aprobar
                            {readyToApproveInvoices.length > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-orange-500 text-white border-none hover:bg-orange-600">
                                    {readyToApproveInvoices.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="missing" className="space-y-3 mt-0">
                        {renderInvoiceList(missingDataInvoices)}
                    </TabsContent>
                    <TabsContent value="ready" className="space-y-3 mt-0">
                        {renderInvoiceList(readyToApproveInvoices)}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}




