import { useState, useMemo } from 'react';
import { TransactionList } from './TransactionList';
import type { Transaction, PaymentMethod, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Search, Filter, Calendar, X, Tag, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/core/utils';

interface HistoryTabProps {
  transactions: Transaction[];
  allTransactions?: Transaction[]; // full set for total counts
  totalCount?: number; // Total count from Supabase (respects filters)
  paymentMethods: PaymentMethod[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onUpdateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<{ error?: unknown } | void>;
  onEditTransaction?: (transaction: Transaction) => void;
  categories: CategoryItem[];
  highlightOrphaned?: boolean;
  searchTerm?: string;
  typeFilter?: string;
  categoryFilter?: string;
  statusFilter?: 'attention' | 'ok';
  paymentMethodFilter?: string;
  setStatusFilter?: (value: 'attention' | 'ok' | undefined) => void;
  setPaymentMethodFilter?: (value: string | undefined) => void;
  loading?: boolean;
}


export function HistoryTab({
  transactions,
  allTransactions,
  totalCount = 0,
  paymentMethods,
  onDeleteTransaction,
  onUpdateTransaction,
  onEditTransaction,
  categories,
  highlightOrphaned = false,
  searchTerm = '',
  typeFilter,
  categoryFilter,
  statusFilter,
  paymentMethodFilter,
  setStatusFilter,
  setPaymentMethodFilter,
  loading = false
}: HistoryTabProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localTypeFilter, setLocalTypeFilter] = useState<string | undefined>(undefined);
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string | undefined>(undefined);
  const [localStatusFilter, setLocalStatusFilter] = useState<'attention' | 'ok' | undefined>(undefined);
  const [localPaymentMethodFilter, setLocalPaymentMethodFilter] = useState<string | undefined>(undefined);

  // Use passed props or local state
  const finalSearchTerm = searchTerm !== undefined ? searchTerm : localSearchTerm;
  const finalTypeFilter = typeFilter !== undefined ? typeFilter : localTypeFilter;
  const finalCategoryFilter = categoryFilter !== undefined ? categoryFilter : localCategoryFilter;
  const finalStatusFilter = statusFilter !== undefined ? statusFilter : localStatusFilter;
  const finalPaymentMethodFilter = paymentMethodFilter !== undefined ? paymentMethodFilter : localPaymentMethodFilter;

  const handleClearAll = () => {
    setLocalSearchTerm('');
    setLocalTypeFilter(undefined);
    setLocalCategoryFilter(undefined);
    setLocalStatusFilter(undefined);
    setLocalPaymentMethodFilter(undefined);
  };

  const applyFilters = (list: Transaction[]) => {
    return list.filter(t => {
      const isOrphan = !t.category && !t.category_id || !t.payment_method_id;

      // Si estamos en modo reclasificación, mostramos siempre las huérfanas
      // (a menos que haya una búsqueda de texto específica o filtro duro)
      // Sin embargo, el comportamiento esperado de `highlightOrphaned` es mostrar
      // estas transacciones prioritariamente.
      if (highlightOrphaned && isOrphan) {
        return true;
      }

      // 1. Type Filter
      if (finalTypeFilter !== undefined) {
        if (finalTypeFilter === 'transfer') {
          if (t.category !== 'Transferencia') { return false; }
        } else if (finalTypeFilter === 'savings_investment') {
          if (!['savings', 'investment'].includes(t.type)) { return false; }
        } else if (t.type !== finalTypeFilter) {
          return false;
        }
      }

      // 2. Category Filter
      if (finalCategoryFilter !== undefined) {
        if (t.category_id !== finalCategoryFilter && t.category !== finalCategoryFilter) { return false; }
      }

      // 3. Payment Method Filter
      if (finalPaymentMethodFilter !== undefined) {
        if (finalPaymentMethodFilter === 'empty') {
          if (t.payment_method_id) { return false; }
        } else if (finalPaymentMethodFilter === 'credit' || finalPaymentMethodFilter === 'debit' || finalPaymentMethodFilter === 'cash') {
          const pm = paymentMethods.find(p => p.id === t.payment_method_id);
          if (!pm || pm.type !== finalPaymentMethodFilter) { return false; }
        } else {
          if (t.payment_method_id !== finalPaymentMethodFilter) { return false; }
        }
      }

      // 4. Search Term (Description Only for precision)
      if (finalSearchTerm) {
        const term = finalSearchTerm.toLowerCase().trim();
        if (!t.description.toLowerCase().includes(term)) { return false; }
      }

      // 5. Status Filter
      if (finalStatusFilter !== undefined) {
        if (finalStatusFilter === 'attention' && !isOrphan) { return false; }
        if (finalStatusFilter === 'ok' && isOrphan) { return false; }
      }

      return true;
    });
  };

  const shouldLoadAll = finalStatusFilter === 'attention' || finalPaymentMethodFilter === 'empty';
  const sourceList = (shouldLoadAll && allTransactions) ? allTransactions : transactions;

  const filteredTransactions = useMemo(() => applyFilters(sourceList), [sourceList, finalSearchTerm, finalTypeFilter, finalCategoryFilter, finalStatusFilter, finalPaymentMethodFilter]);
  const filteredAllTransactions = useMemo(() => applyFilters(allTransactions || transactions), [allTransactions, transactions, finalSearchTerm, finalTypeFilter, finalCategoryFilter, finalStatusFilter, finalPaymentMethodFilter]);

  const hasEmptyPaymentMethods = useMemo(() => {
    const list = allTransactions || transactions;
    return list.some(t => !t.payment_method_id && t.type !== 'saving' && t.type !== 'investment' && t.category !== 'Transferencia');
  }, [allTransactions, transactions]);

  return (
    <div className="space-y-4">
      {/* Label de registros - Use totalCount for accuracy */}
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredTransactions.length} registros de {totalCount || filteredAllTransactions.length}
      </div>

      <TransactionList
        transactions={filteredTransactions}
        hasEmptyPaymentMethods={hasEmptyPaymentMethods}
        onDelete={onDeleteTransaction}
        onUpdate={onUpdateTransaction}
        onEdit={onEditTransaction}
        paymentMethods={paymentMethods}
        categories={categories}
        highlightOrphaned={highlightOrphaned}
        statusFilter={finalStatusFilter}
        setStatusFilter={setStatusFilter || setLocalStatusFilter}
        paymentMethodFilter={finalPaymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter || setLocalPaymentMethodFilter}
        loading={loading}
      />
    </div>
  );
}
