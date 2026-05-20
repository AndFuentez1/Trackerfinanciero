import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { MoneyInput } from '@/shared/components/MoneyInput';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import type { TransactionType, PendingInvoice, Transaction } from '@/features/finance/types/financeTypes';
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
import { useUserConfig } from '@/features/finance/hooks/useUserConfig';

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
    originalData: unknown;
}

export function PendingInvoicesPanel() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { addTransaction, paymentMethods, categories: financeCategories, refreshData, allTransactions, updateTransaction, deleteTransaction } = useFinanceData();
    const { config, updateConfig } = useUserConfig(user?.id);
    const [searchParams, setSearchParams] = useSearchParams();
    const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<PanelItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ amount: number, description: string, category: string, type: TransactionType, payment_method_id: string | null, date: string }>({ amount: 0, description: '', category: '', type: 'expense', payment_method_id: null, date: '' });

    const normalizeDateInput = (value: string) => {
        if (!value) { return '1900-01-01'; }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { return value; }
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) { return '1900-01-01'; }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const categories = financeCategories;
    const resolveCategoryName = (invoice: { category_id?: string | null, category?: string | null } | PendingInvoice) =>
        categories.find(cat => cat.id === invoice.category_id)?.name ||
        invoice.category ||
        '';
    const normalizeCategoryLabel = (value?: string | null) => (value ?? '').trim().toLowerCase();

    const reclassifyTxs = useMemo(() => {
        const safeTransactions = allTransactions || [];
        return safeTransactions.filter(tx => {
            const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
            if (isTransfer) { return false; }
            return (!tx.category_id || !tx.payment_method_id) && tx.type !== 'saving' && tx.type !== 'investment';
        });
    }, [allTransactions]);

    const isPorClasificarTransaction = (tx: { category?: string | null, category_id?: string | null }) => {
        const label = normalizeCategoryLabel(resolveCategoryName(tx) || tx.category);
        return label === 'por clasificar';
    };

    const isPorClasificarInvoice = (inv: PendingInvoice) => {
        const label = normalizeCategoryLabel(resolveCategoryName(inv) || inv.category);
        return label === 'por clasificar';
    };

    const porClasificarTxs = useMemo(() => {
        const safeTransactions = allTransactions || [];
        return safeTransactions.filter(tx => {
            const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
            if (isTransfer) { return false; }
            return isPorClasificarTransaction(tx);
        });
    }, [allTransactions, categories]);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const fetchInvoices = async () => {
            const { data, error } = await supabase
                .from('pending_invoices')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .or('source.is.null,source.eq.ai,source.eq.gmail')
                .order('arrival_date', { ascending: false });

            if (cancelled) return;
            if (error) {
                console.error('[PendingInvoicesPanel] Failed to fetch invoices', error);
                toast({
                    title: 'Error',
                    description: 'No se pudieron cargar las facturas pendientes.',
                    variant: 'destructive',
                });
            } else {
                setInvoices(data || []);
            }
            setLoading(false);
        };

        fetchInvoices();

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
                    if (!cancelled) fetchInvoices();
                }
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleStartEdit = (invoice: PanelItem) => {
        setEditingId(invoice.id);
        const defaultPaymentMethod = invoice.payment_method_id ?? (paymentMethods.length > 0 ? paymentMethods[0].id : null);
        const resolvedCategory = resolveCategoryName(invoice);
        const resolvedType = invoice.type || 'expense';
        setEditForm({
            amount: Number(invoice.amount),
            description: invoice.description,
            category: resolvedCategory,
            type: resolvedType,
            payment_method_id: defaultPaymentMethod,
            date: normalizeDateInput(invoice.date)
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ amount: 0, description: '', category: '', type: 'expense', payment_method_id: null, date: '' });
    };

    const handleApprove = async (invoice: PanelItem) => {
        // Optimistic UI updates - Apply changes instantly
        const isEditing = editingId === invoice.id;
        const originalCategory = resolveCategoryName(invoice);
        const finalAmount = isEditing ? editForm.amount : invoice.amount;
        const finalDescription = isEditing ? editForm.description : invoice.description;
        const finalCategory = (isEditing ? editForm.category : originalCategory).trim();
        const finalType = isEditing ? editForm.type : (invoice.type || 'expense');
        const finalDate = (isEditing ? editForm.date : normalizeDateInput(invoice.date)) || '1900-01-01';
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
        setEditForm({ amount: 0, description: '', category: '', type: 'expense', payment_method_id: null, date: '' });

        // Soft success toast for perception of speed
        toast({ title: 'Aprobada', description: 'Procesando transacción...', duration: 2000 });

        // 3. Perform backend operation asynchronously (fire and forget pattern from user perspective)
        const performBackendOperation = async () => {
            try {
                let categoryId: string | null = null;
                if (finalCategory.trim()) {
                    const existingCategory = categories.find(c => c.name.toLowerCase() === finalCategory.toLowerCase().trim());
                    if (existingCategory) {
                        categoryId = existingCategory.id;
                    }
                    else {
                        const { data: newCategory, error: catError } = await supabase
                            .from('categories')
                            .insert({
                                name: finalCategory.trim(), type: finalType, user_id: user!.id,
                                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
                            }).select().single();

                        if (catError) {
                            throw new Error('No se pudo crear la categoría');
                        }
                        categoryId = newCategory.id;
                    }
                }

                const transactionData: Partial<Transaction> & { sync_code?: string } = {
                    amount: finalAmount, description: finalDescription, category: finalCategory.trim() || null,
                    category_id: categoryId, type: finalType, payment_method_id: finalPaymentMethodId, date: finalDate,
                };

                if (invoice.isTransaction) {
                    const result = await updateTransaction(invoice.id, transactionData);
                    if (result && result.error) throw new Error('No se pudo actualizar la transacción.');
                } else {
                    transactionData.sync_code = ((invoice as unknown) as { message_id?: string }).message_id || invoice.id;
                    const result = await addTransaction(transactionData as Omit<Transaction, 'id' | 'created_at'>);
                    if (result && result.error) {
                        throw new Error('No se pudo crear la transacción. Verifica los datos.');
                    }

                    const { error: deleteError } = await supabase.from('pending_invoices').delete().eq('id', invoice.id);
                    if (deleteError) {
                        throw new Error('Se creó la transacción pero no se limpió la alerta.');
                    }
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
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Error al guardar.';
                console.error('[PendingInvoicesPanel] Optimistic update failed on backend', error);

                // Rollback UI
                if (!invoice.isTransaction) { setInvoices(rollbackInvoices); }
                toast({ title: 'Error de sincronización', description: message, variant: 'destructive' });
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
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'No se pudo eliminar';
                // Rollback
                if (!invoice.isTransaction) { setInvoices(rollbackInvoices); }
                toast({ title: 'Error al rechazar', description: message, variant: 'destructive' });
            }
        };

        performBackendOperation();
    };



    const porClasificarItems: PanelItem[] = [
        ...porClasificarTxs.map(tx => ({
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
        ...invoices.filter(inv => isPorClasificarInvoice(inv)).map(inv => ({
            id: inv.id,
            isTransaction: false,
            amount: inv.amount,
            description: inv.description,
            category: inv.category,
            category_id: inv.category_id,
            payment_method_id: inv.payment_method_id,
            type: inv.type as TransactionType,
            date: inv.arrival_date,
            originalData: inv
        }))
    ];

    const missingDataInvoices: PanelItem[] = [
        ...reclassifyTxs.filter(tx => !isPorClasificarTransaction(tx)).map(tx => ({
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
        ...invoices
            .filter(inv => !isPorClasificarInvoice(inv))
            .filter(inv => !inv.payment_method_id || !resolveCategoryName(inv) || inv.amount <= 0)
            .map(inv => ({
            id: inv.id,
            isTransaction: false,
            amount: inv.amount,
            description: inv.description,
            category: inv.category,
            category_id: inv.category_id,
            payment_method_id: inv.payment_method_id,
            type: inv.type as TransactionType,
            date: inv.arrival_date,
            originalData: inv
        }))
    ];

    const readyToApproveInvoices: PanelItem[] = invoices
        .filter(inv => !isPorClasificarInvoice(inv))
        .filter(inv => !!inv.payment_method_id && !!resolveCategoryName(inv) && inv.amount > 0)
        .map(inv => ({
            id: inv.id,
            isTransaction: false,
            amount: inv.amount,
            description: inv.description,
            category: inv.category,
            category_id: inv.category_id,
            payment_method_id: inv.payment_method_id,
            type: inv.type as TransactionType,
            date: inv.arrival_date,
            originalData: inv
        }));

    const defaultTab = porClasificarItems.length > 0
        ? 'por-clasificar'
        : (missingDataInvoices.length > 0 ? 'missing' : 'ready');

    const renderInvoiceList = (invoiceList: PanelItem[], isReadyTab: boolean = false) => {
        if (invoiceList.length === 0) {
            return (
                <div className="py-10 text-center bg-muted/20 rounded-[20px] border-2 border-solid border-border/40 animate-in fade-in duration-700">
                    <div className="mx-auto w-14 h-14 rounded-full bg-background flex items-center justify-center mb-4 ring-1 ring-border shadow-sm">
                        <CheckCircle2 className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-base font-extrabold text-foreground tracking-tight">¡Todo al día!</p>
                    <p className="text-[15px] font-medium text-muted-foreground mt-1">No hay transacciones pendientes de revisión.</p>
                </div>
            );
        }

        const displayedInvoices = invoiceList.slice(0, 3);
        const hasMore = invoiceList.length > 3;

        return (
            <div className="flex flex-col gap-4">
                {displayedInvoices.map(invoice => {
                    const isEditing = editingId === invoice.id;
                    const categoryLabel = resolveCategoryName(invoice);

                    return (
                        <div key={invoice.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-5 transition-all duration-300 hover:shadow-md hover:border-primary/30">
                            {isEditing ? (
                                <div className="space-y-4 w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                                            <MoneyInput
                                                id="amount-edit"
                                                className="w-full mt-1 p-2 h-10 text-sm border rounded-md focus:ring-2 focus:ring-orange-500"
                                                value={editForm.amount}
                                                onChange={val => setEditForm({ ...editForm, amount: val })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500">Fecha</label>
                                            <input
                                                type="date"
                                                className="w-full mt-1 p-2 h-10 text-sm border rounded-md focus:ring-2 focus:ring-orange-500"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
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
                                            className="bg-primary hover:bg-primary/70 text-primary-foreground shadow-sm rounded-xl transition-all"
                                            aria-label="Guardar y aprobar"
                                            title="Guardar y aprobar"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={handleCancelEdit}
                                            className="bg-muted hover:bg-muted/50 rounded-xl border-none transition-all"
                                            aria-label="Cancelar"
                                            title="Cancelar"
                                        >
                                            <X className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 w-full">
                                    <div className="min-w-0 flex-1 space-y-2 sm:space-y-1.5">
                                        <div className="text-[14px] sm:text-[15px] font-bold text-foreground line-clamp-2 md:truncate tracking-tight leading-snug sm:leading-none" title={invoice.description}>
                                            {invoice.description}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {categoryLabel && (
                                                <>
                                                    <span className="text-[13px] sm:text-[15px] font-bold text-foreground leading-none">
                                                        {categoryLabel}
                                                    </span>
                                                    <div
                                                        className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm shadow-sm border border-black/5 shrink-0"
                                                        style={{ backgroundColor: categories.find(c => c.name.toLowerCase() === categoryLabel.toLowerCase())?.color || '#3b82f6' }}
                                                    />
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center">
                                            <span className="font-bold text-[14px] sm:text-[15px] text-foreground shrink-0 tracking-tight leading-none">
                                                ${invoice.amount.toLocaleString('es-CO')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-[11px] sm:text-[12px] font-medium text-muted-foreground flex items-center gap-1.5 bg-transparent leading-none">
                                                <Clock className="w-3 h-3 shrink-0" />
                                                {format(new Date(invoice.date), "d MMM, h:mm a", { locale: es })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row items-center gap-2 w-full mt-3 sm:mt-0 sm:min-w-[280px]">
                                        <Button
                                            size="sm"
                                            className="h-9 sm:h-10 px-3 sm:px-4 bg-primary hover:bg-primary/70 text-primary-foreground rounded-xl shadow-md flex-1 justify-center shadow-primary/20 transition-all active:scale-95"
                                            onClick={() => handleApprove(invoice)}
                                            aria-label="Aprobar"
                                            title="Aprobar"
                                        >
                                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-9 sm:h-10 px-3 sm:px-4 bg-muted hover:bg-muted/50 rounded-xl border-none flex-1 justify-center transition-all active:scale-95"
                                            onClick={() => handleStartEdit(invoice)}
                                            aria-label="Editar"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-9 sm:h-10 px-3 sm:px-4 bg-muted hover:bg-destructive/10 rounded-xl border-none flex-1 justify-center transition-all active:scale-95"
                                            onClick={() => handleReject(invoice)}
                                            aria-label="Eliminar"
                                            title="Eliminar"
                                        >
                                            <X className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {(hasMore || (isReadyTab && invoiceList.length > 0)) && (
                    <div className="flex justify-end mt-2">
                        <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                            Mostrando {Math.min(3, invoiceList.length)} de {invoiceList.length}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const isPanelHidden = config.hide_incomplete_alert;
    const totalPanelItems = porClasificarItems.length + missingDataInvoices.length + readyToApproveInvoices.length;
    if (loading || isPanelHidden || totalPanelItems === 0) {
        return null;
    }

    return (
        <Card className="border border-border/50 bg-gray-50/50 dark:bg-muted/20 shadow-sm rounded-2xl overflow-hidden mb-6 animate-in slide-in-from-top-4 duration-700">
            <CardContent className="p-0">
                <div className="p-5 sm:p-6 bg-muted/10 flex items-start gap-5 border-b border-border/50">
                    <div className="flex shrink-0 items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
                        <Clock className="h-5.5 w-5.5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center">
                            <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                                Revisiones pendientes ({totalPanelItems})
                            </h2>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 font-medium leading-tight">Acciones rápidas para mantener tu flujo financiero al día.</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:bg-muted h-9 w-9 p-0 rounded-lg shrink-0 ml-auto transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateConfig({ hide_incomplete_alert: true });
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>


                <div className="p-5 sm:p-6">
                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="flex flex-col sm:grid w-full sm:grid-cols-3 bg-muted p-1 rounded-xl border border-border/50 h-auto gap-1 sm:gap-0 mb-3">
                            <TabsTrigger value="por-clasificar" className="group data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 rounded-lg py-2 px-1 transition-all duration-300">
                                <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                                    <span className="text-[11px] sm:text-sm font-bold leading-none text-center">
                                        <span className="hidden sm:inline">Errores </span>Críticos
                                    </span>
                                    <Badge variant="secondary" className="bg-primary/10 text-zinc-700 group-data-[state=active]:bg-primary border-none px-1.5 sm:px-2 py-0.5 h-5 sm:h-6 font-black text-[10px] sm:text-sm transition-colors">
                                        {porClasificarItems.length}
                                    </Badge>
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="missing" className="group data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 rounded-lg py-2 px-1 transition-all duration-300">
                                <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                                    <span className="text-[11px] sm:text-sm font-bold leading-none text-center">
                                        Incompletos
                                    </span>
                                    <Badge variant="secondary" className="bg-primary/10 text-zinc-700 group-data-[state=active]:bg-primary border-none px-1.5 sm:px-2 py-0.5 h-5 sm:h-6 font-black text-[10px] sm:text-sm transition-colors">
                                        {missingDataInvoices.length}
                                    </Badge>
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="ready" className="group data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50 rounded-lg py-2 px-1 transition-all duration-300">
                                <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                                    <span className="text-[11px] sm:text-sm font-bold leading-none text-center">
                                        Listos
                                    </span>
                                    <Badge variant="secondary" className="bg-primary/10 text-zinc-700 group-data-[state=active]:bg-primary group-data-[state=active]:text-zinc-700 border-none px-1.5 sm:px-2 py-0.5 h-5 sm:h-6 font-black text-[10px] sm:text-sm transition-colors">
                                        {readyToApproveInvoices.length}
                                    </Badge>
                                </span>
                            </TabsTrigger>
                        </TabsList>



                        <TabsContent value="por-clasificar" className="space-y-3 mt-2">
                            {renderInvoiceList(porClasificarItems)}
                        </TabsContent>
                        <TabsContent value="missing" className="space-y-3 mt-2">
                            {renderInvoiceList(missingDataInvoices)}
                        </TabsContent>
                        <TabsContent value="ready" className="space-y-3 mt-2">
                            {renderInvoiceList(readyToApproveInvoices, true)}
                        </TabsContent>

                    </Tabs>
                </div>
            </CardContent>
        </Card>
    );
}




