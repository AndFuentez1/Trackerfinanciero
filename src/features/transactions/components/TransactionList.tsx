import React, { useState, useMemo, useCallback } from 'react';
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionRow } from './TransactionRow';
import { TransactionCard } from './TransactionCard';
import { typeLabels, typeStyles } from './constants';

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
  currency?: string;
}

export { typeLabels, typeStyles }; // Re-export if other external components used them (optional but safe)

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
  currency = 'COP',
}: TransactionListProps) {
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

  const startEdit = useCallback((t: Transaction) => {
    setEditingId(t.id);
    setDraft({
      description: t.description,
      amount: t.amount,
      category_id: t.category_id || null,
      payment_method_id: t.payment_method_id || null,
      date: t.date,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(null);
  }, []);

  // Helper moved to Row component, but kept here if needed for sort/filter usage logic?
  // Actually, TransactionRow now has its own helper copies. Could be DRYed out later in a utils file.

  const saveEdit = useCallback(async (t: Transaction) => {
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
  }, [onUpdate, draft, editingId, categories]);

  const handleDraftChange = useCallback((updates: any) => {
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
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-3 w-3" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

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

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block finance-card overflow-hidden transition-all duration-300">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[600px] table-auto">
            <thead className="bg-muted/30">
              <tr>
                <th
                  className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-primary transition-colors border-r border-border"
                  onClick={() => handleSort('date')}
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    Fecha
                    <span>{getSortIcon('date')}</span>
                  </div>
                </th>
                <th className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px] border-r border-border" style={{ fontStyle: 'normal' }}>
                  Descripción
                </th>
                <th className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border" style={{ fontStyle: 'normal' }}>
                  Tipo
                </th>
                <th
                  className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-primary transition-colors max-w-[80px] border-r border-border"
                  onClick={() => handleSort('category')}
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    Categoría
                    <span>{getSortIcon('category')}</span>
                  </div>
                </th>
                <th className="py-4 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border" style={{ fontStyle: 'normal' }}>
                  Método de Pago
                </th>
                <th
                  className="py-4 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-primary transition-colors border-r border-border"
                  onClick={() => handleSort('amount')}
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    Monto
                    <span>{getSortIcon('amount')}</span>
                  </div>
                </th>
                <th className="py-4 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontStyle: 'normal' }}>
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
                <th className="py-4 px-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontStyle: 'normal' }}>Acciones</th>
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
