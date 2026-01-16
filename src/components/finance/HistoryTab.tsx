import { useState, useMemo } from 'react';
import { TransactionList } from './TransactionList';
import { Transaction, PaymentMethod, CategoryItem } from '@/hooks/useFinanceData';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Calendar, X, Tag, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HistoryTabProps {
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onUpdateTransaction: (id: string, updates: any) => Promise<any>;
  onEditTransaction?: (transaction: Transaction) => void;
  categories: CategoryItem[];
  highlightOrphaned?: boolean;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function HistoryTab({
  transactions,
  paymentMethods,
  onDeleteTransaction,
  onUpdateTransaction,
  onEditTransaction,
  categories,
  highlightOrphaned = false
}: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string | undefined>(undefined);
  const [yearFilter, setYearFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const handleClearAll = () => {
    setSearchTerm('');
    setMonthFilter(undefined);
    setYearFilter(undefined);
    setTypeFilter(undefined);
    setCategoryFilter(undefined);
    setStatusFilter(undefined);
  };

  const handleThisMonth = () => {
    const now = new Date();
    setMonthFilter((now.getMonth() + 1).toString());
    setYearFilter(now.getFullYear().toString());
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Type Filter
      if (typeFilter !== undefined) {
        if (typeFilter === 'transfer') {
          if (t.category !== 'Transferencia') return false;
        } else if (typeFilter === 'savings_investment') {
          if (!['savings', 'investment'].includes(t.type)) return false;
        } else if (t.type !== typeFilter) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== undefined) {
        if (t.category_id !== categoryFilter && t.category !== categoryFilter) return false;
      }

      // 3. Date Parsing
      const date = new Date(t.date);

      // 4. Month Filter
      if (monthFilter !== undefined) {
        if (monthFilter === 'thisMonth') {
          const now = new Date();
          if (date.getMonth() + 1 !== now.getMonth() + 1 || date.getFullYear() !== now.getFullYear()) return false;
        } else {
          if (date.getMonth() + 1 !== parseInt(monthFilter)) return false;
        }
      }

      // 5. Year Filter
      if (yearFilter !== undefined && /^\d{4}$/.test(yearFilter)) {
        if (date.getFullYear().toString() !== yearFilter) return false;
      }

      // 6. Search Term (Description Only now for precision)
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!t.description.toLowerCase().includes(term)) return false;
      }

      // 7. Status Filter
      if (statusFilter !== undefined) {
        const isOrphan = !t.category && !t.category_id || !t.payment_method_id;
        if (statusFilter === 'attention' && !isOrphan) return false;
        if (statusFilter === 'ok' && isOrphan) return false;
      }

      return true;
    });
  }, [transactions, searchTerm, monthFilter, yearFilter, typeFilter, categoryFilter, statusFilter]);

  const visibleTransactions = filteredTransactions.slice(0, 20);

  const YEARS = [
    { label: 'Todos', value: 'all' },
    { label: '2026', value: '2026' },
    { label: '2025', value: '2025' },
    { label: '2024', value: '2024' },
    { label: '2023', value: '2023' },
    { label: '2022', value: '2022' },
    { label: '2021', value: '2021' },
    { label: '2020', value: '2020' }
  ];

  return (
    <div className="space-y-6">
      {/* Filtros en línea horizontal */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {/* Descripción */}
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar descripción"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 bg-background/50 border-gray-100"
          />
        </div>

        {/* Tipo */}
        <div className="flex-1 min-w-[120px]">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value === 'all' ? undefined : value)}>
            <SelectTrigger className="h-10 bg-background/50 border-gray-100">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Ingreso</SelectItem>
              <SelectItem value="expense">Gasto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="flex-1 min-w-[150px]">
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value === 'all' ? undefined : value)}>
            <SelectTrigger className="h-10 bg-background/50 border-gray-100">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mes */}
        <div className="flex-1 min-w-[120px]">
          <Select value={monthFilter} onValueChange={(value) => {
            if (value === 'thisMonth') {
              handleThisMonth();
            } else {
              setMonthFilter(value === 'all' ? undefined : value);
            }
          }}>
            <SelectTrigger className="h-10 bg-background/50 border-gray-100">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {MONTHS.map((m, idx) => (
                <SelectItem key={m} value={(idx + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Año */}
        <div className="flex-1 min-w-[100px]">
          <Select
            value={yearFilter}
            onValueChange={(value) => setYearFilter(value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="h-10 bg-background/50 border-gray-100">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Label de registros */}
      <div className="text-sm text-muted-foreground">
        Mostrando {visibleTransactions.length}/{filteredTransactions.length} registros
      </div>

      <TransactionList
        transactions={visibleTransactions}
        onDelete={onDeleteTransaction}
        onUpdate={onUpdateTransaction}
        onEdit={onEditTransaction}
        paymentMethods={paymentMethods}
        categories={categories}
        highlightOrphaned={highlightOrphaned}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
    </div>
  );
}