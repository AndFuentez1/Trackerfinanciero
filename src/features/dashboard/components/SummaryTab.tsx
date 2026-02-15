import { useMemo, useState, useEffect } from 'react';
import { SummaryCard } from './SummaryCard';
import { EvolutionChart } from './EvolutionChart';
import { ExpenseChart } from './ExpenseChart';
import { InsightsPanel } from './InsightsPanel';
import { PaymentMethodList } from '@/features/finance/payment-methods/components/PaymentMethodList';
import { EditPaymentMethodDialog } from '@/features/finance/payment-methods/components/EditPaymentMethodDialog';
import { AddPaymentMethodDialog } from '@/features/finance/payment-methods/components/AddPaymentMethodDialog';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { calculateExpensesByCategory } from '@/features/finance/utils/financeUtils';
import { excludeTransfers } from '@/lib/cashflowUtils';
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, BarChart3, Calendar as CalendarIcon, AlertCircle, ArrowRight, FilterX } from 'lucide-react';
import type { Transaction, Budget, PaymentMethod, Insight, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useLoans } from '@/features/finance/loans/hooks/useLoans';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddTransactionDialog } from '@/features/finance/transactions/components/AddTransactionDialog';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Calendar } from '@/shared/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { cn } from '@/core/utils';


import { PulseBlock, CardSkeleton, AccountsListSkeleton } from '@/shared/components/skeletons/SkeletonLoader';

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
  onUpdateTransaction: (id: string, updates: any) => Promise<any>;
  dateFilter: { period: string; from: string | null; to: string | null };
  updateFilter: (period: string, from?: string, to?: string) => void;
  loading?: boolean;
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
  onUpdateTransaction,
  dateFilter,
  updateFilter,
  loading = false
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
      { value: '1', label: 'Ene' },
      { value: '2', label: 'Feb' },
      { value: '3', label: 'Mar' },
      { value: '4', label: 'Abr' },
      { value: '5', label: 'May' },
      { value: '6', label: 'Jun' },
      { value: '7', label: 'Jul' },
      { value: '8', label: 'Ago' },
      { value: '9', label: 'Sep' },
      { value: '10', label: 'Oct' },
      { value: '11', label: 'Nov' },
      { value: '12', label: 'Dic' },
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
  const [pmToDelete, setPmToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
    if (!allTransactions || allTransactions.length === 0) { return []; }
    const byDate = allTransactions.filter(t => {
      const d = new Date(t.date);
      const yearStr = d.getFullYear().toString();
      if (!selectedYears.includes(yearStr)) { return false; }
      if (selectedMonth !== 'all') {
        const monthNum = d.getMonth() + 1;
        if (monthNum !== Number(selectedMonth)) { return false; }
      }
      return true;
    });
    const noTransfers = excludeTransfers(byDate);
    return noTransfers.filter(t => !(t.type === 'expense' && (t.installments || 1) > 1));
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
      {/* SECTION 0: Global Alerts */}
      {incompleteTransactions.length > 0 && (
        <div className="bg-orange-50/50 border border-orange-200/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 text-orange-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-orange-800 leading-tight">Acción requerida</h4>
              <p className="text-xs text-orange-700 font-medium">Tienes {incompleteTransactions.length} transacciones sin categoría o método de pago.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 bg-white/50 backdrop-blur-sm shadow-sm gap-2"
            onClick={() => setEditingTransaction(incompleteTransactions[0])}
          >
            Corregir ahora <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog for Corrections */}
      {editingTransaction && (
        <AddTransactionDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) { setEditingTransaction(null); }
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


      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 px-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-start gap-2 leading-none tracking-tight">
            <Wallet className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">Mis Cuentas</span>
          </h2>
        </div>

        {loading ? (
          <AccountsListSkeleton count={2} />
        ) : (
          <>
            <PaymentMethodList
              paymentMethods={paymentMethods}
              variant="dashboard"
              onEdit={(pm) => {
                setEditingPM(pm);
                setIsEditPMOpen(true);
              }}
              onDelete={(pm) => {
                setPmToDelete(pm);
                setIsDeleteConfirmOpen(true);
              }}
              onAdd={() => setIsAddPMOpen(true)}
            />

            <EditPaymentMethodDialog
              paymentMethod={editingPM}
              open={isEditPMOpen}
              onOpenChange={(o) => {
                setIsEditPMOpen(o);
                if (!o) { setEditingPM(null); }
              }}
              onSave={updatePaymentMethod}
            />

            <AddPaymentMethodDialog
              onAdd={addPaymentMethod}
              open={isAddPMOpen}
              onOpenChange={setIsAddPMOpen}
            />
          </>
        )}

        {/* Modal de Confirmación de Eliminación */}
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este método de pago?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará <strong>{pmToDelete?.name}</strong>.
                Las transacciones asociadas podrían quedar sin método de pago asignado. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (pmToDelete) {
                    await onDeletePaymentMethod(pmToDelete.id);
                    setIsDeleteConfirmOpen(false);
                    setPmToDelete(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              >
                Sí, eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* SECCIÓN 2: Disponibilidad y Ahorro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <CardSkeleton key={i} height="100px" padding="1rem">
              <PulseBlock height="0.75rem" width="60%" className="mb-2" />
              <PulseBlock height="1.5rem" width="80%" />
            </CardSkeleton>
          ))
        ) : (
          <>
            <SummaryCard
              title="Saldo Disponible"
              amount={accumulatedData.availableBalance}
              icon={Wallet}
              variant="positive"
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
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-start gap-2 leading-none tracking-tight px-1">
          <CalendarIcon className="w-5 h-5 text-primary flex-shrink-0" />
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
            variant="positive"
            description="Acumulado"
          />
        </div>
      </div>

      {/* Herramientas de Análisis y Detalles */}
      <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex items-start gap-2 sm:gap-3 px-1">
            <BarChart3 className="w-5 h-5 text-primary flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold leading-none tracking-tight">
              Análisis Visual
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              {loading ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <PulseBlock height="1.5rem" width="120px" />
                    <PulseBlock height="2rem" width="160px" />
                  </div>
                  <PulseBlock height="300px" width="100%" />
                </div>
              ) : (
                <EvolutionChart
                  transactions={allTransactions}
                  selectedYears={selectedYears}
                  onSelectedYearsChange={setSelectedYears}
                  selectedMonth={selectedMonth}
                  onSelectedMonthChange={setSelectedMonth}
                  onSelectAllYears={() => setSelectedYears(availableYears)}
                />
              )}
            </div>
            <div className="lg:col-span-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <PulseBlock height="180px" width="180px" borderRadius="9999px" />
                  <div className="w-full space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <PulseBlock height="0.75rem" width="40%" />
                        <PulseBlock height="0.75rem" width="20%" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ExpenseChart
                  data={expensesByCategoryFiltered}
                  categories={categories}
                  selectedMonth={selectedMonth}
                  onSelectedMonthChange={setSelectedMonth}
                  selectedYears={selectedYears}
                  onSelectedYearsChange={setSelectedYears}
                  availableYears={availableYears}
                  onSelectAllYears={() => setSelectedYears(availableYears)}
                />
              )}
            </div>
          </div>

        </div>

        {/* Sección de Insights */}
        {/* Sección de Insights - Oculta por solicitud
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-l-2 border-primary pl-2 truncate">
            Insights y Alertas
          </h3>
          <div className="overflow-y-auto">
            <InsightsPanel insights={insights.filter(i => !i.id.startsWith('budget-'))} />
          </div>
        </div>
        */}
      </div>
    </div>
  );
}
