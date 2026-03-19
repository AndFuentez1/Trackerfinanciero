import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SummaryCard } from './SummaryCard';
import { EvolutionChart } from './EvolutionChart';
import { SankeyChart } from './SankeyChart';
import { ExpenseChart } from './ExpenseChart';
import { InsightsPanel } from './InsightsPanel';
import { PaymentMethodList } from '@/features/finance/payment-methods/components/PaymentMethodList';
import { EditPaymentMethodDialog } from '@/features/finance/payment-methods/components/EditPaymentMethodDialog';
import { AddPaymentMethodDialog } from '@/features/finance/payment-methods/components/AddPaymentMethodDialog';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { calculateExpensesByCategory } from '@/features/finance/utils/financeUtils';
import { excludeTransfers } from '@/features/finance/utils/cashflowUtils';
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, BarChart3, Calendar as CalendarIcon, AlertCircle, ArrowRight, FilterX, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddTransactionDialog } from '@/features/finance/transactions/components/AddTransactionDialog';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useUserConfig } from '@/features/finance/hooks/useUserConfig';
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
  onDeleteBudget: (id: string) => Promise<{ error: unknown }>;
  onDeletePaymentMethod: (id: string) => Promise<{ error: unknown }>;
  categories: CategoryItem[];
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ error: unknown }>;
  dateFilter: { period: string; from: string | null; to: string | null };
  updateFilter: (period: string, from?: string, to?: string) => void;
  pendingInvoices: { amount: number; arrival_date: string;[key: string]: unknown }[];
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
  pendingInvoices,
  loading = false
}: SummaryTabProps) {
  const navigate = useNavigate();

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

  const [selectedYears, setSelectedYears] = useState<string[]>(() => availableYears.includes(currentYear.toString()) ? [currentYear.toString()] : [currentYear.toString()]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Asegurar validación solo si el año dejó de existir, permitir array vacío para deseleccionar
  useEffect(() => {
    if (selectedYears.length === 0) { return; } // Allow empty
    const filtered = selectedYears.filter(y => availableYears.includes(y));
    if (filtered.length !== selectedYears.length) {
      setSelectedYears(filtered.length > 0 ? filtered : []);
    }
  }, [availableYears, selectedYears]);

  const handleToggleAllYears = () => {
    if (selectedYears.length === availableYears.length) {
      setSelectedYears([]);
    } else {
      setSelectedYears(availableYears);
    }
  };

  const [sankeyDrillDown, setSankeyDrillDown] = useState<{ type: 'income' | 'expense', page: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'evolution' | 'sankey'>('sankey');

  const { user } = useAuth();
  const { config, updateConfig } = useUserConfig(user?.id, user?.email);

  // Estado para ocultar la alerta global de transacciones incompletas
  const isAlertHidden = config.hide_incomplete_alert;

  const hideGlobalAlert = () => {
    updateConfig({ hide_incomplete_alert: true });
  };

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

  const expensesByCategoryFiltered = useMemo(() => {
    let baseTxs = filteredChartTransactions;
    if (sankeyDrillDown && sankeyDrillDown.type === 'expense') {
      const expenseMap = new Map<string, number>();
      baseTxs.filter(tx => tx.type === 'expense' || tx.type === 'loan').forEach(tx => {
        if (!tx.category_id) {
          return;
        }
        expenseMap.set(tx.category_id, (expenseMap.get(tx.category_id) || 0) + tx.amount);
      });
      let items = Array.from(expenseMap.entries());
      items.sort((a, b) => b[1] - a[1]);

      const startIndex = sankeyDrillDown.page * 9;
      const slicedItems = items.slice(startIndex, startIndex + 9);
      const validCategoryIds = new Set(slicedItems.map(i => i[0]));

      baseTxs = baseTxs.filter(tx => (tx.type === 'expense' || tx.type === 'loan') && tx.category_id && validCategoryIds.has(tx.category_id));
    }
    return calculateExpensesByCategory(baseTxs);
  }, [filteredChartTransactions, sankeyDrillDown]);




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

  // SECTION 2: Global Wealth & Debt (Row 1)
  const dashboardStats = useMemo(() => {
    // Row 1: Net Worth, Total Debt, Total Savings

    // PATRIMONIO NETO: Dinero en cuentas, dinero que le deben y ahorros con sus rendimientos.
    // Calculations: non-credit accounts (balance) + loans 'lent' (remaining)
    const nonCreditAccounts = paymentMethods.filter(pm => pm.type !== 'credit');
    const moneyInAccounts = nonCreditAccounts.reduce((sum, pm) => sum + pm.balance, 0);
    const moneyLent = loans.filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.total_amount - l.paid_amount), 0);
    const netWorth = moneyInAccounts + moneyLent;

    // DEUDA TOTAL: Deudas totales, creditos y dinero que debe.
    // Calculations: loans 'borrowed' (remaining) + credit card balances
    const moneyBorrowed = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.total_amount - l.paid_amount), 0);
    const creditBalances = paymentMethods.filter(pm => pm.type === 'credit').reduce((sum, pm) => sum + pm.balance, 0);
    const totalDebt = moneyBorrowed + creditBalances;

    // AHORROS TOTALES: Solo los valores que se encuentran en cuentas de ahorro y tarjetas designadas como ahorros con sus rendimientos.
    const totalSavings = paymentMethods.filter(pm => pm.is_savings_account).reduce((sum, pm) => sum + pm.balance, 0);

    // Row 2: Monthly Stats
    const now = new Date();
    const currentMonth_idx = now.getMonth();
    const currentYear_idx = now.getFullYear();

    const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth_idx && d.getFullYear() === currentYear_idx;
    });

    const monthlyIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyPaidExpenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // GASTOS PENDIENTES: Suma de todas las facturas pendientes y deudas por préstamos.
    // Lógica: Si el préstamo tiene cuotas definidas, se suma el valor prorrateado. Si no, se suma el total restante.
    const pendingLoansSum = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => {
      const remaining = l.total_amount - l.paid_amount;
      if (remaining <= 0) return sum;
      
      // Si tiene cuotas mensuales definidas (>1), sumamos la proporción mensual
      if (l.installments && l.installments > 1) {
        // La cuota mensual es el total dividido por las cuotas
        const standardInstallment = l.total_amount / l.installments;
        return sum + Math.min(standardInstallment, remaining);
      }
      
      // Si es una deuda de un solo pago o sin cuotas definidas, sumamos el total restante
      return sum + remaining;
    }, 0);

    const pendingNonLoanInvoices = pendingInvoices.filter(inv => {
      const amount = Number(inv.amount || 0);
      const cat = (inv.category as string || '').toLowerCase();
      const desc = (inv.description as string || '').toLowerCase();
      
      // 1. Filtrado por palabras clave (robusto contra tildes y caracteres rotos)
      const isLoanRelated = 
        cat.includes('préstamo') || cat.includes('prestamo') || 
        cat.includes('loan') || cat.includes('deuda') || 
        cat.includes('cuota') || cat.includes('crédito') || cat.includes('credito') ||
        cat.includes('banco') ||
        desc.includes('cuota') || desc.includes('préstamo') || desc.includes('prestamo') ||
        desc.includes('pago banco') || desc.includes('amortización') || desc.includes('amortizacion') ||
        desc.includes('interés') || desc.includes('interes') || desc.includes('crédito') || desc.includes('credito') ||
        desc.includes('pago de deuda');
      
      if (isLoanRelated) return false;

      // 2. Filtrado por monto y sync_code: 
      // Si tenemos un sync_code, la deduplicación es exacta.
      const invSyncCode = (inv.sync_code as string) || (inv.message_id as string);
      const isDuplicateOfLoan = loans.some(l => {
        if (l.type !== 'borrowed') return false;
        
        // Prioridad: Coincidencia por sync_code (o message_id como fallback de Gmail)
        if (invSyncCode && (l.sync_code === invSyncCode || l.id === invSyncCode)) return true;

        // Heurística de monto:
        if (Math.abs(l.total_amount - amount) < 1) return true;
        if (l.installments && l.installments > 1) {
          const installment = l.total_amount / l.installments;
          if (Math.abs(installment - amount) < 1) return true;
        }
        return false;
      });

      return !isDuplicateOfLoan;
    });

    const monthlyPendingExpenses = pendingNonLoanInvoices.reduce((sum: number, inv) => sum + Number(inv.amount || 0), 0) + pendingLoansSum;

    const monthlyBalance = monthlyIncome - (monthlyPaidExpenses + monthlyPendingExpenses);

    return {
      netWorth,
      totalDebt,
      totalSavings,
      monthlyIncome,
      monthlyPaidExpenses,
      monthlyPendingExpenses,
      monthlyBalance
    };
  }, [paymentMethods, loans, transactions, pendingInvoices]);

  return (
    <div className="flex flex-col gap-8 pt-2 pb-6 antialiased">
      {/* SECTION 0: Global Alerts */}
      {!isAlertHidden && incompleteTransactions.length > 0 && (
        <div className="bg-orange-50/50 border border-orange-200/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center p-1">
              <AlertCircle className="w-5 h-5 text-orange-600" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-base sm:text-lg font-bold text-orange-900 tracking-tight leading-none">
                Acción requerida
              </p>
              <p className="text-sm text-orange-700 mt-1 font-medium leading-tight">
                Tienes {incompleteTransactions.length} transacciones sin categoría o método de pago.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800 bg-white/50 backdrop-blur-sm shadow-sm gap-2"
              onClick={() => {
                hideGlobalAlert();
                navigate('/history?reclassify=true');
              }}
            >
              Corregir ahora <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-orange-700/70 hover:bg-orange-100 hover:text-orange-800"
              onClick={hideGlobalAlert}
            >
              Archivar
            </Button>
          </div>
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


      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center p-1">
              <Wallet className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                Mis Cuentas
              </p>
            </div>
          </div>
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

      {/* SECTION 2: Resumen General */}
      <div className="flex flex-col gap-8">
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 items-center justify-center p-1">
            <CalendarIcon className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
              Resumen General
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(7)].map((_, i) => (
              <CardSkeleton key={i} height="130px" padding="1.5rem">
                <PulseBlock height="1rem" width="60%" className="mb-3" />
                <PulseBlock height="2rem" width="80%" />
              </CardSkeleton>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* ROW 1: 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
              <SummaryCard
                title="Patrimonio neto"
                amount={dashboardStats.netWorth}
                icon={Wallet}
                variant="positive"
              />
              <SummaryCard
                title="Deuda total"
                amount={dashboardStats.totalDebt}
                icon={DollarSign}
                variant="negative"
              />
              <SummaryCard
                title="Ahorros totales"
                amount={dashboardStats.totalSavings}
                icon={PiggyBank}
                variant="positive"
              />
            </div>

            {/* ROW 2: 4 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard
                title="Ingresos del mes"
                amount={dashboardStats.monthlyIncome}
                icon={TrendingUp}
                variant="positive"
              />
              <SummaryCard
                title="Gastos del mes"
                amount={dashboardStats.monthlyPaidExpenses}
                icon={TrendingDown}
                variant="neutral"
              />
              <SummaryCard
                title="Gastos pendientes"
                amount={dashboardStats.monthlyPendingExpenses}
                icon={AlertCircle}
                variant="warning"
              />
              <SummaryCard
                title="Balance del Mes"
                amount={dashboardStats.monthlyBalance}
                icon={BarChart3}
                variant={dashboardStats.monthlyBalance >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Herramientas de Análisis y Detalles */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-8">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center p-1">
              <BarChart3 className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                Análisis Visual
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                <div className="flex flex-col gap-0">
                  <div className="bg-gray-50/50 dark:bg-muted/20 rounded-t-2xl border border-border p-6 pb-4 flex flex-col gap-4 transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight">
                          {activeTab === 'evolution' ? 'Evolución Histórica' : 'Flujo de Caja'}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium">
                          {activeTab === 'evolution'
                            ? 'Comportamiento de ingresos, gastos y balance neto'
                            : 'Visualización detallada de entradas y salidas de dinero'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-border/50 pt-4">
                      <div className="inline-flex p-1 bg-white/50 dark:bg-background/20 rounded-full border border-border backdrop-blur-sm shadow-sm">
                        <Button
                          variant={activeTab === 'evolution' ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            "rounded-full px-6 h-8 text-[11px] font-bold uppercase tracking-wider transition-all",
                            activeTab === 'evolution'
                              ? "bg-white dark:bg-background text-primary shadow-sm ring-1 ring-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                          )}
                          onClick={() => setActiveTab('evolution')}
                        >
                          Evolución
                        </Button>
                        <Button
                          variant={activeTab === 'sankey' ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            "rounded-full px-6 h-8 text-[11px] font-bold uppercase tracking-wider transition-all",
                            activeTab === 'sankey'
                              ? "bg-white dark:bg-background text-primary shadow-sm ring-1 ring-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                          )}
                          onClick={() => setActiveTab('sankey')}
                        >
                          Flujo (Sankey)
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center bg-white dark:bg-background/40 border border-border rounded-full p-0.5 shadow-sm">
                          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[110px] h-8 border-none bg-transparent rounded-full text-[11px] font-bold uppercase tracking-tight focus:ring-0 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border shadow-xl">
                              {availableMonths.map(m => (
                                <SelectItem key={m.value} value={m.value} className="text-[11px] font-medium focus:bg-primary/5">{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="w-[1px] h-4 bg-border mx-1" />

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 bg-transparent gap-2 rounded-full text-[11px] font-bold uppercase tracking-tight hover:bg-black/5 dark:hover:bg-white/5">
                                {selectedYears.length === availableYears.length ? 'Todos los Años' : `${selectedYears.length} Años`}
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px] rounded-xl border-border shadow-xl">
                              <DropdownMenuLabel className="text-[11px] font-bold px-3 py-2 uppercase tracking-wider text-muted-foreground">Seleccionar Años</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border/20" />
                              <DropdownMenuCheckboxItem
                                checked={selectedYears.length === availableYears.length}
                                onCheckedChange={handleToggleAllYears}
                                className="text-xs rounded-lg mx-1 focus:bg-primary/5"
                              >
                                Todos
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuSeparator className="bg-border/20" />
                              {availableYears.map(year => (
                                <DropdownMenuCheckboxItem
                                  key={year}
                                  checked={selectedYears.includes(year)}
                                  onCheckedChange={() => {
                                    const newYears = selectedYears.includes(year)
                                      ? selectedYears.filter(y => y !== year)
                                      : [...selectedYears, year];
                                    if (newYears.length > 0) setSelectedYears(newYears);
                                  }}
                                  className="text-xs rounded-lg mx-1 focus:bg-primary/5"
                                >
                                  {year}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="bg-gray-50/50 dark:bg-muted/20 rounded-b-2xl border border-border border-t-0 p-6 flex flex-col min-h-[450px] transition-all duration-300">
                    {activeTab === 'evolution' ? (
                      <EvolutionChart
                        transactions={allTransactions}
                        selectedYears={selectedYears}
                        onSelectedYearsChange={setSelectedYears}
                        selectedMonth={selectedMonth}
                      />
                    ) : (
                      <SankeyChart
                        transactions={filteredChartTransactions}
                        categories={categories}
                        drillDown={sankeyDrillDown}
                        onDrillDownChange={setSankeyDrillDown}
                      />
                    )}
                  </div>
                </div>
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
                  onSelectAllYears={handleToggleAllYears}
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
