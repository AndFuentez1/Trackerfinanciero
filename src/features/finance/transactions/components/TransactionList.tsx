import React, { useState, useMemo, useCallback } from 'react';
import type { Transaction, PaymentMethod, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { TransactionRow } from './TransactionRow';
import { TransactionCard } from './TransactionCard';
import { typeLabels, typeStyles } from './constants';
import { PulseBlock, CardSkeleton } from '@/shared/components/skeletons/SkeletonLoader';

type TransactionDraft = {
  description: string;
  amount: number;
  category_id: string | null;
  payment_method_id: string | null;
  date: string;
};

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
  currency?: string;
  loading?: boolean;
}

export { typeLabels, typeStyles };

export function TransactionList({
  transactions,
  onDelete,
  onUpdate,
  onEdit, // Although passed, it's mostly handled by onStartEdit locally for inline editing
  paymentMethods,
  categories,
  showOnlyRecent = false,
  highlightOrphaned = false,
  statusFilter,
  setStatusFilter,
  currency = 'COP',
  loading = false,
}: TransactionListProps) {
  // Hooks
  const decimalPlaces = useDecimalPlaces();
  const { formatCurrencySmall } = useFormatCurrency();

  // State
  const [sortConfig, setSortConfig] = useState<{
    key: 'date' | 'category' | 'amount' | 'status' | null;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransactionDraft | null>(null);

  // Callbacks
  const startEdit = useCallback((t: Transaction) => {
    setEditingId(t.id);
    setDraft({
      description: t.description,
      amount: t.amount,
      category_id: t.category_id || null,
      payment_method_id: t.payment_method_id || null,
      date: t.date,
    });
    if (onEdit) {onEdit(t);}
  }, [onEdit]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(null);
  }, []);

  const saveEdit = useCallback(async (t: Transaction) => {
    if (!onUpdate || !draft || editingId !== t.id) {return;}

    const updates: Partial<Omit<Transaction, 'id'>> = {
      description: draft.description,
      amount: Number(draft.amount),
      category_id: draft.category_id || null,
      payment_method_id: draft.payment_method_id || null,
      date: new Date(draft.date).toISOString(),
    };

    const cat = categories.find(c => c.id === draft.category_id || '');
    if (cat) {
      updates.category = cat.name;
    }

    const res = await onUpdate(t.id, updates);
    const hadError = typeof res === 'object' && res !== null && 'error' in res && Boolean((res as { error?: unknown }).error);
    if (!hadError) {
      setEditingId(null);
      setDraft(null);
    }
  }, [onUpdate, draft, editingId, categories]);

  const handleDraftChange = useCallback((updates: Partial<TransactionDraft>) => {
    setDraft(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const handleSort = (key: 'date' | 'category' | 'amount' | 'status') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: 'date' | 'category' | 'amount' | 'status') => {
    if (sortConfig.key !== key) {return <ArrowUpDown className="ml-1 h-3 w-3" />;}
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Memos
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const isUndisbursedLoan = (!t.payment_method_id) &&
        (t.description.toLowerCase().includes('préstamo') ||
          t.description.toLowerCase().includes('sin desembolso'));
      return !isUndisbursedLoan;
    });
  }, [transactions]);

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      let aValue: string | number = 0;
      let bValue: string | number = 0;

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
        aValue = aIsOrphan ? 1 : 0;
        bValue = bIsOrphan ? 1 : 0;
      }

      if (sortConfig.key) {
        if (aValue < bValue) {return sortConfig.direction === 'asc' ? -1 : 1;}
        if (aValue > bValue) {return sortConfig.direction === 'asc' ? 1 : -1;}
        return 0;
      }

      const aIsOrphan = !a.category || !a.payment_method_id;
      const bIsOrphan = !b.category || !b.payment_method_id;

      if (aIsOrphan && !bIsOrphan) {return -1;}
      if (!aIsOrphan && bIsOrphan) {return 1;}

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return sorted;
  }, [filteredTransactions, sortConfig, categories]);

  const displayTransactions = showOnlyRecent ? sortedTransactions.slice(0, 10) : sortedTransactions;

  // Render skeletons while loading
  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        {/* Desktop Table Skeleton */}
        <div className="hidden md:block finance-card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[600px] table-auto">
              <thead className="bg-muted/30">
                <tr>
                  {[...Array(8)].map((_, i) => (
                    <th key={i} className="py-4 px-4 border-r border-border last:border-r-0">
                      <PulseBlock height="0.75rem" width="60%" className="mx-auto" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0 h-16">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-2 border-r border-border/50 last:border-r-0">
                        <PulseBlock height="0.75rem" width={j === 1 ? '80%' : '40%'} className="mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card Skeleton */}
        <div className="md:hidden space-y-3">
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} height="120px" />
          ))}
        </div>
      </div>
    );
  }

  // Render empty state
  if (displayTransactions.length === 0) {
    return (
      <div
        className="rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 transition-all shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px dashed hsl(var(--border))',
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

  // Render list
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block finance-card overflow-hidden transition-all duration-300">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[600px] table-auto">
            <thead className="bg-muted/30">
              <tr>
                <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
                  <button
                    type="button"
                    onClick={() => handleSort('date')}
                    className="flex w-full items-center justify-center gap-1 hover:text-primary transition-colors"
                    aria-label="Ordenar por fecha"
                  >
                    Fecha
                    <span>{getSortIcon('date')}</span>
                  </button>
                </th>
                <th className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px] border-r border-border">
                  Descripción
                </th>
                <th className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
                  Tipo
                </th>
                <th className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider max-w-[80px] border-r border-border">
                  <button
                    type="button"
                    onClick={() => handleSort('category')}
                    className="flex w-full items-center justify-center gap-1 hover:text-primary transition-colors"
                    aria-label="Ordenar por categoría"
                  >
                    Categoría
                    <span>{getSortIcon('category')}</span>
                  </button>
                </th>
                <th className="py-4 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
                  Método de Pago
                </th>
                <th className="py-4 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="flex w-full items-center justify-center gap-1 hover:text-primary transition-colors"
                    aria-label="Ordenar por monto"
                  >
                    Monto
                    <span>{getSortIcon('amount')}</span>
                  </button>
                </th>
                <th className="py-4 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Select value={statusFilter ? statusFilter : 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as 'attention' | 'ok')}>
                      <SelectTrigger className="h-6 w-20 text-[10px] border-none bg-transparent p-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="attention">Atención</SelectItem>
                        <SelectItem value="ok">OK</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => handleSort('status')} className="hover:text-primary transition-colors p-0 border-none bg-transparent">
                      {getSortIcon('status')}
                    </button>
                  </div>
                </th>
                <th className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isEditing={editingId === transaction.id}
                  draft={draft}
                  paymentMethods={paymentMethods}
                  categories={categories}
                  highlightOrphaned={highlightOrphaned}
                  currency={currency}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onDraftChange={handleDraftChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {displayTransactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            paymentMethods={paymentMethods}
            categories={categories}
            onStartEdit={startEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}
