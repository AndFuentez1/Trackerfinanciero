import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMethod, CategoryItem } from '@/hooks/useFinanceData';
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
import { cn } from '@/lib/utils';
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
}

const typeLabels = {
  income: 'Ingreso',
  expense: 'Gasto',
  savings: 'Ahorro',
  investment: 'Inversión',
  loan: 'Préstamo',
  transfer: 'Transf.',
  transfer_in: 'T. Recibida',
  transfer_out: 'T. Enviada',
};

const typeStyles = {
  income: 'text-emerald-600 bg-emerald-50',
  expense: 'text-rose-600 bg-rose-50',
  savings: 'text-blue-600 bg-blue-50',
  investment: 'text-purple-600 bg-purple-50',
  loan: 'text-amber-600 bg-amber-50',
  transfer: 'text-slate-600 bg-slate-50',
  transfer_in: 'text-emerald-500 bg-emerald-50/50',
  transfer_out: 'text-rose-500 bg-rose-50/50',
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
  setStatusFilter
}: TransactionListProps) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getPaymentMethodName = (pmId: string | null | undefined) => {
    if (!pmId) return null;
    const pm = paymentMethods.find(p => p.id === pmId);
    return pm?.name || null;
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
      <div className="bg-white rounded-[2rem] border border-gray-100 p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
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
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="w-full overflow-hidden">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/30">
              <tr>
                <th
                  className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('date')}
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="flex items-center justify-center">
                    {getSortIcon('date')} Fecha
                  </div>
                </th>
                <th className="py-3 px-3 text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider" style={{ fontStyle: 'normal' }}>
                  Descripción
                </th>
                <th className="py-3 px-2 text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider" style={{ fontStyle: 'normal' }}>
                  Tipo
                </th>
                <th
                  className="py-3 px-3 text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('category')}
                  style={{ fontStyle: 'normal' }}
                >
                  Categoría
                </th>
                <th className="py-3 px-3 text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider" style={{ fontStyle: 'normal' }}>
                  Método de Pago
                </th>
                <th
                  className="py-3 px-3 text-right text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('amount')}
                  style={{ fontStyle: 'normal' }}
                >
                  <div className="flex items-center justify-end">
                    Monto {getSortIcon('amount')}
                  </div>
                </th>
                <th className="py-3 px-3 text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider" style={{ fontStyle: 'normal' }}>
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
                <th className="py-3 px-2 text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider" style={{ fontStyle: 'normal' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((transaction, index) => {
                const pmName = getPaymentMethodName(transaction.payment_method_id);
                const categoryItem = categories.find(c => c.id === transaction.category_id) || categories.find(c => c.name === transaction.category);
                const isOrphan = (!transaction.category && !transaction.category_id) || !transaction.payment_method_id;

                const isEditing = editingId === transaction.id;
                return (
                  <tr
                    key={transaction.id}
                    className={cn(
                      'border-b border-border/20 transition-all duration-200 group hover:bg-muted/20',
                      isEditing && 'bg-primary/5 hover:bg-primary/10',
                      isOrphan && 'bg-destructive/5 hover:bg-destructive/10',
                      highlightOrphaned && isOrphan && 'border-l-4 border-l-destructive',
                      'animate-fade-in'
                    )}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    {/* Date */}
                    <td className="py-3 px-4 align-middle text-center" style={{ fontStyle: 'normal' }}>
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
                    <td className="py-2.5 px-3 align-middle" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <Input
                          value={draft?.description ?? transaction.description}
                          onChange={(e) => setDraft(d => d ? { ...d, description: e.target.value } : d)}
                          className="h-8 text-sm"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-foreground font-medium line-clamp-1 leading-tight" style={{ fontStyle: 'normal' }}>
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
                    <td className="py-2.5 px-2 align-middle text-center" style={{ fontStyle: 'normal' }}>
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        typeStyles[transaction.type]
                      )} style={{ fontStyle: 'normal' }}>
                        {typeLabels[transaction.type]}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 align-middle text-center" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <div className="mx-auto max-w-[160px]">
                          <Select
                            onValueChange={(v) => setDraft(d => d ? { ...d, category_id: v } : d)}
                            value={draft?.category_id || ''}
                          >
                            <SelectTrigger className="h-8 text-[10px] uppercase font-bold bg-background/50 hover:bg-background">
                              <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => c.type === transaction.type).map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : onUpdate && (!transaction.category && !transaction.category_id) ? (
                        <div className="mx-auto max-w-[140px]">
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
                            <SelectTrigger className="h-8 text-[10px] uppercase font-bold border-destructive/30 bg-background/50 hover:bg-background">
                              <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => c.type === transaction.type).map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: (categoryItem?.color || '#3b82f6') + '20',
                              color: categoryItem?.color || '#3b82f6',
                              fontStyle: 'normal'
                            }}
                          >
                            {categoryItem?.name || transaction.category || "Sin categoría"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="py-2.5 px-3 align-middle text-center" style={{ fontStyle: 'normal' }}>
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
                          <span className="text-xs text-muted-foreground truncate" style={{ fontStyle: 'normal' }}>{pmName}</span>
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
                          <span className="text-[10px] font-bold text-slate-400 uppercase" style={{ fontStyle: 'normal' }}>Sin desembolso</span>
                        )
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-3 align-middle text-right" style={{ fontStyle: 'normal' }}>
                      {isEditing ? (
                        <Input
                          type="number"
                          className="h-8 text-sm w-[8rem] ml-auto text-right"
                          value={draft?.amount ?? transaction.amount}
                          onChange={(e) => setDraft(d => d ? { ...d, amount: Number(e.target.value) } : d)}
                        />
                      ) : (
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {transaction.type === 'expense' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
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
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 transition-colors"
                              onClick={() => saveEdit(transaction)}
                              title="Guardar cambios"
                            >
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
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
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 transition-colors"
                            onClick={() => startEdit(transaction)}
                            title="Editar transacción"
                          >
                            <Pencil className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 transition-colors"
                          onClick={() => onDelete(transaction.id)}
                          title="Eliminar transacción"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-destructive transition-colors" />
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
            const categoryItem = categories.find(c => c.id === transaction.category_id) || categories.find(c => c.name === transaction.category);
            const isOrphan = (!transaction.category && !transaction.category_id) || !transaction.payment_method_id;

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
                          backgroundColor: (categoryItem?.color || '#3b82f6') + '20',
                          color: categoryItem?.color || '#3b82f6',
                        }}
                      >
                        {categoryItem?.name || transaction.category || "Sin categoría"}
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
                      transaction.type === 'expense' ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
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
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => startEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
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
