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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          border: '1px dashed var(--border)',
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
                      'border-b border-border transition-all duration-200 group hover:bg-muted/30',
                      isEditing && 'bg-primary/5 hover:bg-primary/10',
                      isOrphan && 'bg-destructive/5 hover:bg-destructive/10',
                      highlightOrphaned && isOrphan && 'border-l-4 border-l-destructive',
                      'animate-fade-in'
                    )}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    {/* Date */}
                    <td className="py-3 px-4 align-middle text-center border-r border-border" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <input
                          type="date"
                          className="h-8 px-2 text-xs bg-background/50 border rounded-md w-[9rem]"
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
                    <td className="py-2.5 px-2 align-middle max-w-[180px] text-center border-r border-border" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <Input
                          value={draft?.description ?? transaction.description}
                          onChange={(e) => setDraft(d => d ? { ...d, description: e.target.value } : d)}
                          className="h-8 text-sm max-w-[180px] text-center"
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
                    <td className="py-2.5 px-2 align-middle text-center border-r border-border" style={{ fontStyle: 'normal' }}>
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        typeStyles[transaction.type]
                      )} style={{ fontStyle: 'normal' }}>
                        {typeLabels[transaction.type]}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-2 align-middle text-center max-w-[120px] border-r border-border" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <div className="mx-auto max-w-[120px]">
                          <Select
                            onValueChange={(v) => setDraft(d => d ? { ...d, category_id: v } : d)}
                            value={draft?.category_id || ''}
                          >
                            <SelectTrigger className="h-8 text-[9px] uppercase font-bold bg-background/50 hover:bg-background">
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
                        <div className="mx-auto max-w-[120px]">
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
                            <SelectTrigger className="h-8 text-[9px] uppercase font-bold border-destructive/30 bg-background/50 hover:bg-background">
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
                        <div className="flex items-center justify-center max-w-[120px] mx-auto">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider line-clamp-2 text-center leading-tight"
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
                    <td className="py-2.5 px-3 align-middle text-center border-r border-border min-w-[140px]">
                      {isEditing ? (
                        <div className="mx-auto max-w-[160px]">
                          <Select
                            onValueChange={(v) => setDraft(d => d ? { ...d, payment_method_id: v } : d)}
                            value={draft?.payment_method_id || ''}
                          >
                            <SelectTrigger className="h-8 text-[10px] bg-background/50 hover:bg-background">
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
                        <div className="flex items-center justify-center gap-1.5 overflow-hidden">
                          <CreditCard className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate text-center font-bold" style={{ fontStyle: 'normal', minWidth: '100px', display: 'inline-block' }}>
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
                          <div className="mx-auto max-w-[140px]">
                            <Select
                              onValueChange={(v) => onUpdate(transaction.id, { payment_method_id: v })}
                              value=""
                            >
                              <SelectTrigger className="h-8 text-[10px] border-destructive/30 bg-background/50 hover:bg-background">
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
                    <td className="py-2.5 px-4 align-middle text-center whitespace-nowrap min-w-[120px] border-r border-arquitectura-2/30" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <Input
                          type="number"
                          className="h-8 text-sm w-[10rem] ml-auto text-right"
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
                            let formatted = new Intl.NumberFormat('es-CO', {
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
                    <td className="py-2.5 px-3 align-middle text-center" style={{ fontStyle: 'normal' }}>
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        isOrphan ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800'
                      )} style={{ fontStyle: 'normal' }}>
                        {isOrphan ? 'Atención' : 'OK'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 align-middle text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="default"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 transition-colors"
                              onClick={() => saveEdit(transaction)}
                              title="Guardar cambios"
                            >
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="default"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted/50 transition-colors"
                              onClick={cancelEdit}
                              title="Cancelar edición"
                            >
                              <X className="h-4 w-4 text-slate-400" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-sm border-primary/80"
                            onClick={() => startEdit(transaction)}
                            title="Editar transacción"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-sm border-primary/80"
                          onClick={() => onDelete(transaction.id)}
                          title="Eliminar transacción"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                      onClick={() => onDelete(transaction.id)}
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
    </>
  );
}
