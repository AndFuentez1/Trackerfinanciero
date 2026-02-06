import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceData } from '@/hooks/useFinanceData';
import { AddTransactionDialog } from '@/features/transactions/components/AddTransactionDialog';
import { AddPaymentMethodDialog } from '@/features/payment-methods/components/AddPaymentMethodDialog';
import { ImportExcelDialog } from '@/features/transactions/components/ImportExcelDialog';
import { ExportExcelButton } from '@/features/transactions/components/ExportExcelButton';
import { HistoryTab } from '@/features/transactions/components/HistoryTab';
import { Wallet, LogOut, BarChart3, ChevronDown, AlertCircle, Plus, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PendingInvoicesPanel } from '@/features/transactions/components/PendingInvoicesPanel';
import { ImportStatusBar } from '@/features/transactions/components/ImportStatusBar';
import { SkeletonLoader } from '@/components/common/skeletons/SkeletonLoader';
import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '@/hooks/useFinanceData';
import { cn } from '@/lib/utils';

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
        addCategory,
        addPaymentMethod,
        addTransfer,
        rangeTransactions,
        allTransactions, // Use full dataset for filter options
        totalTransactionsCount,
    } = useFinanceData();

    // useState hooks - MUST be before any conditionals
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [reclassifyDrafts, setReclassifyDrafts] = useState<Record<string, any>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [creatingPMFor, setCreatingPMFor] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // Debounced state for filtering
    const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | undefined>(undefined);
    const [monthFilter, setMonthFilter] = useState<string>('all');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [pendingTx, setPendingTx] = useState<Transaction | null>(null);

    // Computed values (not hooks, safe to compute here)
    const isLoading = authLoading || dataLoading;

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Get current date values FIRST
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const filtersApplied = useMemo(() => Boolean(
        debouncedSearchTerm.trim() || typeFilter || categoryFilter || paymentMethodFilter || statusFilter || dateFilter.period !== 'all'
    ), [debouncedSearchTerm, typeFilter, categoryFilter, paymentMethodFilter, statusFilter, dateFilter]);

    const yearOptions = useMemo(() => {
        const setYears = new Set<number>();
        // Use allTransactions to ensure years don't disappear when filtering
        (allTransactions || []).forEach(tx => {
            const y = new Date(tx.date).getFullYear();
            if (!isNaN(y)) setYears.add(y);
        });
        // Always include current year
        setYears.add(currentYear);
        return Array.from(setYears).sort((a, b) => b - a).map(String);
    }, [allTransactions, currentYear]);

    const monthOptions = useMemo(() => {
        const baseMonths = [
            { value: 'all', label: 'Todo el año' },
            { value: '1', label: 'Enero' },
            { value: '2', label: 'Febrero' },
            { value: '3', label: 'Marzo' },
            { value: '4', label: 'Abril' },
            { value: '5', label: 'Mayo' },
            { value: '6', label: 'Junio' },
            { value: '7', label: 'Julio' },
            { value: '8', label: 'Agosto' },
            { value: '9', label: 'Septiembre' },
            { value: '10', label: 'Octubre' },
            { value: '11', label: 'Noviembre' },
            { value: '12', label: 'Diciembre' },
        ];

        // If year filter is "all", show all 12 months
        if (yearFilter === 'all') {
            return baseMonths;
        }

        // If current year is selected, limit to current month
        if (yearFilter === currentYear.toString()) {
            return baseMonths.slice(0, currentMonth + 1);
        }
        return baseMonths;
    }, [yearFilter, currentYear, currentMonth]);

    // Ensure monthFilter is valid when year changes
    useEffect(() => {
        const validValues = monthOptions.map(m => m.value);
        if (!validValues.includes(monthFilter)) {
            setMonthFilter('all');
        }
    }, [monthOptions, monthFilter]);

    const toDateString = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const clearAllFilters = () => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setTypeFilter(undefined);
        setCategoryFilter(undefined);
        setPaymentMethodFilter(undefined);
        setStatusFilter(undefined);
        setMonthFilter('all');
        setYearFilter('all');
        updateFilter('all');
    };

    // Memoized values - transactions needing reclassification
    // CRITICAL: Exclude savings and investment types (managed in Savings tab only)
    const reclassifyTxs = useMemo(() =>
        transactions.filter(tx => {
            const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
            if (isTransfer) return false; // Transfers should not require reclasificación

            return !tx.category_id &&
                tx.type !== 'saving' &&
                tx.type !== 'investment';
        }),
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
        if (!draft || !draft.category_name || !draft.type) return;

        setSavingId(tx.id);

        try {
            // Find or create category
            let categoryId = null;
            const existingCategory = categories.find(c => c.name === draft.category_name);
            if (existingCategory) {
                categoryId = existingCategory.id;
            } else if (draft.category_name) {
                // Create category
                const result = await addCategory({ name: draft.category_name, type: draft.type });
                if ('data' in result && result.data && 'id' in result.data) {
                    categoryId = result.data.id;
                }
            }

            // Find or create payment method
            let paymentMethodId = null;
            if (draft.payment_method_name) {
                const existingPaymentMethod = paymentMethods.find(pm => pm.name === draft.payment_method_name);
                if (existingPaymentMethod) {
                    paymentMethodId = existingPaymentMethod.id;
                } else {
                    // Instead of creating directly, open dialog
                    setPendingTx(tx);
                    setCreatingPMFor(tx.id);
                    return;
                }
            }

            // Update with all necessary fields - setting category_id removes from reclassification zone
            await updateTransaction(tx.id, {
                category_id: categoryId,
                type: draft.type,
                description: draft.description,
                amount: Number(draft.amount),
                date: draft.date,
                payment_method_id: paymentMethodId,
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
    // Loading state (High Fidelity Skeleton Reveal)
    if (isLoading) {
        return <SkeletonLoader tab="transactions" fullPage={false} withLayoutWrapper />;
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background/30">
            <main className="container max-w-6xl mx-auto px-4 py-8">
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 border-b border-border pb-6">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">Historial</h1>
                            <p className="text-muted-foreground font-medium">Gestiona y consulta tus transacciones</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end flex-wrap">
                        <AddTransactionDialog
                            onAdd={addTransaction}
                            onAddTransfer={addTransfer}
                            categories={categories}
                            paymentMethods={paymentMethods}
                        />
                        <ExportExcelButton transactions={transactions} paymentMethods={paymentMethods} />
                        <ImportExcelDialog paymentMethods={paymentMethods} onImport={addTransactionsBulk} />
                    </div>
                </header>
                {isLoading && !transactions.length ? (
                    <SkeletonLoader tab="transactions" withLayoutWrapper={false} fullPage={false} />
                ) : (
                    <div className="flex flex-col gap-6">
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
                                <div className="flex flex-col gap-4">
                                    {reclassifyTxs.map(tx => {
                                        const initialDraft = {
                                            description: tx.description || '',
                                            amount: tx.amount ?? '',
                                            date: tx.date || '',
                                            category_name: tx.category || '',
                                            type: tx.type || 'expense',
                                            payment_method_name: (tx as any).payment_method || '',
                                        };
                                        const draft = reclassifyDrafts[tx.id] ? { ...initialDraft, ...reclassifyDrafts[tx.id] } : initialDraft;

                                        const isSaving = savingId === tx.id;

                                        // Detectar qué campos ya tienen datos válidos (deben bloquearse)
                                        const hasValidDate = tx.date && tx.date.trim() !== '';
                                        const hasValidDescription = tx.description && tx.description.trim() !== '';
                                        const hasValidType = false; // Permitir editar type siempre
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
                                                        <Input
                                                            value={draft.category_name}
                                                            onChange={e => handleReclassifyChange(tx.id, 'category_name', e.target.value)}
                                                            placeholder="Nombre de la categoría"
                                                            className="h-9 text-sm"
                                                        />
                                                    </div>

                                                    {/* Método de Pago (Payment Method) - 5th */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-muted-foreground block text-left" style={{ fontStyle: 'normal' }}>Método de Pago</label>
                                                        <Input
                                                            value={draft.payment_method_name}
                                                            onChange={e => handleReclassifyChange(tx.id, 'payment_method_name', e.target.value)}
                                                            placeholder="Nombre del método de pago"
                                                            className="h-9 text-sm"
                                                        />
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
                                                        className="bg-amber-400/90 text-amber-900 font-bold hover:bg-amber-500 whitespace-nowrap h-9 border border-primary"
                                                        onClick={() => handleReclassifySave(tx)}
                                                        disabled={!draft.category_name || !draft.type || isSaving}
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

                        {/* FILTROS UNIFICADOS */}
                        <div className={cn(
                            "bg-card/30 p-4 rounded-xl border border-border/50",
                            filtersApplied && "shadow-md shadow-primary/15 ring-1 ring-primary/10 bg-card"
                        )}>
                            <div className="flex items-center gap-2 mb-3">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Filtros</h2>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Primera fila: Búsqueda + Tipo/Categoría/Método */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
                                    {/* Búsqueda */}
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Buscar descripción"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-10 w-full bg-background/50 border-gray-100"
                                        />
                                    </div>

                                    {/* Tipo, Categoría, Método */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value === 'all' ? undefined : value)}>
                                            <SelectTrigger className="w-full sm:w-[140px] bg-background/50 border-gray-100 h-10">
                                                <SelectValue placeholder="Tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="income">Ingreso</SelectItem>
                                                <SelectItem value="expense">Gasto</SelectItem>
                                                <SelectItem value="transfer_in">Transferencia (entrada)</SelectItem>
                                                <SelectItem value="transfer_out">Transferencia (salida)</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === 'all' ? undefined : value)}>
                                            <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-gray-100 h-10">
                                                <SelectValue placeholder="Categoría" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas</SelectItem>
                                                {categories.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={paymentMethodFilter} onValueChange={(value) => setPaymentMethodFilter(value === 'all' ? undefined : value)}>
                                            <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-gray-100 h-10">
                                                <SelectValue placeholder="Método de pago" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                {paymentMethods.map(pm => (
                                                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Segunda fila: Mes/Año + Rápidos + Limpiar */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <Select value={monthFilter} onValueChange={(value) => {
                                            setMonthFilter(value);
                                            const year = yearFilter === 'all' ? new Date().getFullYear().toString() : yearFilter;
                                            if (value === 'all' && yearFilter === 'all') {
                                                updateFilter('all');
                                            } else {
                                                const monthNum = value === 'all' ? null : Number(value);
                                                const yearNum = Number(year);
                                                let from: string, to: string;
                                                if (monthNum) {
                                                    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
                                                    from = toDateString(yearNum, monthNum, 1);
                                                    to = toDateString(yearNum, monthNum, daysInMonth);
                                                } else {
                                                    from = toDateString(yearNum, 1, 1);
                                                    to = toDateString(yearNum, 12, 31);
                                                }
                                                updateFilter('custom', from, to);
                                            }
                                        }}>
                                            <SelectTrigger className="w-full sm:w-[140px] bg-background/50 border-gray-100 h-10">
                                                <SelectValue placeholder="Mes" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {monthOptions.map(m => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        {m.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={yearFilter} onValueChange={(value) => {
                                            setYearFilter(value);
                                            const month = monthFilter;
                                            if (month === 'all' && value === 'all') {
                                                updateFilter('all');
                                            } else {
                                                const monthNum = month === 'all' ? null : Number(month);
                                                const yearNum = value === 'all' ? new Date().getFullYear() : Number(value);
                                                let from: string, to: string;
                                                if (monthNum) {
                                                    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
                                                    from = toDateString(yearNum, monthNum, 1);
                                                    to = toDateString(yearNum, monthNum, daysInMonth);
                                                } else {
                                                    from = toDateString(yearNum, 1, 1);
                                                    to = toDateString(yearNum, 12, 31);
                                                }
                                                updateFilter('custom', from, to);
                                            }
                                        }}>
                                            <SelectTrigger className="w-full sm:w-[140px] bg-background/50 border-gray-100 h-10">
                                                <SelectValue placeholder="Año" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos los años</SelectItem>
                                                {yearOptions.map(y => (
                                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 justify-end w-full sm:w-auto">
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    const now = new Date();
                                                    const weekStart = new Date(now);
                                                    weekStart.setDate(now.getDate() - 7);
                                                    updateFilter('custom', toDateString(weekStart.getFullYear(), weekStart.getMonth() + 1, weekStart.getDate()), toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate()));
                                                }}
                                                className="h-10 px-3 text-xs whitespace-nowrap"
                                            >
                                                Esta semana
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    const now = new Date();
                                                    updateFilter('custom', toDateString(now.getFullYear(), now.getMonth() + 1, 1), toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate()));
                                                }}
                                                className="h-10 px-3 text-xs whitespace-nowrap"
                                            >
                                                Este mes
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    const now = new Date();
                                                    const yearStart = toDateString(now.getFullYear(), 1, 1);
                                                    const today = toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
                                                    updateFilter('custom', yearStart, today);
                                                }}
                                                className="h-10 px-3 text-xs whitespace-nowrap"
                                            >
                                                Este año
                                            </Button>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 border border-border/60"
                                            onClick={clearAllFilters}
                                            title="Quitar filtros"
                                        >
                                            <FilterX className="h-4 w-4" />
                                            <span className="sr-only">Quitar filtros</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <HistoryTab
                            transactions={transactions}
                            allTransactions={rangeTransactions}
                            totalCount={totalTransactionsCount}
                            paymentMethods={paymentMethods}
                            onDeleteTransaction={deleteTransaction}
                            onUpdateTransaction={updateTransaction}
                            onEditTransaction={handleEdit}
                            categories={categories}
                            highlightOrphaned={highlightOrphaned}
                            searchTerm={debouncedSearchTerm}
                            typeFilter={typeFilter}
                            categoryFilter={categoryFilter}
                            statusFilter={statusFilter as "attention" | "ok" | undefined}
                            paymentMethodFilter={paymentMethodFilter}
                            setStatusFilter={setStatusFilter}
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
