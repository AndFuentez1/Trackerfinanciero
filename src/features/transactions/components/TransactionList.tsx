import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMethod, CategoryItem } from '@/hooks/useFinanceData';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  Trash2,
  CreditCard,
  AlertCircle,
  Search,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { cn, getCurrencySymbol } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Filter, ListFilter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ICON_MAP removed as part of color-only system transition

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<{ error?: unknown } | void>;
  onEdit?: (transaction: Transaction) => void;
  paymentMethods: PaymentMethod[];
  categories: CategoryItem[];
  showOnlyRecent?: boolean;
  highlightOrphaned?: boolean;
  statusFilter?: 'attention' | 'ok';
  setStatusFilter: (value: 'attention' | 'ok' | undefined) => void;
  // New props for filters
  typeFilter?: string;
  setTypeFilter?: (value: string | undefined) => void;
  categoryFilter?: string;
  setCategoryFilter?: (value: string | undefined) => void;
  monthFilter?: string;
  setMonthFilter?: (value: string) => void;
  yearFilter?: string;
  setYearFilter?: (value: string) => void;
  yearOptions?: string[];
  currency?: string;
}

const typeLabels = {
  income: 'Ingreso',
  expense: 'Gasto',
  saving: 'Ahorro',
  savings: 'Ahorro',
  investment: 'Inversión',
  loan: 'Préstamo',
  transfer: 'Otros',
  transfer_in: 'Otros',
  transfer_out: 'Otros',
};

const typeStyles = {
  income: 'text-emerald-600 bg-emerald-50',
  expense: 'text-rose-600 bg-rose-50',
  saving: 'text-blue-600 bg-blue-50',
  savings: 'text-blue-600 bg-blue-50',
  investment: 'text-purple-600 bg-purple-50',
  loan: 'text-amber-600 bg-amber-50',
  transfer: 'text-slate-700 bg-slate-100',
  transfer_in: 'text-slate-700 bg-slate-100',
  transfer_out: 'text-slate-700 bg-slate-100',
};

export function TransactionList({
  transactions,
  onDelete,
  onUpdate,
  onEdit,
  paymentMethods,
  categories,
  showOnlyRecent = false,
  highlightOrphaned = false,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  monthFilter,
  setMonthFilter,
  yearFilter,
  setYearFilter,
  yearOptions = [],
  currency = 'COP',
}: TransactionListProps) {

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const decimalPlaces = useDecimalPlaces();
  const { formatCurrencySmall } = useFormatCurrency();

  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'category' | 'amount' | 'status' | null;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    description: string;
    amount: number;
    category_id: string | null;
    payment_method_id: string | null;
    date: string; // ISO string
  } | null>(null);

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDraft({
      description: t.description,
      amount: t.amount,
      category_id: t.category_id || null,
      payment_method_id: t.payment_method_id || null,
      date: t.date,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const toInputDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const saveEdit = async (t: Transaction) => {
    if (!onUpdate || !draft || editingId !== t.id) return;
    const updates: Partial<Omit<Transaction, 'id'>> = {
      description: draft.description,
      amount: Number(draft.amount),
      category_id: draft.category_id || null,
      payment_method_id: draft.payment_method_id || null,
      date: new Date(draft.date).toISOString(),
    } as any;

    // Also send category name if category_id selected (helps parent sync immediately)
    const cat = categories.find(c => c.id === draft.category_id || '');
    if (cat) {
      (updates as any).category = cat.name;
    }

    const res = await onUpdate(t.id, updates);
    const hadError = typeof res === 'object' && res && 'error' in res && (res as any).error;
    if (!hadError) {
      setEditingId(null);
      setDraft(null);
    }
  };

  const handleSort = (key: 'date' | 'category' | 'amount' | 'status') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: 'date' | 'category' | 'amount' | 'status') => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-3 w-3" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = months[d.getMonth()] || '';
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const getPaymentMethodName = (pmId: string | null | undefined) => {
    if (!pmId) return null;
    const pm = paymentMethods.find(p => p.id === pmId);
    return pm?.name || null;
  };

  const getCategoryOptionsForType = (type: Transaction['type']) => {
    if (type === 'transfer_in' || type === 'transfer_out') {
      return categories.filter(c => (c.type as string) === 'transfer' || c.type === 'transfer_out' || c.type === 'transfer_in');
    }
    return categories.filter(c => c.type === type);
  };

  const getCategoryDisplay = (t: Transaction) => {
    if (t.type === 'transfer_in' || t.type === 'transfer_out') {
      return { name: 'Transferencia', color: '#6b7280' };
    }

    const categoryItem = categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
    return {
      name: categoryItem?.name || t.category || 'S/C',
      color: categoryItem?.color || '#3b82f6'
    };
  };

  const isNegativeType = (type: Transaction['type']) => type === 'expense' || type === 'transfer_out';

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const isUndisbursedLoan = (!t.payment_method_id) &&
        (t.description.toLowerCase().includes('préstamo') ||
          t.description.toLowerCase().includes('sin desembolso'));
      return !isUndisbursedLoan;
    });
  }, [transactions]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'date') {
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
      } else if (sortConfig.key === 'amount') {
        aValue = a.amount;
        bValue = b.amount;
      } else if (sortConfig.key === 'category') {
        const aCat = categories.find(c => c.id === a.category_id)?.name || a.category || '';
        const bCat = categories.find(c => c.id === b.category_id)?.name || b.category || '';
        aValue = aCat.toLowerCase();
        bValue = bCat.toLowerCase();
      } else if (sortConfig.key === 'status') {
        const aIsOrphan = !a.category && !a.category_id || !a.payment_method_id;
        const bIsOrphan = !b.category && !b.category_id || !b.payment_method_id;
        aValue = aIsOrphan ? 1 : 0; // Atención first
        bValue = bIsOrphan ? 1 : 0;
      }

      if (sortConfig.key) {
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      // Default sort (if no key)
      const aIsOrphan = !a.category || !a.payment_method_id;
      const bIsOrphan = !b.category || !b.payment_method_id;

      if (aIsOrphan && !bIsOrphan) return -1;
      if (!aIsOrphan && bIsOrphan) return 1;

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredTransactions, sortConfig, categories]);

  const displayTransactions = showOnlyRecent ? sortedTransactions.slice(0, 10) : sortedTransactions;

  if (displayTransactions.length === 0) {
    return (
      <div
        className="rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 transition-all shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px dashed var(--color-border)',
          color: 'var(--text-muted)'
        }}
      >
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Search className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No hay resultados</h3>
        <p className="text-muted-foreground text-sm max-w-[200px]">
          No encontramos transacciones que coincidan con tu búsqueda.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden shadow-md transition-all duration-300">
        <div className="w-full overflow-x-auto">
          <table className="premium-table">
            <thead className="bg-muted/30">
              <tr>

                <th
                  className="w-[120px] p-2"
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="relative flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide px-8">Fecha</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 h-6 w-6 hover:bg-muted/50"
                        >
                          <ListFilter className={cn("h-3 w-3", (monthFilter || yearFilter) ? "text-primary" : "")} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[180px]">
                        <DropdownMenuLabel>Ordenar</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleSort('date')}>
                          {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'Ascendente (Antiguo)' : 'Ascendente'}
                          {sortConfig.key === 'date' && sortConfig.direction === 'asc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('date')}>
                          {sortConfig.key === 'date' && sortConfig.direction === 'desc' ? 'Descendente (Reciente)' : 'Descendente'}
                          {sortConfig.key === 'date' && sortConfig.direction === 'desc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filtros</DropdownMenuLabel>

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Año: {yearFilter || 'Todos'}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={yearFilter} onValueChange={setYearFilter}>
                              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                              {yearOptions.map(year => (
                                <DropdownMenuRadioItem key={year} value={year}>{year}</DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Mes: {monthFilter && monthFilter !== 'all' ? monthNames[parseInt(monthFilter)] : 'Todos'}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto">
                            <DropdownMenuRadioGroup value={monthFilter || 'all'} onValueChange={setMonthFilter}>
                              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                              {monthNames.map((month, index) => (
                                <DropdownMenuRadioItem key={index} value={index.toString()}>{month}</DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="w-[180px] p-2" style={{ fontStyle: 'normal' }}>
                  <div className="flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide">Descripción</span>
                  </div>
                </th>
                <th className="w-[100px] p-2" style={{ fontStyle: 'normal' }}>
                  <div className="relative flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide px-6">Tipo</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 h-6 w-6 hover:bg-muted/50"
                        >
                          <ListFilter className={cn("h-3 w-3", typeFilter ? "text-primary" : "")} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[150px]">
                        <DropdownMenuLabel>Ordenar</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'category', direction: 'asc' })}>
                          Ascendente {sortConfig.key === 'category' && sortConfig.direction === 'asc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'category', direction: 'desc' })}>
                          Descendente {sortConfig.key === 'category' && sortConfig.direction === 'desc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filtrar</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter && setTypeFilter(v === 'all' ? undefined : v)}>
                          <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="income">Ingresos</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="expense">Gastos</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="transfer">Transferencias</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th
                  className="w-[170px] p-2"
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="relative flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide px-8">Categoría</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 h-6 w-6 hover:bg-muted/50"
                        >
                          <ListFilter className={cn("h-3 w-3", categoryFilter ? "text-primary" : "")} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>Ordenar</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleSort('category')}>
                          Ascendente {sortConfig.key === 'category' && sortConfig.direction === 'asc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('category')}>
                          Descendente {sortConfig.key === 'category' && sortConfig.direction === 'desc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filtrar</DropdownMenuLabel>
                        <ScrollArea className="h-[200px]">
                          <DropdownMenuRadioGroup value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter && setCategoryFilter(v === 'all' ? undefined : v)}>
                            <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
                            {categories.map(cat => (
                              <DropdownMenuRadioItem key={cat.id} value={cat.id}>{cat.name}</DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="w-[140px] p-2" style={{ fontStyle: 'normal' }}>
                  <div className="flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide">Método</span>
                  </div>
                </th>
                <th
                  className="w-[120px] p-2"
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="relative flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide px-6">Monto</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 h-6 w-6 hover:bg-transparent"
                      onClick={() => handleSort('amount')}
                    >
                      {getSortIcon('amount')}
                    </Button>
                  </div>
                </th>
                <th className="w-[70px] p-2" style={{ fontStyle: 'normal' }}>
                  <div className="relative flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide px-6">Estado</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 h-6 w-6 hover:bg-muted/50"
                        >
                          <ListFilter className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[150px]">
                        <DropdownMenuLabel>Ordenar</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'status', direction: 'asc' })}>
                          Ascendente {sortConfig.key === 'status' && sortConfig.direction === 'asc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({ key: 'status', direction: 'desc' })}>
                          Descendente {sortConfig.key === 'status' && sortConfig.direction === 'desc' && <Check className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filtrar</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                          checked={!statusFilter || statusFilter === 'all' as any}
                          onCheckedChange={() => setStatusFilter(undefined)}
                        >
                          Todos
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={statusFilter === 'attention'}
                          onCheckedChange={() => setStatusFilter('attention')}
                        >
                          Atención
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={statusFilter === 'ok'}
                          onCheckedChange={() => setStatusFilter('ok')}
                        >
                          OK
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="w-[100px] p-2" style={{ fontStyle: 'normal' }}>
                  <div className="flex items-center justify-center w-full">
                    <span className="font-semibold text-xs uppercase tracking-wide">Acciones</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((transaction, index) => {
                const pmName = getPaymentMethodName(transaction.payment_method_id);
                const categoryDisplay = getCategoryDisplay(transaction);
                const needsCategory = !(transaction.type === 'transfer_in' || transaction.type === 'transfer_out');
                const isOrphan = (needsCategory && (!transaction.category && !transaction.category_id)) || !transaction.payment_method_id;

                const isEditing = editingId === transaction.id;
                return (
                  <tr
                    key={transaction.id}
                    className={cn(
                      'transition-all duration-200 group hover:bg-muted/30',
                      isEditing && 'bg-primary/5',
                      isOrphan && 'bg-destructive/5',
                      highlightOrphaned && isOrphan && 'border-l-4 border-l-destructive',
                      'animate-fade-in'
                    )}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    {/* Date */}
                    <td style={{ fontStyle: 'normal' }} className="text-center">
                      {isEditing ? (
                        <input
                          type="date"
                          className="h-8 px-2 text-xs bg-background/50 border border-border rounded-xl w-full mx-auto"
                          value={toInputDate(draft?.date || transaction.date)}
                          onChange={(e) => setDraft(d => d ? { ...d, date: e.target.value } : d)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap" style={{ fontStyle: 'normal' }}>
                          {formatDate(transaction.date)}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="max-w-[180px] text-center" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <Input
                          value={draft?.description ?? transaction.description}
                          onChange={(e) => setDraft(d => d ? { ...d, description: e.target.value } : d)}
                          className="h-8 text-sm w-full text-center mx-auto border border-border rounded-xl"
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[13px] text-foreground font-medium line-clamp-2 leading-tight text-center" style={{ fontStyle: 'normal' }}>
                            {transaction.description}
                          </span>
                          {isOrphan && (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded whitespace-nowrap" style={{ fontStyle: 'normal' }}>
                              <AlertCircle className="h-3 w-3" />
                              Atención
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td style={{ fontStyle: 'normal' }} className="text-center">
                      <span className={cn(
                        'inline-flex items-center justify-center h-8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xl',
                        typeStyles[transaction.type]
                      )} style={{ fontStyle: 'normal' }}>
                        {typeLabels[transaction.type]}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="max-w-[170px] text-center" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <div className="mx-auto w-full">
                          <Select
                            onValueChange={(v) => setDraft(d => d ? { ...d, category_id: v } : d)}
                            value={draft?.category_id || ''}
                          >
                            <SelectTrigger className="h-8 text-[9px] uppercase font-bold bg-background/50 hover:bg-background justify-center text-center border border-border rounded-xl relative [&>svg]:absolute [&>svg]:right-2">
                              <SelectValue placeholder="Cat." />
                            </SelectTrigger>
                            <SelectContent>
                              {getCategoryOptionsForType(transaction.type).map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : onUpdate && (!transaction.category && !transaction.category_id) ? (
                        <div className="mx-auto w-full">
                          <Select
                            onValueChange={(v) => {
                              const cat = categories.find(c => c.id === v);
                              onUpdate(transaction.id, {
                                category_id: v,
                                category: cat?.name || ''
                              });
                            }}
                            value=""
                          >
                            <SelectTrigger className="h-8 text-[9px] uppercase font-bold border-destructive/30 bg-background/50 hover:bg-background justify-center text-center rounded-xl relative [&>svg]:absolute [&>svg]:right-2">
                              <SelectValue placeholder="Cat." />
                            </SelectTrigger>
                            <SelectContent>
                              {getCategoryOptionsForType(transaction.type).map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center max-w-[170px] mx-auto">
                          <span
                            className="inline-flex items-center justify-center w-full h-8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider line-clamp-2 text-center leading-tight rounded-xl"
                            style={{
                              backgroundColor: (categoryDisplay.color || '#3b82f6') + '20',
                              color: categoryDisplay.color || '#3b82f6',
                              fontStyle: 'normal'
                            }}
                          >
                            {categoryDisplay.name}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="min-w-[140px] text-center">
                      {isEditing ? (
                        <div className="mx-auto w-full max-w-[130px]">
                          <Select
                            onValueChange={(v) => setDraft(d => d ? { ...d, payment_method_id: v } : d)}
                            value={draft?.payment_method_id || ''}
                          >
                            <SelectTrigger className="h-8 text-[10px] bg-background/50 hover:bg-background justify-center text-center border border-border rounded-xl relative [&>svg]:absolute [&>svg]:right-2">
                              <SelectValue placeholder="Método" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map(pm => (
                                <SelectItem key={pm.id} value={pm.id} className="text-xs">{pm.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : pmName ? (
                        <div className="flex items-center justify-center max-w-[120px] mx-auto">
                          <span

                            style={{
                              backgroundColor: (() => {
                                const pm = paymentMethods.find(p => p.id === transaction.payment_method_id);
                                return (pm?.color || '#3b82f6') + '20';
                              })(),
                              color: (() => {
                                const pm = paymentMethods.find(p => p.id === transaction.payment_method_id);
                                return pm?.color || '#3b82f6';
                              })(),
                              fontStyle: 'normal'
                            }}
                            className="inline-flex items-center justify-center w-full h-8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider line-clamp-2 text-center leading-tight rounded-xl"
                          >
                            {(() => {
                              const pm = paymentMethods.find(p => p.id === transaction.payment_method_id);
                              let suffix = '';
                              if (pm) {
                                switch (pm.type) {
                                  case 'debit': suffix = ' (D)'; break;
                                  case 'credit': suffix = ' (C)'; break;
                                  case 'cash': suffix = ' (E)'; break;
                                  case 'savings': suffix = ' (A)'; break;
                                  default: suffix = '';
                                }
                              }
                              return pmName + suffix;
                            })()}
                          </span>
                        </div>
                      ) : (
                        onUpdate ? (
                          <div className="mx-auto w-full max-w-[130px]">
                            <Select
                              onValueChange={(v) => onUpdate(transaction.id, { payment_method_id: v })}
                              value=""
                            >
                              <SelectTrigger className="h-8 text-[10px] bg-background/50 hover:bg-background justify-center text-center border border-border rounded-xl relative [&>svg]:absolute [&>svg]:right-2">
                                <SelectValue placeholder="Método" />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map(pm => (
                                  <SelectItem key={pm.id} value={pm.id} className="text-xs">{pm.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase text-center" style={{ fontStyle: 'normal', minWidth: '100px', display: 'inline-block' }}>Sin desembolso</span>
                        )
                      )}
                    </td>

                    {/* Amount */}
                    <td className="whitespace-nowrap min-w-[120px] text-center" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <Input
                          type="number"
                          className="h-8 text-sm w-full mx-auto text-center border border-border rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={draft?.amount ?? transaction.amount}
                          onChange={(e) => setDraft(d => d ? { ...d, amount: Number(e.target.value) } : d)}
                        />
                      ) : (
                        <span className="text-sm font-bold tabular-nums whitespace-nowrap flex items-center justify-center gap-1 text-foreground">
                          <span className={isNegativeType(transaction.type) ? 'text-red-500' : 'text-green-600'} style={{ fontWeight: 700 }}>
                            {isNegativeType(transaction.type) ? '-' : '+'}
                          </span>
                          {(() => {
                            // Usar el símbolo correcto según currency (import directo)
                            const currCode = typeof currency === 'string' ? currency : 'COP';
                            const symbol = getCurrencySymbol(currCode);
                            const decimals = decimalPlaces;
                            const formatted = new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: currCode,
                              minimumFractionDigits: decimals,
                              maximumFractionDigits: decimals,
                              currencyDisplay: 'code',
                            }).format(transaction.amount).replace(currCode, symbol);
                            if (decimals === 0) {
                              return (
                                <span className="inline-flex items-baseline gap-1">
                                  <span style={{ fontSize: '80%' }}>{symbol}</span>
                                  <span>{formatted.replace(symbol, '').trim()}</span>
                                </span>
                              );
                            }
                            const parts = formatted.split(',');
                            if (parts.length === 1) return formatted;
                            const integerPart = parts[0].replace(symbol, '').trim();
                            const decimalPart = parts[1];
                            return (
                              <span className="inline-flex items-baseline gap-[2px]">
                                <span style={{ fontSize: '80%' }}>{symbol}</span>
                                <span>
                                  {integerPart}
                                  <span style={{ fontSize: '80%', opacity: 0.8 }}>,{decimalPart}</span>
                                </span>
                              </span>
                            );
                          })()}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="text-center" style={{ fontStyle: 'normal' }}>
                      <span className={cn(
                        'inline-flex items-center justify-center w-[70px] h-8 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xl',
                        isOrphan ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800'
                      )} style={{ fontStyle: 'normal' }}>
                        {isOrphan ? 'Atención' : 'OK'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-xl border" style={{ border: '1px solid hsl(var(--color-border))' }}
                              onClick={() => saveEdit(transaction)}
                              title="Guardar cambios"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-xl border" style={{ border: '1px solid hsl(var(--color-border))' }}
                              onClick={cancelEdit}
                              title="Cancelar edición"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-xl border border-border"
                              onClick={() => startEdit(transaction)}
                              title="Editar transacción"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-xl border border-border"
                              onClick={() => handleDeleteClick(transaction.id)}
                              title="Eliminar transacción"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div >

      {/* Mobile Card List View */}
      < div className="md:hidden space-y-3" >
        {
          displayTransactions.map((transaction) => {
            const pmName = getPaymentMethodName(transaction.payment_method_id);
            const categoryDisplay = getCategoryDisplay(transaction);
            const needsCategory = !(transaction.type === 'transfer_in' || transaction.type === 'transfer_out');
            const isOrphan = (needsCategory && (!transaction.category && !transaction.category_id)) || !transaction.payment_method_id;

            return (
              <div
                key={transaction.id}
                className={cn(
                  "bg-card rounded-xl border p-4 shadow-sm",
                  isOrphan ? "border-destructive/50 bg-destructive/5" : "border-border",
                  transaction.type === 'expense' ? "border-l-4 border-l-rose-500" : "border-l-4 border-l-emerald-500"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: (categoryDisplay.color || '#3b82f6') + '20',
                          color: categoryDisplay.color || '#3b82f6',
                        }}
                      >
                        {categoryDisplay.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm line-clamp-1">{transaction.description}</h4>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "block text-lg font-bold",
                      isNegativeType(transaction.type) ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {isNegativeType(transaction.type) ? '-' : '+'}
                      {formatCurrencySmall(transaction.amount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    <span>{pmName || 'Sin método'}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-sm border-primary/80"
                      onClick={() => startEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-sm border-primary/80"

                      onClick={() => handleDeleteClick(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        }

      </div>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la transacción permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
