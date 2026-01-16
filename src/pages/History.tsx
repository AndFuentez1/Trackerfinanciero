import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceData } from '@/hooks/useFinanceData';
import { AddTransactionDialog } from '@/components/finance/AddTransactionDialog';
import { ImportExcelDialog } from '@/components/finance/ImportExcelDialog';
import { ExportExcelButton } from '@/components/finance/ExportExcelButton';
import { HistoryTab } from '@/components/finance/HistoryTab';
import { Wallet, LogOut, BarChart3, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PendingInvoicesPanel } from '@/components/finance/PendingInvoicesPanel';
import { ImportStatusBar } from '@/components/finance/ImportStatusBar';
import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '@/hooks/useFinanceData';

export default function HistoryPage() {
    // ============================================================================
    // ALL HOOKS AT TOP - BEFORE ANY CONDITIONALS
    // ============================================================================
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const highlightOrphaned = searchParams.get('reclassify') === 'true';
    const { user, loading: authLoading } = useAuth();
    const {
        transactions,
        paymentMethods,
        loading: dataLoading,
        deleteTransaction,
        addTransaction,
        addTransactionsBulk,
        categories,
        updateTransaction,
        dateFilter,
        updateFilter,
        loadMore,
        hasMore,
        importProgress,
        hasPendingImport,
        startImport,
        cancelImport,
        confirmImportData,
        pendingImportData,
    } = useFinanceData();

    // useState hooks - MUST be before any conditionals
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [reclassifyDrafts, setReclassifyDrafts] = useState({});
    const [savingId, setSavingId] = useState<string | null>(null);

    // Computed values (not hooks, safe to compute here)
    const isLoading = authLoading || dataLoading;

    // Memoized values - transactions needing reclassification
    // CRITICAL: Exclude savings and investment types (managed in Savings tab only)
    const reclassifyTxs = useMemo(() => 
        transactions.filter(tx => 
            !tx.category_id && 
            tx.type !== 'saving' && 
            tx.type !== 'investment'
        ),
        [transactions]
    );

    // Memoized function to get filtered categories by type
    const getFilteredCategories = useMemo(() => {
        return (typeValue: string) => {
            if (!typeValue) return categories;
            
            // Map transaction types to category types
            const categoryTypeMap: Record<string, string> = {
                'expense': 'expense',
                'income': 'income',
                'saving': 'saving',
                'investment': 'investment',
                'loan': 'loan',
                'transfer': 'transfer',
                'transfer_in': 'transfer',
                'transfer_out': 'transfer',
            };
            
            const categoryType = categoryTypeMap[typeValue];
            return categories.filter(cat => cat.type === categoryType);
        };
    }, [categories]);

    // ============================================================================
    // HANDLERS (no hooks, safe to define here)
    // ============================================================================
    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsEditDialogOpen(true);
    };

    const handleReclassifyChange = (id: string, field: string, value: any) => {
        setReclassifyDrafts(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value ?? ''
            }
        }));
    };

    const handleReclassifySave = async (tx: Transaction) => {
        const draft = reclassifyDrafts[tx.id];
        if (!draft || !draft.category_id || !draft.type) return;
        
        setSavingId(tx.id);
        
        try {
            // Update with all necessary fields - setting category_id removes from reclassification zone
            await updateTransaction(tx.id, {
                category_id: draft.category_id,
                type: draft.type,
                description: draft.description,
                amount: Number(draft.amount),
                date: draft.date,
                payment_method_id: draft.payment_method_id,
            });
            
            // Remove from local drafts
            setReclassifyDrafts(prev => {
                const copy = { ...prev };
                delete copy[tx.id];
                return copy;
            });
        } finally {
            setSavingId(null);
        }
    };

    // ============================================================================
    // CONDITIONAL RETURNS (after all hooks)
    // ============================================================================
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Cargando...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-semibold">Historial</h1>
                    </div>
                </div>
            </header>

            {/* Action Bar - Toolbar with all action buttons */}
            <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-[73px] z-10">
                <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-end gap-2">
                    {/* Instance 1: Uncontrolled Add Transaction (shows button) */}
                    <AddTransactionDialog
                        onAdd={addTransaction}
                        categories={categories}
                        paymentMethods={paymentMethods}
                    />
                    <ExportExcelButton transactions={transactions} paymentMethods={paymentMethods} />
                    <ImportExcelDialog paymentMethods={paymentMethods} onImport={addTransactionsBulk} />
                </div>
            </div>

            {/* Instance 2: Controlled Edit Transaction Dialog (hidden trigger, opens via state) */}
            <AddTransactionDialog
                transactionToEdit={editingTransaction}
                open={isEditDialogOpen}
                onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setEditingTransaction(null);
                }}
                categories={categories}
                paymentMethods={paymentMethods}
                onUpdateTransaction={async (id, updates) => {
                    await updateTransaction(id, updates);
                    setIsEditDialogOpen(false);
                    setEditingTransaction(null);
                }}
            />

            <main className="container max-w-6xl mx-auto px-4 py-8">
                {isLoading && !transactions.length ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Barra de estado: Mostrar siempre que haya datos cargados */}
                        <ImportStatusBar
                            uiState={
                                // La fuente de verdad UX es pendingImportData.length
                                pendingImportData.length > 0
                                    ? importProgress.status === 'loading'
                                        ? 'applying'
                                        : 'pending-approval'
                                    : 'none'
                            }
                            recordCount={pendingImportData.length}
                            onReviewAndApprove={async () => {
                                await confirmImportData();
                            }}
                            onDiscard={async () => {
                                await cancelImport();
                            }}
                        />

                        {/* Reclassification Zone Card */}
                        {reclassifyTxs.length > 0 && (
                            <div className="border-2 border-amber-400 bg-amber-50/40 rounded-xl p-6 mb-2 shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
                                <h2 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2" style={{ fontStyle: 'normal' }}>
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                    Zona de Reclasificación
                                </h2>
                                <div className="space-y-4">
                                    {reclassifyTxs.map(tx => {
                                        const draft = reclassifyDrafts[tx.id] || {
                                            description: tx.description || '',
                                            amount: tx.amount ?? '',
                                            date: tx.date || '',
                                            category_id: tx.category_id || '',
                                            type: tx.type || 'expense',
                                            payment_method_id: tx.payment_method_id || '',
                                        };
                                        
                                        const filteredCategories = getFilteredCategories(draft.type);
                                        const isSaving = savingId === tx.id;
                                        
                                        // Detectar qué campos ya tienen datos válidos (deben bloquearse)
                                        const hasValidDate = tx.date && tx.date.trim() !== '';
                                        const hasValidDescription = tx.description && tx.description.trim() !== '';
                                        const hasValidType = tx.type && tx.type !== '';
                                        const hasValidAmount = tx.amount !== null && tx.amount !== undefined && tx.amount !== 0;
                                        
                                        return (
                                            <div key={tx.id} className="bg-white rounded-lg border border-amber-200 p-4 flex flex-col md:flex-row md:items-end gap-4 shadow-sm" style={{ fontStyle: 'normal' }}>
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                                                    {/* Fecha (Date) - 1st */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground block text-left" style={{ fontStyle: 'normal' }}>Fecha</label>
                                                        <Input
                                                            type="date"
                                                            value={draft.date?.slice(0, 10) || ''}
                                                            onChange={e => handleReclassifyChange(tx.id, 'date', e.target.value)}
                                                            className="h-9 text-sm"
                                                            disabled={hasValidDate}
                                                        />
                                                    </div>

                                                    {/* Descripción (Description) - 2nd */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground block text-left" style={{ fontStyle: 'normal' }}>Descripción</label>
                                                        <Input
                                                            value={draft.description}
                                                            onChange={e => handleReclassifyChange(tx.id, 'description', e.target.value)}
                                                            placeholder="Descripción"
                                                            className="h-9 text-sm"
                                                            disabled={hasValidDescription}
                                                        />
                                                    </div>

                                                    {/* Tipo (Type) - 3rd */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground block text-left" style={{ fontStyle: 'normal' }}>Tipo</label>
                                                        <Select 
                                                            value={draft.type} 
                                                            onValueChange={(value) => {
                                                                handleReclassifyChange(tx.id, 'type', value);
                                                                // Clear category when type changes
                                                                handleReclassifyChange(tx.id, 'category_id', '');
                                                            }}
                                                            disabled={hasValidType}
                                                        >
                                                            <SelectTrigger className="h-9 text-sm" disabled={hasValidType}>
                                                                <SelectValue placeholder="Tipo..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="expense">Gasto</SelectItem>
                                                                <SelectItem value="income">Ingreso</SelectItem>
                                                                <SelectItem value="transfer">Transferencia</SelectItem>
                                                                <SelectItem value="saving">Ahorro</SelectItem>
                                                                <SelectItem value="investment">Inversión</SelectItem>
                                                                <SelectItem value="loan">Préstamo</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Categoría (Category) - 4th */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground block text-left" style={{ fontStyle: 'normal' }}>Categoría</label>
                                                        <Select 
                                                            value={draft.category_id} 
                                                            onValueChange={(value) => handleReclassifyChange(tx.id, 'category_id', value)}
                                                            disabled={!draft.type}
                                                        >
                                                            <SelectTrigger className="h-9 text-sm" disabled={!draft.type}>
                                                                <SelectValue placeholder={draft.type ? "Seleccionar categoría..." : "Selecciona tipo primero"} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {filteredCategories.length > 0 ? (
                                                                    filteredCategories.map(cat => (
                                                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                                    ))
                                                                ) : (
                                                                    <SelectItem value="new" disabled>+ Nueva categoría</SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Método de Pago (Payment Method) - 5th */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground block text-left" style={{ fontStyle: 'normal' }}>Método de Pago</label>
                                                        <Select 
                                                            value={draft.payment_method_id}
                                                            onValueChange={(value) => handleReclassifyChange(tx.id, 'payment_method_id', value)}
                                                        >
                                                            <SelectTrigger className="h-9 text-sm">
                                                                <SelectValue placeholder="Seleccionar método..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {paymentMethods.map(pm => (
                                                                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Monto (Amount) - 6th */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground block text-left" style={{ fontStyle: 'normal' }}>Monto</label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={draft.amount}
                                                            onChange={e => handleReclassifyChange(tx.id, 'amount', e.target.value)}
                                                            placeholder="0.00"
                                                            className="h-9 text-sm"
                                                            disabled={hasValidAmount}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 items-end">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="bg-amber-400/90 text-amber-900 font-bold hover:bg-amber-500 whitespace-nowrap h-9"
                                                        onClick={() => handleReclassifySave(tx)}
                                                        disabled={!draft.category_id || !draft.type || isSaving}
                                                    >
                                                        {isSaving ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-3 w-3 border-2 border-amber-900 border-t-transparent animate-spin rounded-full" />
                                                                Guardando...
                                                            </div>
                                                        ) : (
                                                            'Guardar'
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="whitespace-nowrap h-9"
                                                        onClick={() => deleteTransaction(tx.id)}
                                                        disabled={isSaving}
                                                    >
                                                        Descartar
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <PendingInvoicesPanel />

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/30 p-4 rounded-xl border border-border/50">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Filtros de Tiempo</h2>
                            </div>
                            <Select onValueChange={(v) => updateFilter(v)} value={dateFilter.period}>
                                <SelectTrigger className="w-full sm:w-[200px] bg-background/50 border-border/50 shadow-sm">
                                    <SelectValue placeholder="Seleccionar periodo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todo el tiempo</SelectItem>
                                    <SelectItem value="week">Esta Semana</SelectItem>
                                    <SelectItem value="month">Este Mes</SelectItem>
                                    <SelectItem value="year">Este Año</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <HistoryTab
                            transactions={transactions}
                            paymentMethods={paymentMethods}
                            onDeleteTransaction={deleteTransaction}
                            onUpdateTransaction={updateTransaction}
                            onEditTransaction={handleEdit}
                            categories={categories}
                            highlightOrphaned={highlightOrphaned}
                        />

                        {hasMore && (
                            <div className="flex justify-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={loadMore}
                                    disabled={dataLoading}
                                    className="gap-2 px-8 py-6 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary min-w-[240px]"
                                >
                                    {dataLoading ? (
                                        <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5" />
                                    )}
                                    <span className="font-medium">Cargar más transacciones</span>
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
