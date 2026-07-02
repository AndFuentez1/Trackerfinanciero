import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { PiggyBank, TrendingUp, TrendingDown, Trash2, ArrowUpRight, ArrowDownRight, Pencil, Check, X, Wallet, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserConfig } from '@/features/finance/hooks/useUserConfig';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from '@/core/utils';
// ¡CORRECCIÓN 1! Aquí agregamos convertToAnnual y convertToMonthly
import { formatYieldPercent, normalizeYieldPeriod, convertToAnnual, convertToMonthly } from '@/features/finance/utils/yieldUtils';
import { AddSavingsAccountDialog } from './AddSavingsAccountDialog';
import { AddSavingsTransactionDialog } from './AddSavingsTransactionDialog';
import type { SavingsAccount, SavingsTransaction } from '@/features/finance/hooks/useSavingsData';
import { DeleteAccountConfirmDialog } from '@/features/finance/payment-methods/components/DeleteAccountConfirmDialog';
import { AddTransferDialog } from '@/features/finance/transactions/components/AddTransferDialog';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';

interface AccountPerformance extends SavingsAccount {
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  netContributions: number;
  performancePercent: number;
  transactionCount: number;
}

interface SavingsPerformanceProps {
  accounts: SavingsAccount[];
  accountPerformance: AccountPerformance[];
  transactions: SavingsTransaction[];
  totalBalance: number;
  onAddAccount: (account: { name: string; balance?: number; savings_goal?: number; estimated_yield?: number; yield_period?: 'annual' | 'monthly' }) => Promise<{ error: unknown }>;
  onDeleteAccount: (id: string, option?: 'delete' | 'orphan' | 'transfer', transferToId?: string) => Promise<void>;
  onEdit: (id: string) => void;
  onAddTransaction: (transaction: Omit<SavingsTransaction, 'id'>) => Promise<{ error: unknown }>;
  onUpdateTransactionAmount: (id: string, newAmount: number) => Promise<{ error: unknown }>;
  onUpdateTransactionFull: (id: string, updates: {
    amount?: number;
    date?: string;
    description?: string;
    type?: 'deposit' | 'withdrawal' | 'interest';
    payment_method_id?: string;
    savings_account_id?: string;
  }) => Promise<{ error: unknown }>;
  onAddTransfer: (args: { fromId: string; toId: string; amount: number; description: string; date: string }) => Promise<{ error: unknown }>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) { return ''; }
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const month = months[date.getMonth()] || '';
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

export function SavingsPerformance({
  accounts,
  accountPerformance,
  transactions,
  totalBalance,
  onAddAccount,
  onDeleteAccount,
  onEdit,
  onAddTransaction,
  onUpdateTransactionAmount,
  onUpdateTransactionFull,
  onAddTransfer,
  onDeleteTransaction
}: SavingsPerformanceProps) {
  const decimalPlaces = useDecimalPlaces();
  const { formatCurrencySmall: formatCurrency, currency } = useFormatCurrency();
  const { currency: ctxCurrency } = useFinance();
  const { user } = useAuth();
  const { config, updateConfig } = useUserConfig(user?.id);
  const viewMode = config.savings_view_mode || 'monthly';

  const formatCurrencyCard70 = (value: number) => {
    const currCode = ctxCurrency || currency || 'COP';
    const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;
    const decimals = decimalPlaces;

    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      currencyDisplay: 'code',
    }).format(value).replace(currCode, symbol);

    if (decimals === 0) {
      return (
        <span className="inline-flex items-baseline gap-1">
          <span style={{ fontSize: '0.7em' }}>{symbol}</span>
          <span>{formatted.replace(symbol, '').trim()}</span>
        </span>
      );
    }

    const parts = formatted.split(',');
    if (parts.length === 1) { return formatted; }

    const integerPart = parts[0].replace(symbol, '').trim();
    const decimalPart = parts[1];

    return (
      <span className="inline-flex items-baseline gap-[2px]">
        <span style={{ fontSize: '0.7em' }}>{symbol}</span>
        <span>
          {integerPart}
          <span className="opacity-85" style={{ fontSize: '0.7em' }}>,{decimalPart}</span>
        </span>
      </span>
    );
  };

  const formatCurrencyAccount80 = (value: number) => {
    const currCode = ctxCurrency || currency || 'COP';
    const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;
    const decimals = decimalPlaces;

    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      currencyDisplay: 'code',
    }).format(value).replace(currCode, symbol);

    if (decimals === 0) {
      return (
        <span className="inline-flex items-baseline gap-1">
          <span style={{ fontSize: '0.8em' }}>{symbol}</span>
          <span>{formatted.replace(symbol, '').trim()}</span>
        </span>
      );
    }

    const parts = formatted.split(',');
    if (parts.length === 1) { return formatted; }

    const integerPart = parts[0].replace(symbol, '').trim();
    const decimalPart = parts[1];

    return (
      <span className="inline-flex items-baseline gap-[2px]">
        <span style={{ fontSize: '0.8em' }}>{symbol}</span>
        <span>
          {integerPart}
          <span className="opacity-85" style={{ fontSize: '0.8em' }}>,{decimalPart}</span>
        </span>
      </span>
    );
  };

  const formatCurrencyTable90 = (value: number) => {
    const currCode = ctxCurrency || currency || 'COP';
    const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;
    const decimals = decimalPlaces;

    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      currencyDisplay: 'code',
    }).format(value).replace(currCode, symbol);

    if (decimals === 0) {
      return (
        <span className="inline-flex items-baseline gap-1">
          <span style={{ fontSize: '0.8em' }}>{symbol}</span>
          <span>{formatted.replace(symbol, '').trim()}</span>
        </span>
      );
    }

    const parts = formatted.split(',');
    if (parts.length === 1) { return formatted; }

    const integerPart = parts[0].replace(symbol, '').trim();
    const decimalPart = parts[1];

    return (
      <span className="inline-flex items-baseline gap-[2px]">
        <span style={{ fontSize: '0.8em' }}>{symbol}</span>
        <span>
          {integerPart}
          <span className="opacity-85" style={{ fontSize: '0.8em' }}>,{decimalPart}</span>
        </span>
      </span>
    );
  };

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    amount: number;
    date: string;
    description: string;
    type: 'deposit' | 'withdrawal' | 'interest';
    payment_method_id: string;
    savings_account_id: string;
  } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null);

  // Estados de filtrado/ordenación de la tabla de movimientos
  const [txSearchTerm, setTxSearchTerm] = useState<string>('');
  const [txFilterType, setTxFilterType] = useState<'all' | 'deposit' | 'withdrawal' | 'interest'>('all');
  const [txFilterAccount, setTxFilterAccount] = useState<string>('all');
  const [txSortField, setTxSortField] = useState<'date' | 'description' | 'type' | 'amount' | null>('date');
  const [txSortDirection, setTxSortDirection] = useState<'asc' | 'desc'>('desc');
  const [txShowAll, setTxShowAll] = useState<boolean>(false);
  const TX_PAGE_SIZE = 20;

  const processedTransactions = useMemo(() => {
    let items = [...transactions];

    if (txFilterType !== 'all') {
      items = items.filter(t => t.type === txFilterType);
    }
    if (txFilterAccount !== 'all') {
      items = items.filter(t => t.payment_method_id === txFilterAccount);
    }
    if (txSearchTerm.trim() !== '') {
      const term = txSearchTerm.toLowerCase();
      items = items.filter(t => (t.description || '').toLowerCase().includes(term));
    }
    if (txSortField) {
      items.sort((a, b) => {
        let valA: any;
        let valB: any;
        switch (txSortField) {
          case 'date': valA = a.date; valB = b.date; break;
          case 'description': valA = a.description || ''; valB = b.description || ''; break;
          case 'type': valA = a.type; valB = b.type; break;
          case 'amount': valA = a.amount; valB = b.amount; break;
          default: valA = 0; valB = 0;
        }
        if (typeof valA === 'string') {
          return txSortDirection === 'asc'
            ? valA.localeCompare(valB, 'es', { sensitivity: 'base' })
            : valB.localeCompare(valA, 'es', { sensitivity: 'base' });
        }
        return txSortDirection === 'asc' ? valA - valB : valB - valA;
      });
    }
    return items;
  }, [transactions, txFilterType, txFilterAccount, txSearchTerm, txSortField, txSortDirection]);

  const visibleTransactions = txShowAll ? processedTransactions : processedTransactions.slice(0, TX_PAGE_SIZE);

  const handleTxSort = (field: 'date' | 'description' | 'type' | 'amount') => {
    if (txSortField === field) {
      setTxSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTxSortField(field);
      setTxSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const renderTxSortIcon = (field: 'date' | 'description' | 'type' | 'amount') => {
    if (txSortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 hover:opacity-100 transition-opacity inline" />;
    }
    return txSortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary inline" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary inline" />;
  };

  const handleStartEdit = (tx: SavingsTransaction) => {
    setEditingTxId(tx.id);
    setDraft({
      amount: tx.amount,
      date: tx.date,
      description: tx.description || '',
      type: tx.type,
      payment_method_id: tx.payment_method_id,
      savings_account_id: tx.savings_account_id || tx.payment_method_id,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!draft) { return; }
    const amount = Number(draft.amount) || 0;
    if (amount <= 0) {
      return; 
    }
    const updates = {
      amount: amount,
      date: draft.date,
      description: draft.description,
      type: draft.type,
      payment_method_id: draft.payment_method_id,
      // FIX BUG-02: usar el savings_account_id correcto del draft, no el payment_method_id
      savings_account_id: draft.savings_account_id || draft.payment_method_id,
    };
    const { error } = await onUpdateTransactionFull(id, updates);
    if (!error) {
      setEditingTxId(null);
      setDraft(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    setDraft(null);
  };

  const parseDate = (d: string) => new Date(d + 'T00:00:00');

  const getInitialBalance = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) { return 0; }

    let balance = account.balance;
    // FIX BUG-05: los signos estaban invertidos. Para obtener el saldo histórico,
    // se revierten los depósitos/intereses (restándolos) y se revierten los retiros (sumándolos).
    transactions
      .filter(t => t.payment_method_id === accountId)
      .forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'deposit' || t.type === 'interest') { balance -= amt; }
        else if (t.type === 'withdrawal') { balance += amt; }
      });
    return balance;
  };

  const getDepositsAccumulated = (accountId: string, beforeDate: string) => {
    const cutoff = parseDate(beforeDate).getTime();
    return transactions
      .filter(t => t.payment_method_id === accountId && t.type === 'deposit' && parseDate(t.date).getTime() < cutoff)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  };

  const getBalanceBeforeInterest = (accountId: string, beforeDate: string) => {
    const cutoff = parseDate(beforeDate).getTime();
    const initialBalance = getInitialBalance(accountId);
    let deposits = 0, withdrawals = 0, interests = 0;
    transactions
      .filter(t => t.payment_method_id === accountId && parseDate(t.date).getTime() < cutoff)
      .forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'deposit') { deposits += amt; }
        else if (t.type === 'withdrawal') { withdrawals += amt; }
        else if (t.type === 'interest') { interests += amt; }
      });
    return { balance: initialBalance + deposits - withdrawals + interests, deposits, withdrawals, interests, initialBalance };
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-col p-6 bg-gray-50/50 dark:bg-muted/20 border border-border shadow-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center p-1">
              <PiggyBank className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                Total en ahorros
              </p>
            </div>
          </div>
          <div className="pl-0 space-y-1">
            <div className="text-2xl font-bold text-foreground leading-none">
              <CurrencyDisplay
                amount={totalBalance}
                currencyCode={currency}
              />
            </div>
            <p className="text-[11px] text-muted-foreground font-normal leading-tight">
              {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} activa{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
             <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
               <Button
                 variant="ghost"
                 size="sm"
                 className={cn("h-7 px-3 text-xs rounded-md", viewMode === 'monthly' ? "bg-background shadow-sm" : "")}
                 onClick={() => updateConfig({ savings_view_mode: 'monthly' })}
               >
                 Meses
               </Button>
               <Button
                 variant="ghost"
                 size="sm"
                 className={cn("h-7 px-3 text-xs rounded-md", viewMode === 'annual' ? "bg-background shadow-sm" : "")}
                 onClick={() => updateConfig({ savings_view_mode: 'annual' })}
               >
                 Años
               </Button>
             </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <AddSavingsAccountDialog onAdd={onAddAccount} />
        {accounts.length > 0 && (
          <AddSavingsTransactionDialog accounts={accounts} onAdd={onAddTransaction} />
        )}
        {accounts.length > 0 && (
          <AddTransferDialog onAdd={onAddTransfer} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 auto-rows-fr">
        {accountPerformance.map(account => (
          <Card key={account.id} className="savings-card h-full border-border bg-gray-50/50 dark:bg-muted/20">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1 pb-2">
                  <p className="text-base sm:text-lg font-bold text-muted-foreground tracking-tight leading-none">{account.name}</p>
                  <div className="text-2xl font-bold text-foreground leading-none mt-1">
                    <CurrencyDisplay
                      amount={account.balance}
                      currencyCode={currency}
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-background border border-primary text-primary hover:bg-primary/10 hover:text-primary shadow-sm rounded-xl"
                    onClick={() => onEdit(account.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-background border border-primary text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm rounded-xl"
                    onClick={() => {
                      setAccountToDelete({ id: account.id, name: account.name });
                      setIsDeleteConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                // ¡CORRECCIÓN 2! Calculamos el yield estimado ANTES del if, para que se use siempre
                const interestRate = account.interest_rate || 0;
                const yieldPeriod = account.yield_period || 'annual';
                
                let estimatedYield = 0;
                if (viewMode === 'annual') {
                  estimatedYield = convertToAnnual(interestRate, normalizeYieldPeriod(yieldPeriod));
                } else {
                  estimatedYield = convertToMonthly(interestRate, normalizeYieldPeriod(yieldPeriod));
                }

                // Cálculo de yield real (Solo si hay transacciones)
                const accountTxs = transactions.filter(t => t.payment_method_id === account.id);
                const interestTxs = accountTxs.filter(t => t.type === 'interest');
                let realReturnElement = null;

                if (interestTxs.length > 0) {
                  const lastInterest = interestTxs[0];
                  const depositsAccumulated = getDepositsAccumulated(account.id, lastInterest.date);
                  const balanceData = getBalanceBeforeInterest(account.id, lastInterest.date);
                  const balanceBeforeInterest = balanceData.balance;
                  const denominator = depositsAccumulated + balanceBeforeInterest;
                  
                  let realYield = denominator > 0 ? (lastInterest.amount / denominator) * 100 : 0;

                  if (viewMode === 'annual') {
                    realYield *= 12; // Extrapolación simple a anual
                  }
                  
                  realReturnElement = (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-muted-foreground/80">
                        Rentabilidad Real: <span className="font-semibold text-foreground">{formatYieldPercent(realYield)} {viewMode === 'annual' ? 'anual' : 'mensual'}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <>
                    {account.interest_rate > 0 && (
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <span className="text-muted-foreground/80">
                          {/* ¡CORRECCIÓN 3! Ahora SÍ usamos estimatedYield aquí */}
                          Rentabilidad estimada: <span className="font-semibold text-foreground">{formatYieldPercent(estimatedYield)}  {viewMode === 'annual' ? 'anual' : 'mensual'}</span>
                        </span>
                      </div>
                    )}
                    {realReturnElement}
                  </>
                );
              })()}

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-card border border-border/40 rounded-xl p-2">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Depósitos</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-lg font-bold text-foreground tracking-tight">{formatCurrencyAccount80(account.totalDeposits)}</p>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
                <div className="bg-card border border-border/40 rounded-xl p-2">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Retiros</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-lg font-bold text-foreground tracking-tight">{formatCurrencyAccount80(account.totalWithdrawals)}</p>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </div>
                </div>
                <div className="bg-card border border-arquitectura-2/20 rounded-xl p-2">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Intereses</p>
                  <p className="text-lg font-bold text-primary tracking-tight">{formatCurrencyAccount80(account.totalInterest)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card className="bg-gray-50/50 dark:bg-muted/20 border border-border shadow-sm transition-all duration-300">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <PiggyBank className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No tienes cuentas de ahorro</p>
            <p className="text-base text-muted-foreground/70 mb-4">
              Crea una cuenta para empezar a registrar tus ahorros
            </p>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <div className="bg-gray-50/50 dark:bg-muted/20 rounded-xl border border-border/40 overflow-hidden shadow-md">
          {/* Barra de Filtros Premium */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border-b border-border/30 bg-muted/10">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por descripción..."
                value={txSearchTerm}
                onChange={(e) => setTxSearchTerm(e.target.value)}
                className="pl-9 h-9 w-full bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={txFilterType} onValueChange={(val: any) => setTxFilterType(val)}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="deposit">Depósitos</SelectItem>
                  <SelectItem value="withdrawal">Retiros</SelectItem>
                  <SelectItem value="interest">Intereses</SelectItem>
                </SelectContent>
              </Select>
              {accounts.length > 1 && (
                <Select value={txFilterAccount} onValueChange={(val) => setTxFilterAccount(val)}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="Cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {processedTransactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm font-medium">
              No se encontraron movimientos con estos filtros.
            </div>
          ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-muted/40 to-muted/20">
                <tr>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30 cursor-pointer select-none hover:bg-muted/60 transition-colors" onClick={() => handleTxSort('date')}>
                    <span className="inline-flex items-center justify-center">Fecha {renderTxSortIcon('date')}</span>
                  </th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30 cursor-pointer select-none hover:bg-muted/60 transition-colors" onClick={() => handleTxSort('description')}>
                    <span className="inline-flex items-center justify-center">Descripción {renderTxSortIcon('description')}</span>
                  </th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30 cursor-pointer select-none hover:bg-muted/60 transition-colors" onClick={() => handleTxSort('type')}>
                    <span className="inline-flex items-center justify-center">Tipo {renderTxSortIcon('type')}</span>
                  </th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Cuenta</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30 cursor-pointer select-none hover:bg-muted/60 transition-colors" onClick={() => handleTxSort('amount')}>
                    <span className="inline-flex items-center justify-center">Monto {renderTxSortIcon('amount')}</span>
                  </th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">% Rendimiento</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {visibleTransactions.map((tx, index) => {
                  const account = accounts.find(a => a.id === tx.payment_method_id);
                  const isEditing = editingTxId === tx.id;
                  const toInputDate = (dateStr: string) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    if (isNaN(d.getTime())) { return ''; }
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                  };
                  return (
                    <tr
                      key={tx.id}
                      className={cn(
                        'transition-all duration-200 group hover:bg-muted/30',
                        isEditing && 'bg-primary/5 hover:bg-primary/10'
                      )}
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <td className="py-2.5 px-2 align-middle text-center">
                        {isEditing ? (
                          <input
                            type="date"
                            className="h-8 px-2 text-sm bg-background/50 border rounded-xl"
                            value={toInputDate(draft?.date || tx.date)}
                            onChange={(e) => setDraft(d => d ? { ...d, date: e.target.value ?? '' } : d)}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                            {formatDate(tx.date)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-center">
                        {isEditing ? (
                          <Input
                            value={draft?.description ?? tx.description ?? ''}
                            onChange={(e) => setDraft(d => d ? { ...d, description: e.target.value ?? '' } : d)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <div className="flex items-center justify-center">
                            <span className="text-sm text-foreground font-medium line-clamp-1 leading-tight">
                              {tx.description || ''}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-center">
                        {isEditing ? (
                          <Select
                            value={draft?.type || tx.type}
                            onValueChange={(v) => setDraft(d => d ? { ...d, type: v as 'deposit' | 'withdrawal' | 'interest' } : d)}
                          >
                            <SelectTrigger className="h-8 text-sm bg-background/50 hover:bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deposit">Depósito</SelectItem>
                              <SelectItem value="withdrawal">Retiro</SelectItem>
                              <SelectItem value="interest">Interés</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground font-medium">
                            {tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdrawal' ? 'Retiro' : 'Interés'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-center">
                        {isEditing ? (
                          <div className="mx-auto max-w-[140px]">
                            <Select
                              onValueChange={(v) => setDraft(d => d ? { ...d, payment_method_id: v } : d)}
                              value={draft?.payment_method_id || tx.payment_method_id}
                            >
                              <SelectTrigger className="h-8 text-sm bg-background/50 hover:bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map(a => (
                                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground truncate font-medium leading-tight block">
                            {account?.name || 'Otro'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-8 text-sm font-bold border-input w-[8rem] mx-auto text-center"
                            value={draft?.amount ?? tx.amount}
                            onChange={(e) => setDraft(d => d ? { ...d, amount: Number(e.target.value) || 0 } : d)}
                          />
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1">
                            <span className={cn("font-bold", tx.type === 'withdrawal' ? 'text-rose-600' : 'text-emerald-600')}>
                              {tx.type === 'withdrawal' ? '-' : '+'}
                            </span>
                            <span className="text-sm text-foreground font-medium tabular-nums">
                              {formatCurrencyTable90(tx.amount)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-middle text-center">
                        {(() => {
                          const depositsAccumulated = getDepositsAccumulated(tx.payment_method_id, tx.date);
                          const balanceData = getBalanceBeforeInterest(tx.payment_method_id, tx.date);
                          const balanceBeforeInterest = balanceData.balance;
                          const denominator = depositsAccumulated + balanceBeforeInterest;
                          const isInterest = tx.type === 'interest';
                          let yieldPercent = isInterest && denominator > 0 ? (tx.amount / denominator) * 100 : 0;

                          if (isInterest && viewMode === 'annual') {
                            yieldPercent *= 12;
                          }

                          return (
                            <span
                              className={`text-sm font-semibold tabular-nums ${isInterest ? 'text-emerald-600' : 'text-muted-foreground/60'
                                }`}
                              style={{ fontStyle: 'normal' }}
                            >
                              {yieldPercent < 1 && yieldPercent > 0
                                ? `<${formatYieldPercent(1)}`
                                : formatYieldPercent(yieldPercent)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-2 align-middle text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 transition-colors"
                                onClick={() => handleSaveEdit(tx.id)}
                                title="Guardar cambios"
                              >
                                <Check className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted/50 transition-colors"
                                onClick={handleCancelEdit}
                                title="Cancelar edición"
                              >
                                <X className="h-4 w-4 text-slate-400" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 transition-colors group/edit"
                                onClick={() => handleStartEdit(tx)}
                                title="Editar movimiento"
                              >
                                <Pencil className="h-4 w-4 text-slate-400 group-hover/edit:text-primary transition-colors" />
                              </Button>
                              <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/10 transition-colors group/del"
                                onClick={() => onDeleteTransaction(tx.id)}
                                title="Eliminar movimiento"
                              >
                                <Trash2 className="h-4 w-4 text-slate-400 group-hover/del:text-destructive transition-colors" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
          {/* Pie de tabla: Ver más / Ver menos */}
          {processedTransactions.length > TX_PAGE_SIZE && (
            <div className="p-4 border-t border-border/30 text-center">
              <button
                type="button"
                onClick={() => setTxShowAll(prev => !prev)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/70 transition-colors focus:outline-none"
              >
                {txShowAll ? (
                  <><ArrowUp className="h-4 w-4" /> Ver menos</>
                ) : (
                  <><ArrowDown className="h-4 w-4" /> Ver más ({processedTransactions.length - TX_PAGE_SIZE} restantes)</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      {accountToDelete && (
        <DeleteAccountConfirmDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          accountId={accountToDelete.id}
          accountName={accountToDelete.name}
          paymentMethods={accounts}
          isSavings={true}
          onConfirm={async (option, transferToId) => {
            await onDeleteAccount(accountToDelete.id, option, transferToId);
            setAccountToDelete(null);
          }}
        />
      )}
    </div>
  );
}