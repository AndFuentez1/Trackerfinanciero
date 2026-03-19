import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Checkbox } from '@/shared/ui/checkbox';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion';
import { Archive, CheckCircle2, CheckSquare, History, Loader2, Search, Trash2, X, ChevronRight, FileText, DownloadCloud, ArrowRight, XCircle, ChevronDown, Inbox, FilterX, AlertCircle } from 'lucide-react';
import { cn } from '@/core/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { AddCategoryDialog } from '@/features/finance/categories/components/AddCategoryDialog';
import { Plus } from 'lucide-react';
import { AddPaymentMethodDialog } from '@/features/finance/payment-methods/components/AddPaymentMethodDialog';
import type { CategoryItem, PaymentMethod } from '@/features/finance/types/financeTypes';

// Types mapped from AdvancedSettings
export type GmailHistoryItem = {
    id: string;
    subject?: string;
    from?: string;
    date?: string;
    internalDate?: string;
    amount?: string | number;
    snippet?: string;
    status?: string;
};

export type GmailApprovalGroup = {
    id: string;
    description: string;
    category: string;
    category_id?: string | null;
    amount: number;
    arrival_date: string;
    payment_method_id: string | null;
};

export type GmailProduct = {
    description: string;
    quantity: number;
    price: number;
    total: number;
    totalExclTax?: number;
    taxAmount?: number;
    code?: string | null;
    category?: string;
    category_id?: string | null;
    payment_method_id?: string | null;
    confidence?: number;
    source?: string;
};

export type GmailImportResult = {
    messageId: string;
    status: 'pending' | 'telegram' | 'duplicate' | 'error' | 'loan_queued' | string;
    stepOfFailure?: 'rules' | 'ai' | null;
    subject?: string;
    from?: string;
    store?: string;
    total?: number;
    date?: string;
    groups?: GmailApprovalGroup[];
    products?: GmailProduct[];
    error?: string;
};

interface GmailHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isReviewing: boolean;
    importStep: 'search' | 'review';
    setImportStep: (step: 'search' | 'review') => void;

    // Search State
    searchRange: string;
    setSearchRange: (val: string) => void;
    searchLimit: string;
    setSearchLimit: (val: string) => void;
    searchType: string;
    setSearchType: (val: string) => void;
    hideApproved: boolean;
    setHideApproved: (val: boolean) => void;
    searching: boolean;
    handleSearch: () => void;

    // Results State
    visibleResults: GmailHistoryItem[];
    selectableResults: GmailHistoryItem[];
    selectedMessages: string[];
    setSelectedMessages: (val: string[]) => void;
    hasOnlyArchivedHidden: boolean;

    // Actions
    unarchiveMessages: (ids: string[]) => void;
    archiveMessages: (ids: string[]) => void;
    deleteMessages: (ids: string[]) => void;

    // Import
    importing: boolean;
    handleImportSelected: () => void;

    // Review State
    reviewItems: (GmailImportResult & { meta?: GmailHistoryItem })[];
    approvingMessageId: string | null;
    paymentMethods: PaymentMethod[];
    categories: CategoryItem[];

    // Review Actions
    updateImportProduct: (messageId: string, index: number, updates: Partial<GmailProduct>) => void;
    handleApproveInvoice: (messageId: string) => void;
    setImportResults: (updater: (prev: GmailImportResult[]) => GmailImportResult[]) => void;

    // Utils
    normalizeStatus: (status?: string) => string;
    safeFormatDate: (value?: string | null) => string;
    parseNumberValue: (value?: string | number | null) => number;
    resolveCategoryLabel: (category?: string | null, categoryId?: string | null) => string;

    // Additional Handlers
    onCancel: () => void;
}

export function GmailHistoryDialog({
    open,
    onOpenChange,
    isReviewing, // Keep for backward compatibility but use importStep for logic
    importStep,
    setImportStep,
    searchRange,
    setSearchRange,
    searchLimit,
    setSearchLimit,
    searchType,
    setSearchType,
    hideApproved,
    setHideApproved,
    searching,
    handleSearch,
    visibleResults,
    selectableResults,
    selectedMessages,
    setSelectedMessages,
    hasOnlyArchivedHidden,
    unarchiveMessages,
    archiveMessages,
    deleteMessages,
    importing,
    handleImportSelected,
    reviewItems,
    approvingMessageId,
    paymentMethods,
    categories,
    updateImportProduct,
    handleApproveInvoice,
    setImportResults,
    normalizeStatus,
    safeFormatDate,
    parseNumberValue,
    resolveCategoryLabel,
    onCancel
}: GmailHistoryDialogProps) {
    const { toast } = useToast();
    const {
        paymentMethods: allPaymentMethods,
        categories: allCategories,
        addCategory,
        loading
    } = useFinanceData();
    const [localCategories, setLocalCategories] = useState<CategoryItem[]>([]);
    const [localPaymentMethods, setLocalPaymentMethods] = useState<PaymentMethod[]>([]);

    const availablePaymentMethods = useMemo(() => {
        const combined = [...paymentMethods];
        localPaymentMethods.forEach(localPm => {
            if (!combined.some(p => p.id === localPm.id)) {
                combined.push(localPm);
            }
        });
        return combined.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }, [paymentMethods, localPaymentMethods]);

    // Solo categorías de tipo gasto para facturas importadas
    const expenseCategories = [...allCategories, ...localCategories]
        .filter(c => c.type === 'expense')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-4xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        {isReviewing ? 'Revisión de Facturas' : 'Buscar Historial de Facturas'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isReviewing
                            ? 'Revisa la información detectada y aprueba cada factura.'
                            : 'Busca facturas pasadas en tu Gmail para importarlas. Selecciona el rango de tiempo.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Tabs value={importStep} onValueChange={(v) => setImportStep(v as 'search' | 'review')} className="flex flex-col flex-1 min-h-0 mt-2">
                    <TabsList className="grid w-full grid-cols-2 mt-0 mx-4 mb-2">
                        <TabsTrigger value="search">1. Buscar facturas</TabsTrigger>
                        <TabsTrigger value="review" disabled={reviewItems.length === 0 && importStep !== 'review'}>
                            2. Validar (<span className="text-primary">{reviewItems.length}</span>)
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="review" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-semibold">Revisión de Facturas</p>
                                <p className="text-xs text-muted-foreground">Edita y aprueba cada factura antes de registrarla.</p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 min-h-0 border rounded-md">
                            {reviewItems.length > 0 ? (
                                <div className="p-4"><Accordion type="single" collapsible defaultValue={reviewItems[0]?.messageId} className="space-y-4">
                                    {reviewItems.map((item, index) => {
                                        const meta = item.meta as GmailHistoryItem | undefined;
                                        const isTelegram = item.status === 'telegram';
                                        const isDuplicate = item.status === 'duplicate';
                                        const isLoanQueued = item.status === 'loan_queued';
                                        const hasGroups = Boolean(item.groups && item.groups.length > 0);
                                        const statusLabel = isTelegram
                                            ? 'Enviado a Telegram'
                                            : item.status === 'pending'
                                                ? 'Pendiente aprobación'
                                                : item.status === 'duplicate'
                                                    ? 'Ya importado'
                                                    : item.status === 'error'
                                                        ? 'Error en procesamiento'
                                                        : item.status === 'loan_queued'
                                                            ? 'En préstamos'
                                                            : 'Listo para revisión';

                                        const isProcessed = isTelegram || isDuplicate || isLoanQueued;
                                        const hasError = item.status === 'error';

                                        const hasProducts = Boolean(item.products && item.products.length > 0);
                                        const productsTotal = hasProducts
                                            ? item.products?.reduce((sum, product) => sum + parseNumberValue(product.total), 0) ?? 0
                                            : (item.groups && item.groups.length > 0)
                                                ? item.groups.reduce((sum, g) => sum + parseNumberValue(g.amount), 0)
                                                : (parseNumberValue(item.total) || parseNumberValue((item as any).amount) || 0);

                                        return (
                                            <AccordionItem value={item.messageId} key={item.messageId} className="rounded-lg border bg-card/50 overflow-hidden">
                                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50 transition-colors">
                                                    <div className="flex items-center justify-between gap-3 w-full pr-4 text-left">
                                                        <div className="flex-1 space-y-1 min-w-0 pr-2">
                                                            <p className="text-sm font-semibold truncate max-w-0 min-w-full">
                                                                <span className="text-muted-foreground mr-2 font-normal">#{index + 1}</span>
                                                                {item.subject || meta?.subject || item.store || 'Factura'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">{item.from || meta?.from || item.store || 'Remitente desconocido'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="text-right flex flex-col items-end">
                                                                <span className="text-xs font-bold">${productsTotal.toLocaleString('es-CO')}</span>
                                                                <Badge variant={isProcessed ? "secondary" : hasError ? "destructive" : "outline"} className="text-[10px] whitespace-nowrap px-1 py-0 border-none h-4">
                                                                    {statusLabel}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>

                                                <AccordionContent className="p-4 pt-2 border-t bg-card/30">
                                                    <div className="mb-4 pb-2 border-b border-border/50">
                                                        <h3 className="text-sm font-bold text-foreground/90 flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-primary" />
                                                            {item.subject || meta?.subject || item.store || 'Factura / Transferencia'}
                                                        </h3>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {item.from || meta?.from || 'Remitente desconocido'}
                                                        </p>
                                                    </div>

                                                    {hasError && item.error && (
                                                        <div className="text-[10px] text-destructive font-medium truncate bg-destructive/5 px-2 py-1 rounded mb-3">
                                                            {item.error}
                                                        </div>
                                                    )}

                                                    {isLoanQueued ? (
                                                        <div className="text-xs text-muted-foreground">
                                                            Transferencia enviada a préstamos para completar los datos.
                                                        </div>
                                                    ) : isTelegram && !hasGroups && !hasProducts ? (
                                                        <div className="text-xs text-muted-foreground">
                                                            Enviado a Telegram para revisión manual. No se creó pendiente en la app.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {isProcessed && (
                                                                <div className="text-xs text-muted-foreground mb-2">
                                                                    {item.status === 'duplicate'
                                                                        ? "Esta factura ya había sido importada y se omitió para evitar duplicados."
                                                                        : isTelegram
                                                                            ? "También se envió a Telegram para revisión manual."
                                                                            : isLoanQueued
                                                                                ? "Esta transferencia quedó como préstamo en borrador."
                                                                                : "Esta factura ya fue procesada."}
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                const isTransfer = (item as any).type === 'transfer' || item.status === 'loan_queued' || (!hasProducts && !hasGroups && (item.subject?.toLowerCase().includes('transferencia') || item.store?.toLowerCase().includes('bancolombia') || item.store?.toLowerCase().includes('nequi')));
                                                                
                                                                if (isTransfer) {
                                                                    return (
                                                                        <div className="space-y-4">
                                                                            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-orange-50/30 border border-orange-100/50">
                                                                                <div className="space-y-1">
                                                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fecha</p>
                                                                                    <p className="text-sm font-medium">{safeFormatDate(item.date || meta?.date)}</p>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Monto</p>
                                                                                    <p className="text-sm font-bold text-primary">${productsTotal.toLocaleString('es-CO')}</p>
                                                                                </div>
                                                                                <div className="space-y-1 col-span-2">
                                                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Descripción</p>
                                                                                    <p className="text-sm">{item.subject || meta?.subject || item.store || 'Transferencia'}</p>
                                                                                </div>
                                                                                <div className="space-y-1 col-span-2">
                                                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Método de Pago</p>
                                                                                    <Select
                                                                                        value={(item.groups?.[0]?.payment_method_id) || (paymentMethods.length > 0 ? paymentMethods[0].id : "")}
                                                                                        onValueChange={(val) => {
                                                                                            // Para transferencias que no tienen productos, actualizamos el payment_method del primer grupo (o creamos uno)
                                                                                            setImportResults(prev => prev.map(r => {
                                                                                                if (r.messageId !== item.messageId) return r;
                                                                                                const updatedGroups = [...(r.groups || [])];
                                                                                                if (updatedGroups.length === 0) {
                                                                                                    updatedGroups.push({
                                                                                                        id: `manual-${item.messageId}-0`,
                                                                                                        description: item.subject || 'Transferencia',
                                                                                                        category: 'Otros',
                                                                                                        amount: productsTotal,
                                                                                                        arrival_date: item.date || new Date().toISOString(),
                                                                                                        payment_method_id: val
                                                                                                    });
                                                                                                } else {
                                                                                                    updatedGroups[0] = { ...updatedGroups[0], payment_method_id: val };
                                                                                                }
                                                                                                return { ...r, groups: updatedGroups };
                                                                                            }));
                                                                                        }}
                                                                                    >
                                                                                        <SelectTrigger className="h-9 w-full">
                                                                                            <SelectValue placeholder="Seleccionar método" />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {availablePaymentMethods.map(method => (
                                                                                                <SelectItem key={method.id} value={method.id}>
                                                                                                    {method.name}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-dashed border-muted-foreground/30">
                                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                                                                    <span>Esta transferencia se enviará a la zona de <strong>Préstamos</strong> para configurar el pago y categoría.</span>
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() => setImportResults(prev => prev.filter(r => r.messageId !== item.messageId))}
                                                                                    >
                                                                                        Descartar
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        className="bg-orange-600 hover:bg-orange-700 text-white"
                                                                                        onClick={async () => {
                                                                                            // Marcamos como loan_queued y aprobamos
                                                                                            setImportResults(prev => prev.map(r => r.messageId === item.messageId ? { ...r, status: 'loan_queued', type: 'transfer' } : r));
                                                                                            setTimeout(() => handleApproveInvoice(item.messageId), 100);
                                                                                        }}
                                                                                        disabled={approvingMessageId === item.messageId}
                                                                                    >
                                                                                        {approvingMessageId === item.messageId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                                                                                        Mandar a Préstamos
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                if (hasProducts || hasGroups) {
                                                                    const itemsToRender = hasProducts ? item.products! : item.groups!.map(g => ({
                                                                        description: g.description,
                                                                        quantity: 1,
                                                                        price: g.amount,
                                                                        total: g.amount,
                                                                        category: g.category,
                                                                        category_id: g.category_id,
                                                                        payment_method_id: g.payment_method_id
                                                                    }));

                                                                    return (
                                                                        <div className="rounded-md border bg-muted/30 overflow-hidden">
                                                                            <div className={cn("overflow-x-auto", isProcessed && "opacity-60 pointer-events-none grayscale")}>
                                                                                <Table className="min-w-[520px] w-full">
                                                                                    <TableHeader>
                                                                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                                                            <TableHead className="h-8 text-[10px] font-bold w-[35%]">Descripción</TableHead>
                                                                                            <TableHead className="h-8 text-[10px] font-bold w-[35%]">Categoría</TableHead>
                                                                                            <TableHead className="h-8 text-[10px] font-bold w-[120px] min-w-[120px]">Pago</TableHead>
                                                                                            <TableHead className="h-8 text-[10px] font-bold w-[100px] min-w-[100px] text-right">Total</TableHead>
                                                                                        </TableRow>
                                                                                    </TableHeader>
                                                                                    <TableBody>
                                                                                        {itemsToRender.map((product, pIndex) => (
                                                                                            <TableRow key={`${item.messageId}-p-${pIndex}`} className="hover:bg-muted/30">
                                                                                                <TableCell className="text-[10px] py-2 leading-snug font-medium max-w-[160px]">
                                                                                                    <span className="line-clamp-2 block">{product.description}</span>
                                                                                                </TableCell>
                                                                                                <TableCell className="py-1">
                                                                                                    <Select
                                                                                                        value={product.category_id || ""}
                                                                                                        onValueChange={(val) => {
                                                                                                            const match = expenseCategories.find(c => c.id === val);
                                                                                                            if (hasProducts) {
                                                                                                                updateImportProduct(item.messageId, pIndex, {
                                                                                                                    category_id: match?.id || null,
                                                                                                                    category: match?.name || val
                                                                                                                });
                                                                                                            } else {
                                                                                                                // Update group
                                                                                                                setImportResults(prev => prev.map(r => {
                                                                                                                    if (r.messageId !== item.messageId) return r;
                                                                                                                    const newGroups = [...(r.groups || [])];
                                                                                                                    if (newGroups[pIndex]) {
                                                                                                                        newGroups[pIndex] = {
                                                                                                                            ...newGroups[pIndex],
                                                                                                                            category_id: match?.id || null,
                                                                                                                            category: match?.name || val
                                                                                                                        };
                                                                                                                    }
                                                                                                                    return { ...r, groups: newGroups };
                                                                                                                }));
                                                                                                            }
                                                                                                        }}
                                                                                                    >
                                                                                                        <SelectTrigger className="h-7 text-xs">
                                                                                                            <SelectValue placeholder="Categoría" />
                                                                                                        </SelectTrigger>
                                                                                                        <SelectContent>
                                                                                                            {expenseCategories.map(cat => (
                                                                                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                                                                            ))}
                                                                                                            <div className="border-t border-border/50 px-1 py-1 mt-1">
                                                                                                                <AddCategoryDialog
                                                                                                                    type="expense"
                                                                                                                    onAdd={addCategory}
                                                                                                                    onSuccess={(cat) => {
                                                                                                                        setLocalCategories(prev => [...prev, cat]);
                                                                                                                        const updates = { category_id: cat.id, category: cat.name };
                                                                                                                        if (hasProducts) {
                                                                                                                            updateImportProduct(item.messageId, pIndex, updates);
                                                                                                                        } else {
                                                                                                                            setImportResults(prev => prev.map(r => {
                                                                                                                                if (r.messageId !== item.messageId) return r;
                                                                                                                                const newGroups = [...(r.groups || [])];
                                                                                                                                if (newGroups[pIndex]) {
                                                                                                                                    newGroups[pIndex] = { ...newGroups[pIndex], ...updates };
                                                                                                                                }
                                                                                                                                return { ...r, groups: newGroups };
                                                                                                                            }));
                                                                                                                        }
                                                                                                                    }}
                                                                                                                />
                                                                                                            </div>
                                                                                                        </SelectContent>
                                                                                                    </Select>
                                                                                                </TableCell>
                                                                                                <TableCell className="py-1">
                                                                                                    <Select
                                                                                                        value={product.payment_method_id || ""}
                                                                                                        onValueChange={(val) => {
                                                                                                            if (hasProducts) {
                                                                                                                updateImportProduct(item.messageId, pIndex, { payment_method_id: val });
                                                                                                            } else {
                                                                                                                setImportResults(prev => prev.map(r => {
                                                                                                                    if (r.messageId !== item.messageId) return r;
                                                                                                                    const newGroups = [...(r.groups || [])];
                                                                                                                    if (newGroups[pIndex]) {
                                                                                                                        newGroups[pIndex] = { ...newGroups[pIndex], payment_method_id: val };
                                                                                                                    }
                                                                                                                    return { ...r, groups: newGroups };
                                                                                                                }));
                                                                                                            }
                                                                                                        }}
                                                                                                    >
                                                                                                        <SelectTrigger className="h-7 text-xs">
                                                                                                            <SelectValue placeholder="Método" />
                                                                                                        </SelectTrigger>
                                                                                                        <SelectContent>
                                                                                                            {availablePaymentMethods.map(method => (
                                                                                                                <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                                                                                                            ))}
                                                                                                        </SelectContent>
                                                                                                    </Select>
                                                                                                </TableCell>
                                                                                                <TableCell className="text-[10px] text-right font-medium py-2">
                                                                                                    ${parseNumberValue(product.total).toLocaleString('es-CO')}
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        ))}
                                                                                    </TableBody>
                                                                                </Table>
                                                                            </div>
                                                                            <div className="flex items-center justify-end px-4 py-3 border-t bg-muted/10">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => setImportResults(prev => prev.filter(r => r.messageId !== item.messageId))}
                                                                                    disabled={approvingMessageId === item.messageId}
                                                                                >
                                                                                    Descartar Extraída
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-3">
                                                                        <span>No se detectaron productos ni información de transferencia válida.</span>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => setImportResults(prev => prev.filter(r => r.messageId !== item.messageId))}
                                                                        >
                                                                            Descartar
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion></div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                                    <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                                    <p className="text-sm">No hay facturas pendientes por aprobar.</p>
                                </div>
                            )}
                        </ScrollArea>

                        <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                            <Button variant="outline" onClick={onCancel}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => {
                                    // Aprobar todos los ítems actuales que no estén procesados todavía
                                    const pendingToApprove = reviewItems.filter(item => {
                                        const isTelegram = item.status === 'telegram';
                                        const isDuplicate = item.status === 'duplicate';
                                        const isLoanQueued = item.status === 'loan_queued';
                                        return !(isTelegram || isDuplicate || isLoanQueued);
                                    });

                                    if (pendingToApprove.length === 0) {
                                        toast({ title: 'Aviso', description: 'Estos productos ya fueron importados' });
                                        return;
                                    }

                                    pendingToApprove.forEach(item => {
                                        handleApproveInvoice(item.messageId);
                                    });
                                }}
                                disabled={paymentMethods.length === 0 || reviewItems.length === 0 || !!approvingMessageId}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            >
                                {approvingMessageId ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <CheckSquare className="h-4 w-4 mr-2" />
                                )}
                                Aprobar Facturas
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="search" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Rango de tiempo</Label>
                                <Select value={searchRange} onValueChange={setSearchRange}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Selecciona rango" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">Últimos 15 días</SelectItem>
                                        <SelectItem value="30">Último mes</SelectItem>
                                        <SelectItem value="180">Último semestre</SelectItem>
                                        <SelectItem value="365">Último año</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Cantidad de facturas</Label>
                                <Select value={searchLimit} onValueChange={setSearchLimit}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Límite" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 factura</SelectItem>
                                        <SelectItem value="5">5 facturas</SelectItem>
                                        <SelectItem value="10">10 facturas</SelectItem>
                                        <SelectItem value="15">15 facturas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Tipo de transacción</Label>
                                <Select value={searchType} onValueChange={setSearchType}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        <SelectItem value="invoice">Facturas</SelectItem>
                                        <SelectItem value="transfer">Transferencias</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4 pb-1 border-b">
                            <Label className="text-xs text-muted-foreground">Ocultar archivadas</Label>
                            <Switch checked={hideApproved} onCheckedChange={setHideApproved} />
                        </div>


                        <ScrollArea className="flex-1 min-h-0 border rounded-md">
                            {visibleResults.length > 0 ? (
                                <div className="space-y-3 p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b gap-2">
                                        <span className="text-sm font-medium whitespace-nowrap">
                                            {selectedMessages.length} de {visibleResults.length} seleccionadas
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2 pb-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs px-2 whitespace-nowrap"
                                                onClick={() => setSelectedMessages(selectableResults.map(r => r.id))}
                                            >
                                                Seleccionar todas
                                            </Button>
                                            {selectedMessages.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs px-2 whitespace-nowrap"
                                                    onClick={() => setSelectedMessages([])}
                                                >
                                                    Desmarcar todas
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {visibleResults.map((res) => {
                                        const normalizedStatus = normalizeStatus(res.status);
                                        const isArchived = normalizedStatus === 'archived';
                                        const statusLabel = isArchived ? 'Archivada' : normalizedStatus === 'read' ? 'Leída' : 'Nueva';
                                        return (
                                            <div
                                                key={res.id}
                                                className={cn(
                                                    "flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card",
                                                    isArchived && "opacity-60 text-muted-foreground"
                                                )}
                                            >
                                                <Checkbox
                                                    id={res.id}
                                                    checked={selectedMessages.includes(res.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (isArchived) { return; }
                                                        if (checked) { setSelectedMessages([...selectedMessages, res.id]); }
                                                        else { setSelectedMessages(selectedMessages.filter(id => id !== res.id)); }
                                                    }}
                                                    disabled={isArchived}
                                                />
                                                <div className="flex-1 space-y-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor={res.id} className="font-semibold text-sm truncate cursor-pointer block max-w-xs">
                                                            {res.subject}
                                                        </Label>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                                                                {res.date ? format(new Date(res.date), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                                            </Badge>
                                                            <Badge
                                                                variant={isArchived ? 'secondary' : 'outline'}
                                                                className={cn(
                                                                    "text-[10px] whitespace-nowrap",
                                                                    isArchived && "bg-muted/70 text-muted-foreground"
                                                                )}
                                                            >
                                                                {statusLabel}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{res.from}</p>
                                                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                                        {res.amount && <span className="font-bold text-primary mr-1">{typeof res.amount === 'number' ? `$ ${res.amount.toLocaleString('es-CO')}` : res.amount} -</span>}
                                                        "{res.snippet}"
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isArchived ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => unarchiveMessages([res.id])}
                                                            title="Desarchivar"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => archiveMessages([res.id])}
                                                            title="Archivar"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => deleteMessages([res.id])}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                                    <Search className="h-10 w-10 mb-2 opacity-20" />
                                    <p className="text-sm">
                                        {hasOnlyArchivedHidden
                                            ? 'Todas las facturas ya están registradas.'
                                            : 'Inicia una búsqueda para ver resultados'}
                                    </p>
                                </div>
                            )}
                        </ScrollArea>

                        <AlertDialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-end items-center gap-3">
                            <Button
                                onClick={handleSearch}
                                disabled={searching}
                                variant="default"
                                className="w-full sm:w-auto"
                            >
                                {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                Buscar transacciones
                            </Button>
                            <Button
                                disabled={selectedMessages.length === 0 || importing}
                                onClick={handleImportSelected}
                                className="w-full sm:w-auto"
                            >
                                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                                Importar Seleccionadas ({selectedMessages.length})
                            </Button>
                            <AlertDialogCancel onClick={onCancel} className="mt-0 w-full sm:w-auto">
                                Cancelar
                            </AlertDialogCancel>
                        </AlertDialogFooter>

                    </TabsContent>
                </Tabs>
            </AlertDialogContent>
        </AlertDialog >
    );
}
