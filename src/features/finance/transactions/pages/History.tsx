import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserConfig } from '@/features/finance/hooks/useUserConfig';
import { useSEO } from '@/shared/hooks/useSEO';
import { useFinanceData, CategoryItem } from '../../hooks/useFinanceData';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { AddTransactionDialog } from '@/features/finance/transactions/components/AddTransactionDialog';
import { ImportExcelDialog } from '@/features/finance/transactions/components/ImportExcelDialog';
import { ReviewStagingDialog } from '@/features/finance/transactions/components/ReviewStagingDialog';
import { HistoryTab } from '@/features/finance/transactions/components/HistoryTab';
import { ChevronDown, Receipt, BarChart3, AlertCircle, FilterX } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { Input } from '@/shared/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
    SelectSeparator
} from "@/shared/ui/select";
import { PendingInvoicesPanel } from '@/features/finance/transactions/components/PendingInvoicesPanel';
import { ImportStatusBar } from '@/features/finance/transactions/components/ImportStatusBar';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { usePageBootLoading } from '@/shared/layouts/PageBootContext';
import { useState, useMemo, useEffect } from 'react';
import type { Transaction } from '@/features/finance/hooks/useFinanceData';
import { cn } from '@/core/utils';

export default function HistoryPage() {
    useSEO({
        title: 'Historial',
        description: 'Transaction History - Detailed log of all your income, expenses, and transfers.'
    });
    // ============================================================================
    // ALL HOOKS AT TOP - BEFORE ANY CONDITIONALS
    // ============================================================================
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { config, updateConfig } = useUserConfig(user?.id, user?.email);
    const isPanelVisible = !config.hide_incomplete_alert;
    const {
        transactions,
        paymentMethods,
        loading: dataLoading,
        bootLoading: dataBootLoading,
        deleteTransaction,
        addTransaction,
        addToStaging,
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
        allTransactions,
        totalTransactionsCount,
        pendingInvoices,
        transactionsLoading,
        stagingTransactions,
        clearStaging,
        confirmStagingImport
    } = useFinanceData();

    const { currency } = useFinance();

    // States for Staging Review Dialog
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const [isConfirmingStaging, setIsConfirmingStaging] = useState(false);

    // useState hooks - MUST be before any conditionals
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
    const isBootLoading = authLoading || dataBootLoading;
    const isLoading = authLoading || dataLoading;
    usePageBootLoading(isBootLoading && !transactions.length);

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
        debouncedSearchTerm.trim() || typeFilter || categoryFilter || paymentMethodFilter || statusFilter || dateFilter?.period !== 'all'
    ), [debouncedSearchTerm, typeFilter, categoryFilter, paymentMethodFilter, statusFilter, dateFilter]);

    const transactionsForHistoryMeta = useMemo(() => {
        return allTransactions.length > 0 ? allTransactions : transactions;
    }, [allTransactions, transactions]);

    const yearOptions = useMemo(() => {
        const setYears = new Set<number>();
        transactionsForHistoryMeta.forEach(tx => {
            const y = new Date(tx.date).getFullYear();
            if (!isNaN(y)) { setYears.add(y); }
        });
        // Always include current year
        setYears.add(currentYear);
        return Array.from(setYears).sort((a, b) => b - a).map(String);
    }, [transactionsForHistoryMeta, currentYear]);

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

    const reclassifyTxs = useMemo(() => {
        return transactionsForHistoryMeta.filter(tx => {
            const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out';
            if (isTransfer) { return false; }
            return (!tx.category_id || !tx.payment_method_id) && tx.type !== 'saving' && tx.type !== 'investment';
        });
    }, [transactionsForHistoryMeta]);

    const totalPendingCount = (pendingInvoices?.length || 0) + reclassifyTxs.length;

    // Memoized function to get filtered categories by type
    const getFilteredCategories = useMemo(() => {
        return (typeValue: string) => {
            if (!typeValue) { return categories; }

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
    // ============================================================================
    // CONDITIONAL RETURNS (after all hooks)
    // ============================================================================
    if (!user && !isBootLoading) { return null; }

    return (
        <div className="min-h-screen bg-background/30">
            <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 animate-in fade-in duration-700">
                {isBootLoading && !transactions.length ? (
                    <SkeletonLoader tab="transactions" withLayoutWrapper fullPage={false} />
                ) : (
                    <>
                        <header className="border-b border-border pb-8">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                                        <Receipt className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Historial</h1>
                                        <p className="text-muted-foreground font-medium mt-[-6px] leading-none text-sm">Gestiona y consulta tus transacciones</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end flex-wrap md:mt-1">
                                    <AddTransactionDialog
                                        onAdd={addTransaction}
                                        onAddTransfer={addTransfer}
                                        categories={categories}
                                        paymentMethods={paymentMethods}
                                    />
                                    <ImportExcelDialog paymentMethods={paymentMethods} onImport={addToStaging} />
                                </div>
                            </div>
                        </header>

                        {transactions.length > 0 ? (
                            <>
                                {/* Barra de estado: Mostrar siempre que haya datos cargados */}
                                <ImportStatusBar
                                    uiState={
                                        // La fuente de verdad UX es stagingTransactions.length
                                        (stagingTransactions && stagingTransactions.length > 0)
                                            ? importProgress.status === 'loading'
                                                ? 'applying'
                                                : 'pending-approval'
                                            : 'none'
                                    }
                                    recordCount={stagingTransactions ? stagingTransactions.length : 0}
                                    onReviewAndApprove={() => {
                                        setIsReviewDialogOpen(true);
                                    }}
                                    onDiscard={async () => {
                                        await clearStaging();
                                        await cancelImport();
                                    }}
                                />

                                {/* Reclassification Zone Card MOVED to PendingInvoicesPanel */}
                                <PendingInvoicesPanel />

                                {/* FILTROS UNIFICADOS */}
                                <div className={cn(
                                    "bg-gray-50/50 dark:bg-muted/20 p-4 rounded-xl border border-border flex flex-col gap-8",
                                    filtersApplied && "shadow-md shadow-primary/15 ring-1 ring-primary/10 bg-card"
                                )}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex shrink-0 items-center justify-center p-1">
                                            <BarChart3 className="h-5 w-5 text-primary" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                                                Filtros
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {/* Primera fila: Búsqueda + Tipo/Categoría/Método */}
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
                                                {/* Búsqueda */}
                                                <div className="flex-1">
                                                    <Input
                                                        placeholder="Buscar descripción"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="h-10 w-full bg-background/50 border-zinc-300 focus:border-primary transition-colors"
                                                    />
                                                </div>



                                                {/* Tipo, Categoría, Método */}
                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value === 'all' ? undefined : value)}>
                                                        <SelectTrigger className="w-full sm:w-[140px] bg-background/50 border-zinc-300 h-10 transition-colors justify-center text-center">
                                                            <SelectValue placeholder="Tipo" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all" className="justify-center pl-2">Todos</SelectItem>
                                                            <SelectItem value="income" className="justify-center pl-2">Ingreso</SelectItem>
                                                            <SelectItem value="expense" className="justify-center pl-2">Gasto</SelectItem>
                                                            <SelectItem value="transfer_in" className="justify-center pl-2">Transferencia (entrada)</SelectItem>
                                                            <SelectItem value="transfer_out" className="justify-center pl-2">Transferencia (salida)</SelectItem>
                                                        </SelectContent>
                                                    </Select>

                                                    <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === 'all' ? undefined : value)}>
                                                        <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-zinc-300 h-10 transition-colors justify-center text-center">
                                                            <SelectValue placeholder="Categoría" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all" className="justify-center pl-2">Todas</SelectItem>
                                                            {categories.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                                                                <SelectItem key={c.id} value={c.id} className="justify-center pl-2">{c.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Segunda fila: Mes/Año + Rápidos + Limpiar */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
                                            {/* Grupo fecha: alerta + Mes + Año + botón limpiar (visible en mobile junto a los selects) */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {totalPendingCount > 0 && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={cn(
                                                            "h-10 px-4 font-semibold transition-all w-full sm:w-auto justify-center rounded-xl gap-2",
                                                            isPanelVisible
                                                                ? "text-slate-700 bg-white border-slate-300 shadow-sm hover:bg-slate-100 hover:text-slate-700"
                                                                : "text-orange-700 bg-orange-50 border-orange-200 shadow-sm hover:bg-orange-100 hover:text-orange-700"
                                                        )}
                                                        onClick={() => {
                                                            updateConfig({ hide_incomplete_alert: isPanelVisible });
                                                        }}
                                                    >
                                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                                        <span className="text-sm font-semibold">
                                                            {isPanelVisible ? 'Ocultar aprobación de facturas' : 'Aprobación de facturas'} ({totalPendingCount})
                                                        </span>
                                                    </Button>
                                                )}
                                                {/* Mes */}
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
                                                    <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] bg-background/50 border-zinc-300 h-10 transition-colors [&>span]:flex-1 [&>span]:text-center">
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

                                                {/* Año */}
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
                                                    <SelectTrigger className="flex-1 sm:flex-none sm:w-[155px] bg-background/50 border-zinc-300 h-10 transition-colors [&>span]:flex-1 [&>span]:text-center">
                                                        <SelectValue placeholder="Año" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todos los años</SelectItem>
                                                        {yearOptions.map(y => (
                                                            <SelectItem key={y} value={y}>{y}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {/* Botón limpiar filtros: visible en mobile al lado de los selects de fecha */}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-10 w-10 border border-border/60 sm:hidden shrink-0"
                                                    onClick={clearAllFilters}
                                                    title="Quitar filtros"
                                                >
                                                    <FilterX className="h-4 w-4" />
                                                    <span className="sr-only">Quitar filtros</span>
                                                </Button>
                                            </div>

                                            {/* Botones rápidos + botón limpiar (desktop) */}
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
                                                    className="h-10 px-3 text-xs whitespace-nowrap hover:bg-primary/70 hover:text-white"
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
                                                    className="h-10 px-3 text-xs whitespace-nowrap hover:bg-primary/70 hover:text-white"
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
                                                    className="h-10 px-3 text-xs whitespace-nowrap hover:bg-primary/70 hover:text-white"
                                                >
                                                    Este año
                                                </Button>

                                                {/* Botón limpiar filtros: solo visible en desktop (sm+) */}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-10 w-10 border border-border/60 hidden sm:flex shrink-0"
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
                                    onDeleteTransaction={async (id) => { await deleteTransaction(id); }}
                                    onUpdateTransaction={async (id, updates) => { await updateTransaction(id, updates); }}
                                    onEditTransaction={handleEdit}
                                    categories={categories}
                                    highlightOrphaned={false}
                                    searchTerm={debouncedSearchTerm}
                                    typeFilter={typeFilter}
                                    categoryFilter={categoryFilter}
                                    statusFilter={statusFilter as "attention" | "ok" | undefined}
                                    paymentMethodFilter={paymentMethodFilter}
                                    setPaymentMethodFilter={setPaymentMethodFilter}
                                    setStatusFilter={setStatusFilter}
                                    loading={isBootLoading}
                                />

                                {hasMore && (
                                    <div className="flex justify-center pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={loadMore}
                                            disabled={transactionsLoading}
                                            className="gap-2 px-8 py-6 rounded-xl border-2 border-primary hover:bg-primary/5 transition-all text-primary font-semibold min-w-[240px] shadow-sm"
                                        >
                                            {transactionsLoading ? (
                                                <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5" />
                                            )}
                                            <span className="font-medium">Cargar más transacciones</span>
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-gray-50/50 dark:bg-muted/20 rounded-2xl border border-border shadow-sm transition-all duration-300">
                                <Receipt className="h-12 w-12 text-muted-foreground opacity-20" />
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold">No hay transacciones</h3>
                                    <p className="text-muted-foreground">No hemos encontrado movimientos para este periodo.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <ReviewStagingDialog
                open={isReviewDialogOpen}
                onOpenChange={setIsReviewDialogOpen}
                stagingTransactions={stagingTransactions || []}
                onConfirm={async (selectedIds) => {
                    if (selectedIds.length === 0) return;
                    setIsConfirmingStaging(true);
                    try {
                        await confirmStagingImport(selectedIds);
                        setIsReviewDialogOpen(false);
                    } catch (error) {
                        console.error('Error confirming import:', error);
                    } finally {
                        setIsConfirmingStaging(false);
                    }
                }}
                onCancel={async () => {
                    await clearStaging();
                    setIsReviewDialogOpen(false);
                }}
                isLoading={isConfirmingStaging}
            />
        </div>
    );
}
