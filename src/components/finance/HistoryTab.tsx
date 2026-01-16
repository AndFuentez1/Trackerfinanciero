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
import { Search, Filter, Calendar, X, Tag, Plus } from 'lucide-react';
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
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const handleClearAll = () => {
    setSearchTerm('');
    setMonthFilter('all');
    setYearFilter('');
    setTypeFilter('all');
    setCategoryFilter('all');
  };

  const handleThisMonth = () => {
    const now = new Date();
    setMonthFilter((now.getMonth() + 1).toString());
    setYearFilter(now.getFullYear().toString());
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Type Filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'transfer') {
          if (t.category !== 'Transferencia') return false;
        } else if (typeFilter === 'savings_investment') {
          if (!['savings', 'investment'].includes(t.type)) return false;
        } else if (t.type !== typeFilter) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'all') {
        if (t.category_id !== categoryFilter && t.category !== categoryFilter) return false;
      }

      // 3. Date Parsing
      const date = new Date(t.date);

      // 4. Month Filter
      if (monthFilter !== 'all') {
        if (monthFilter === 'thisMonth') {
          const now = new Date();
          if (date.getMonth() + 1 !== now.getMonth() + 1 || date.getFullYear() !== now.getFullYear()) return false;
        } else {
          if (date.getMonth() + 1 !== parseInt(monthFilter)) return false;
        }
      }

      // 5. Year Filter (skip if thisMonth is selected, as it handles its own year)
      if (monthFilter !== 'thisMonth' && yearFilter && /^\d{4}$/.test(yearFilter)) {
        if (date.getFullYear().toString() !== yearFilter) return false;
      }

      // 6. Search Term (Description Only now for precision)
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!t.description.toLowerCase().includes(term)) return false;
      }

      return true;
    });
  }, [transactions, searchTerm, monthFilter, yearFilter, typeFilter, categoryFilter]);

  const YEARS = ['Todos','2026','2025','2024','2023','2022','2021','2020'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-card/30 p-4 rounded-xl border border-border/50">
        {/* Description */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-background/50 border-gray-100"
          />
        </div>

        {/* Month */}
        <div className="md:col-span-2">
          <Select value={monthFilter} onValueChange={(value) => {
            if (value === 'thisMonth') {
              handleThisMonth();
            } else {
              setMonthFilter(value);
            }
          }}>
            <SelectTrigger className="h-10 bg-background/50 border-gray-100">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el año</SelectItem>
              {MONTHS.map((m, idx) => (
                <SelectItem key={m} value={(idx + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year (Dropdown with 'Todos') */}
        <div className="md:col-span-2">
          <Select
            value={yearFilter || 'Todos'}
            onValueChange={(v) => setYearFilter(v === 'Todos' ? '' : v)}
          >
            <SelectTrigger className="h-10 bg-background/50 border-gray-100">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categories */}
        <div className="md:col-span-2 relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="pl-9 h-10 bg-background/50 border-gray-100">
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

        {/* Types */}
        <div className="md:col-span-2 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="pl-9 h-10 bg-background/50 border-gray-100">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="expense">Gasto</SelectItem>
              <SelectItem value="income">Ingreso</SelectItem>
              <SelectItem value="savings_investment">Ahorro / Inversión</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Buttons Row */}
        <div className="md:col-span-12 flex items-center justify-end mt-1 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2">
            {(searchTerm || monthFilter !== 'all' || yearFilter || typeFilter !== 'all' || categoryFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 gap-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar Filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      <TransactionList
        transactions={filteredTransactions}
        onDelete={onDeleteTransaction}
        onUpdate={onUpdateTransaction}
        onEdit={onEditTransaction}
        paymentMethods={paymentMethods}
        categories={categories}
        highlightOrphaned={highlightOrphaned}
      />
    </div>
  );
}