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
import { Archive, CheckCircle2, CheckSquare, History, Loader2, Search, Trash2, X, ChevronRight } from 'lucide-react';
import { cn } from '@/core/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/shared/hooks/use-toast';
import type { CategoryItem, PaymentMethod } from '@/features/finance/types/financeTypes';

// Types mapped from AdvancedSettings
export type GmailHistoryItem = {
    id: string;
    subject?: string;
    from?: string;
    date?: string;
    internalDate?: string;
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
    status: 'pending' | 'telegram' | 'duplicate' | 'error' | string;
    stepOfFailure?: 'rules' | 'ai' | null;
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

                        <ScrollArea className="flex-1 min-h-0 border rounded-md p-4">
                            {reviewItems.length > 0 ? (
                                <Accordion type="single" collapsible defaultValue={reviewItems[0]?.messageId} className="space-y-4">
                                    {reviewItems.map((item, index) => {
                                        const meta = item.meta as GmailHistoryItem | undefined;
                                        const isTelegram = item.status === 'telegram';
                                        const isPending = item.status === 'pending' || item.status === 'duplicate';
                                        const hasGroups = Boolean(item.groups && item.groups.length > 0);
                                        const statusLabel = isTelegram
                                            ? 'Enviado a Telegram'
                                            : item.status === 'pending'
                                                ? 'Pendiente aprobación'
                                                : item.status === 'duplicate'
                                                    ? 'Ya importado'
                                                    : item.status === 'error'
                                                        ? 'Error en procesamiento'
                                                        : 'Listo para revisión';

                                        const isProcessed = isTelegram || isPending;
                                        const hasError = item.status === 'error';

                                        const hasProducts = Boolean(item.products && item.products.length > 0);
                                        const productsTotal = hasProducts
                                            ? item.products?.reduce((sum, product) => sum + parseNumberValue(product.total), 0) ?? 0
                                            : item.groups?.reduce((sum, g) => sum + parseNumberValue(g.amount), 0) ?? 0;

                                        return (
                                            <AccordionItem value={item.messageId} key={item.messageId} className="rounded-lg border bg-card/50 overflow-hidden">
                                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/50 transition-colors">
                                                    <div className="flex items-center justify-between gap-3 w-full pr-4 text-left">
                                                        <div className="flex-1 space-y-1 min-w-0 pr-2">
                                                            <p className="text-sm font-semibold truncate">
                                                                <span className="text-muted-foreground mr-2 font-normal">#{index + 1}</span>
                                                                {meta?.subject || item.store || 'Factura'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">{meta?.from || item.store || 'Remitente desconocido'}</p>
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
                                                    {hasError && item.error && (
                                                        <div className="text-[10px] text-destructive font-medium truncate bg-destructive/5 px-2 py-1 rounded mb-3">
                                                            {item.error}
                                                        </div>
                                                    )}

                                                    {isTelegram && !hasGroups && !hasProducts ? (
                                                        <div className="text-xs text-muted-foreground">
                                                            Enviado a Telegram para revisión manual. No se creó pendiente en la app.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {isProcessed && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {item.status === 'duplicate'
                                                                        ? "Esta factura ya había sido importada y se omitió para evitar duplicados."
                                                                        : isTelegram
                                                                            ? "También se envió a Telegram para revisión manual."
                                                                            : "Esta factura ya fue procesada."}
                                                                </div>
                                                            )}
                                                            {hasProducts ? (
                                                                <div className="rounded-md border bg-muted/30">
                                                                    <div className={cn("p-0 overflow-x-auto overflow-y-hidden", isProcessed && "opacity-60 pointer-events-none grayscale")}>
                                                                        <Table className="min-w-[600px]">
                                                                            <TableHeader>
                                                                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                                                    <TableHead className="h-8 text-[10px] font-bold min-w-[150px]">Descripción</TableHead>
                                                                                    <TableHead className="h-8 text-[10px] font-bold w-[120px] min-w-[120px]">Categoría</TableHead>
                                                                                    <TableHead className="h-8 text-[10px] font-bold w-[120px] min-w-[120px]">Pago</TableHead>
                                                                                    <TableHead className="h-8 text-[10px] font-bold w-[100px] min-w-[100px] text-right">Total</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {item.products?.map((product, pIndex) => {
                                                                                    return (
                                                                                        <TableRow key={`${item.messageId}-p-${pIndex}`} className="hover:bg-muted/30">
                                                                                            <TableCell className="text-[10px] py-2 leading-relaxed font-medium">
                                                                                                {product.description}
                                                                                            </TableCell>
                                                                                            <TableCell className="py-1">
                                                                                                <Select
                                                                                                    value={product.category_id || product.category || ''}
                                                                                                    onValueChange={(val) => {
                                                                                                        const isId = categories.some(c => c.id === val);
                                                                                                        updateImportProduct(item.messageId, pIndex, {
                                                                                                            category_id: isId ? val : null,
                                                                                                            category: isId ? categories.find(c => c.id === val)?.name : val
                                                                                                        });
                                                                                                    }}
                                                                                                >
                                                                                                    <SelectTrigger className="h-7 text-xs">
                                                                                                        <SelectValue placeholder="Categoría" />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent>
                                                                                                        {categories.map(cat => (
                                                                                                            <SelectItem key={cat.id} value={cat.id}>
                                                                                                                {cat.name}
                                                                                                            </SelectItem>
                                                                                                        ))}
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                            </TableCell>
                                                                                            <TableCell className="py-1">
                                                                                                <Select
                                                                                                    value={product.payment_method_id || ''}
                                                                                                    onValueChange={(val) => updateImportProduct(item.messageId, pIndex, { payment_method_id: val })}
                                                                                                >
                                                                                                    <SelectTrigger className="h-7 text-xs">
                                                                                                        <SelectValue placeholder="Método" />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent>
                                                                                                        {paymentMethods.map(method => (
                                                                                                            <SelectItem key={method.id} value={method.id}>
                                                                                                                {method.name}
                                                                                                            </SelectItem>
                                                                                                        ))}
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-[10px] text-right font-medium py-2">
                                                                                                ${Number(product.total || 0).toLocaleString('es-CO')}
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    )
                                                                                })}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                    <div className="flex items-center justify-end px-4 py-3 border-t bg-muted/10">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setImportResults(prev => prev.filter(r => r.messageId !== item.messageId));
                                                                            }}
                                                                            disabled={approvingMessageId === item.messageId}
                                                                        >
                                                                            Descartar Extraída
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-3">
                                                                    <span>No se detectaron productos en el XML de esta factura.</span>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setImportResults(prev => prev.filter(r => r.messageId !== item.messageId));
                                                                        }}
                                                                    >
                                                                        Descartar
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
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
                                        const isPending = item.status === 'pending' || item.status === 'duplicate';
                                        return !(isTelegram || isPending);
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
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 mb-4">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Rango de tiempo</Label>
                                <Select value={searchRange} onValueChange={setSearchRange}>
                                    <SelectTrigger>
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
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Cantidad de facturas</Label>
                                <Select value={searchLimit} onValueChange={setSearchLimit}>
                                    <SelectTrigger>
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
                            <div className="flex items-center gap-2 pb-1">
                                <Label className="text-xs text-muted-foreground">Ocultar archivadas</Label>
                                <Switch checked={hideApproved} onCheckedChange={setHideApproved} />
                            </div>
                            <Button
                                onClick={handleSearch}
                                disabled={searching}
                            >
                                {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                Buscar
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 min-h-0 border rounded-md p-4">
                            {visibleResults.length > 0 ? (
                                <div className="space-y-3">
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
                                                        <Label htmlFor={res.id} className="font-semibold text-sm truncate cursor-pointer block">
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
                                                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic">"{res.snippet}"</p>
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

                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel onClick={onCancel}>
                                Cancelar
                            </AlertDialogCancel>
                            <Button
                                disabled={selectedMessages.length === 0 || importing}
                                onClick={handleImportSelected}
                            >
                                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                                Importar Seleccionadas ({selectedMessages.length})
                            </Button>
                        </AlertDialogFooter>
                    </TabsContent>
                </Tabs>
            </AlertDialogContent>
        </AlertDialog >
    );
}
