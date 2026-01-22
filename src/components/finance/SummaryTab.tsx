import { useMemo, useState, useEffect } from 'react';
import { SummaryCard } from './SummaryCard';
import { EvolutionChart } from './EvolutionChart';
import { ExpenseChart } from './ExpenseChart';
import { InsightsPanel } from './InsightsPanel';
import { BudgetList } from './BudgetList';
import { PaymentMethodList } from './PaymentMethodList';
import { EditPaymentMethodDialog } from './EditPaymentMethodDialog';
import { AddPaymentMethodDialog } from './AddPaymentMethodDialog';
import { useFinanceData } from '@/hooks/useFinanceData';
import { calculateExpensesByCategory } from '@/hooks/financeUtils';
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, BarChart3, Calendar as CalendarIcon, AlertCircle, ArrowRight, FilterX } from 'lucide-react';
import { Transaction, Budget, PaymentMethod, Insight, CategoryItem } from '@/hooks/useFinanceData';
import { useLoans } from '@/hooks/useLoans';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddTransactionDialog } from './AddTransactionDialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';


interface SummaryTabProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  budgets: Budget[];
  paymentMethods: PaymentMethod[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    totalInvestments: number;
    netWorth: number;
  };
  expensesByCategory: { category: string; amount: number }[];
  insights: Insight[];
  onDeleteBudget: (id: string) => Promise<void>;
  onDeletePaymentMethod: (id: string) => Promise<void>;
  categories: CategoryItem[];
  onUpdateCategoryGoal: (id: string, goal: number) => Promise<any>;
  onUpdateTransaction: (id: string, updates: any) => Promise<any>;
  dateFilter: { period: string; from: string | null; to: string | null };
  updateFilter: (period: string, from?: string, to?: string) => void;
}

export function SummaryTab({
  transactions,
  allTransactions,
  budgets,
  paymentMethods,
  summary,
  expensesByCategory,
  insights,
  onDeleteBudget,
  onDeletePaymentMethod,
  categories,
  onUpdateCategoryGoal,
  onUpdateTransaction,
  dateFilter,
  updateFilter
}: SummaryTabProps) {
  // Get current date values first
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Extract available years from all transactions
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    if (allTransactions && allTransactions.length > 0) {
      allTransactions.forEach(t => years.add(new Date(t.date).getFullYear().toString()));
    }
    // Always include current year
    years.add(currentYear.toString());
    return Array.from(years).sort((a, b) => Number(b) - Number(a)); // descending order
  }, [allTransactions, currentYear]);

  // Determine which months to show based on selected year
  const selectedYear = dateFilter.from ? new Date(dateFilter.from).getFullYear() : currentYear;
  const isAllYears = !dateFilter.from; // When no dateFilter, we're showing all years
  
  const availableMonths = useMemo(() => {
    const months = [
      { value: 'all', label: 'Todo' },
      { value: '0', label: 'Ene' },
      { value: '1', label: 'Feb' },
      { value: '2', label: 'Mar' },
      { value: '3', label: 'Abr' },
      { value: '4', label: 'May' },
      { value: '5', label: 'Jun' },
      { value: '6', label: 'Jul' },
      { value: '7', label: 'Ago' },
      { value: '8', label: 'Sep' },
      { value: '9', label: 'Oct' },
      { value: '10', label: 'Nov' },
      { value: '11', label: 'Dic' },
    ];
    
    // If showing all years or if it's the current year, only show months up to current month
    if (isAllYears || selectedYear === currentYear) {
      return months.slice(0, currentMonth + 2); // +2 because index 0 is 'all'
    }
    
    // For past/future years, show all months
    return months;
  }, [selectedYear, currentMonth, currentYear, isAllYears]);
  const { addPaymentMethod, updatePaymentMethod } = useFinanceData();
  const [isAddPMOpen, setIsAddPMOpen] = useState(false);
  const [editingPM, setEditingPM] = useState<PaymentMethod | null>(null);
  const [isEditPMOpen, setIsEditPMOpen] = useState(false);

  // Estado compartido entre la gráfica de evolución y el donut
  const [selectedYears, setSelectedYears] = useState<string[]>(() => availableYears.length ? availableYears : [currentYear.toString()]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Asegurar que siempre haya al menos un año seleccionado
  useEffect(() => {
    if (selectedYears.length === 0 && availableYears.length > 0) {
      setSelectedYears([availableYears[0]]);
      return;
    }
    const filtered = selectedYears.filter(y => availableYears.includes(y));
    if (filtered.length !== selectedYears.length) {
      setSelectedYears(filtered.length ? filtered : [availableYears[0] || currentYear.toString()]);
    }
  }, [availableYears, selectedYears, currentYear]);

  // Transacciones filtradas según la selección de la gráfica (años/mes)
  const filteredChartTransactions = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) return [];
    return allTransactions.filter(t => {
      const d = new Date(t.date);
      const yearStr = d.getFullYear().toString();
      if (!selectedYears.includes(yearStr)) return false;
      if (selectedMonth !== 'all') {
        const monthNum = d.getMonth() + 1;
        if (monthNum !== Number(selectedMonth)) return false;
      }
      return true;
    });
  }, [allTransactions, selectedYears, selectedMonth]);

  const expensesByCategoryFiltered = useMemo(
    () => calculateExpensesByCategory(filteredChartTransactions),
    [filteredChartTransactions]
  );




  const { loans } = useLoans();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isDateFiltered = dateFilter.period !== 'all';

  // SECTION 0: Global Alerts (Incomplete Transactions)
  // Exclude loans explicitly, they are handled in Loans tab
  const incompleteTransactions = useMemo(() => {
    return transactions.filter(t =>
      (!t.category_id || !t.payment_method_id) &&
      t.type !== 'loan'
    );
  }, [transactions]);

  // SECTION 1: Current Month Calculations
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getFullYear() === currentYear &&
        transactionDate.getMonth() === currentMonth;
    });

    const monthIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Debts for current month: loans + credit card balances
    const myDebts = loans.filter(l => l.type === 'borrowed');
    const monthDebts = myDebts.reduce((acc, l) => acc + (l.total_amount - l.paid_amount), 0);

    const totalCreditDebt = paymentMethods
      .filter(pm => pm.type === 'credit')
      .reduce((sum, pm) => sum + pm.balance, 0);

    const totalMonthDebts = monthDebts + totalCreditDebt;

    const monthBalance = monthIncome - monthExpenses;

    return {
      monthIncome,
      monthExpenses,
      monthDebts: totalMonthDebts,
      monthBalance,
    };
  }, [transactions, loans, paymentMethods]);

  // SECTION 2: Accumulated Wealth & Health
  const accumulatedData = useMemo(() => {
    // Available Balance (Cash + Debit, excluding savings)
    const availableBalance = paymentMethods
      .filter(pm => (pm.type === 'cash' || pm.type === 'debit') && !pm.is_savings_account)
      .reduce((sum, pm) => sum + pm.balance, 0);

    // Savings Balance
    const savingsBalance = paymentMethods
      .filter(pm => pm.is_savings_account)
      .reduce((sum, pm) => sum + pm.balance, 0);

    // Available + Savings
    const availablePlusSavings = availableBalance + savingsBalance;

    return {
      availableBalance,
      availablePlusSavings,
      savingsBalance
    };
  }, [paymentMethods]);

  return (
    <div className="space-y-8 py-6 antialiased">
      {/* Edit Dialog for Corrections */}
      {editingTransaction && (
        <AddTransactionDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setEditingTransaction(null);
          }}
          transactionToEdit={editingTransaction}
          categories={categories}
          paymentMethods={paymentMethods}
          onUpdateTransaction={async (id, updates) => {
            await onUpdateTransaction(id, updates);
            setIsEditDialogOpen(false);
            setEditingTransaction(null);
          }}
        />
      )}


      {/* SECCIÓN 1: Mis Cuentas (Prioridad Alta) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">Mis Cuentas</span>
          </h2>
        </div>
        
        <PaymentMethodList
          paymentMethods={paymentMethods}
          variant="dashboard"
          onEdit={(pm) => {
            setEditingPM(pm);
            setIsEditPMOpen(true);
          }}
          onAdd={() => setIsAddPMOpen(true)}
        />

        <EditPaymentMethodDialog
          paymentMethod={editingPM}
          open={isEditPMOpen}
          onOpenChange={(o) => {
            setIsEditPMOpen(o);
            if (!o) setEditingPM(null);
          }}
          onSave={updatePaymentMethod}
        />

        <AddPaymentMethodDialog
          onAdd={addPaymentMethod}
          open={isAddPMOpen}
          onOpenChange={setIsAddPMOpen}
        />
      </div>

      {/* SECCIÓN 2: Disponibilidad y Ahorro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          title="Saldo Disponible"
          amount={accumulatedData.availableBalance}
          icon={Wallet}
          variant="neutral"
          description="Caja + Débito"
        />
        <SummaryCard
          title="Patrimonio Líquido"
          amount={accumulatedData.availablePlusSavings}
          icon={PiggyBank}
          variant="positive"
          description="Total Global"
        />
        <SummaryCard
          title="Balance del Mes"
          amount={currentMonthData.monthBalance}
          icon={Wallet}
          variant={currentMonthData.monthBalance >= 0 ? 'positive' : 'negative'}
          description="Ingresos vs Gastos"
        />
        <SummaryCard
          title="Deudas del Mes"
          amount={currentMonthData.monthDebts}
          icon={DollarSign}
          variant="warning"
          description="Por pagar"
        />
      </div>

      {/* SECCIÓN 3: Resumen Mensual Detallado */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Resumen del Mes</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <SummaryCard
            title="Ingresos"
            amount={currentMonthData.monthIncome}
            icon={TrendingUp}
            variant="positive"
            description="Entradas este mes"
          />
          <SummaryCard
            title="Gastos"
            amount={currentMonthData.monthExpenses}
            icon={TrendingDown}
            variant="neutral"
            description="Salidas este mes"
          />
          <SummaryCard
            title="Ahorro Total"
            amount={summary.totalSavings} // Using totalSavings from props which is usually monthly or global acc? Check logic later but keep prop usage
            icon={PiggyBank}
            variant="neutral"
            description="Acumulado"
          />
        </div>
      </div>

      {/* Herramientas de Análisis y Detalles */}
      <div className="space-y-8 sm:space-y-10 lg:space-y-12">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
            <BarChart3 className="w-5 h-5 text-primary flex-shrink-0" />
            <h2 className="text-lg font-semibold border-b-2 border-primary/20 pb-1 pr-4 whitespace-nowrap">
              Análisis Visual
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 bg-card rounded-xl p-4 sm:p-6 border border-border shadow-sm overflow-x-auto">
              <EvolutionChart
                transactions={allTransactions}
                selectedYears={selectedYears}
                onSelectedYearsChange={setSelectedYears}
                selectedMonth={selectedMonth}
                onSelectedMonthChange={setSelectedMonth}
                onSelectAllYears={() => setSelectedYears(availableYears)}
              />
            </div>
            <div className="lg:col-span-1 bg-card rounded-xl p-4 sm:p-6 border border-border shadow-sm">
              <ExpenseChart data={expensesByCategoryFiltered} categories={categories} />
            </div>
          </div>
        </div>

        {/* Sección de Insights */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-l-2 border-primary pl-2 truncate">
            Insights y Alertas
          </h3>
          <div className="overflow-y-auto">
            <InsightsPanel insights={insights.filter(i => !i.id.startsWith('budget-'))} />
          </div>
        </div>
      </div>
    </div>
  );
}