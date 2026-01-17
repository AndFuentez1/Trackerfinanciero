import { useMemo, useState } from 'react';
import { SummaryCard } from './SummaryCard';
import { EvolutionChart } from './EvolutionChart';
import { ExpenseChart } from './ExpenseChart';
import { InsightsPanel } from './InsightsPanel';
import { BudgetList } from './BudgetList';
import { PaymentMethodList } from './PaymentMethodList';
import { EditPaymentMethodDialog } from './EditPaymentMethodDialog';
import { AddPaymentMethodDialog } from './AddPaymentMethodDialog';
import { useFinanceData } from '@/hooks/useFinanceData';
import { SavingsGoalsSection } from './SavingsGoalsSection';
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
  const { addPaymentMethod, updatePaymentMethod } = useFinanceData();
  const [isAddPMOpen, setIsAddPMOpen] = useState(false);
  const [editingPM, setEditingPM] = useState<PaymentMethod | null>(null);
  const [isEditPMOpen, setIsEditPMOpen] = useState(false);




  const { loans } = useLoans();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
        <div className="flex flex-col items-start justify-between gap-3 sm:gap-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 w-full">
            <Wallet className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">Mis Cuentas</span>
          </h2>
          
          {/* Date Filtering Controls - Responsive Wrapper */}
          <div className="w-full space-y-2">
            {/* Quick Action Buttons - Scroll en móvil */}
            <div className="flex gap-1 overflow-x-auto pb-2 sm:pb-0 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
                  updateFilter('custom', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'));
                }}
                className="h-8 px-2 text-xs whitespace-nowrap flex-shrink-0"
              >
                Semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const monthStart = startOfMonth(now);
                  const monthEnd = endOfMonth(now);
                  updateFilter('custom', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'));
                }}
                className="h-8 px-2 text-xs whitespace-nowrap flex-shrink-0"
              >
                Mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const yearStart = startOfYear(now);
                  const yearEnd = endOfYear(now);
                  updateFilter('custom', format(yearStart, 'yyyy-MM-dd'), format(yearEnd, 'yyyy-MM-dd'));
                }}
                className="h-8 px-2 text-xs whitespace-nowrap flex-shrink-0"
              >
                Año
              </Button>
            </div>

            {/* Month, Year Selectors & Calendar - Grid responsivo */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {/* Month Selector */}
              <Select
                value={dateFilter.from ? new Date(dateFilter.from).getMonth().toString() : ''}
                onValueChange={(month) => {
                  const year = dateFilter.from ? new Date(dateFilter.from).getFullYear() : new Date().getFullYear();
                  const monthStart = new Date(year, parseInt(month), 1);
                  const monthEnd = new Date(year, parseInt(month) + 1, 0);
                  updateFilter('custom', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'));
                }}
              >
                <SelectTrigger className="h-8 flex-1 sm:flex-initial sm:w-24 text-xs">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Ene</SelectItem>
                  <SelectItem value="1">Feb</SelectItem>
                  <SelectItem value="2">Mar</SelectItem>
                  <SelectItem value="3">Abr</SelectItem>
                  <SelectItem value="4">May</SelectItem>
                  <SelectItem value="5">Jun</SelectItem>
                  <SelectItem value="6">Jul</SelectItem>
                  <SelectItem value="7">Ago</SelectItem>
                  <SelectItem value="8">Sep</SelectItem>
                  <SelectItem value="9">Oct</SelectItem>
                  <SelectItem value="10">Nov</SelectItem>
                  <SelectItem value="11">Dic</SelectItem>
                </SelectContent>
              </Select>

              {/* Year Selector */}
              <Select
                value={dateFilter.from ? new Date(dateFilter.from).getFullYear().toString() : ''}
                onValueChange={(year) => {
                  const month = dateFilter.from ? new Date(dateFilter.from).getMonth() : new Date().getMonth();
                  const monthStart = new Date(parseInt(year), month, 1);
                  const monthEnd = new Date(parseInt(year), month + 1, 0);
                  updateFilter('custom', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'));
                }}
              >
                <SelectTrigger className="h-8 flex-1 sm:flex-initial sm:w-20 text-xs">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>

              {/* Calendar Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 px-2 sm:px-3 text-xs gap-1 bg-background/50 hover:bg-background border-border/50 flex-1 sm:flex-initial whitespace-nowrap overflow-hidden text-ellipsis">
                    <CalendarIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-xs">
                      {dateFilter.from ? (
                        <>
                          {format(new Date(dateFilter.from), 'dd MMM', { locale: es })}
                          {dateFilter.to && dateFilter.from !== dateFilter.to && (
                            <>
                              <span className="mx-0.5">-</span>
                              {format(new Date(dateFilter.to), 'dd MMM', { locale: es })}
                            </>
                          )}
                        </>
                      ) : (
                        <span>Todo</span>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateFilter.from ? new Date(dateFilter.from) : new Date()}
                    selected={{
                      from: dateFilter.from ? new Date(dateFilter.from) : undefined,
                      to: dateFilter.to ? new Date(dateFilter.to) : undefined,
                    }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        updateFilter('custom', format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd'));
                      } else if (range?.from) {
                        updateFilter('custom', format(range.from, 'yyyy-MM-dd'), format(range.from, 'yyyy-MM-dd'));
                      }
                    }}
                    numberOfMonths={1}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              {/* Clear Filter Button */}
              {dateFilter.period !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilter('all')}
                  className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive transition-colors flex-1 sm:flex-initial whitespace-nowrap"
                >
                  <FilterX className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Limpiar</span>
                </Button>
              )}
            </div>
          </div>
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
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
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
              <EvolutionChart transactions={allTransactions} />
            </div>
            <div className="lg:col-span-1 bg-card rounded-xl p-4 sm:p-6 border border-border shadow-sm">
              <ExpenseChart data={expensesByCategory} categories={categories} />
            </div>
          </div>
        </div>

        {/* Sección de Metas e Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
          <div className="space-y-4 min-w-0">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-2 border-primary pl-2 truncate">
              Metas de Ahorro
            </h3>
            <div className="overflow-x-auto">
              <SavingsGoalsSection
                categories={categories}
                onUpdateGoal={onUpdateCategoryGoal}
              />
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-2 border-amber-400 pl-2 truncate">
              Insights y Alertas
            </h3>
            <div className="overflow-y-auto max-h-96">
              <InsightsPanel insights={insights.filter(i => !i.id.startsWith('budget-'))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}