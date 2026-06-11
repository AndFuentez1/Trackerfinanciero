import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { PiggyBank, TrendingUp, TrendingDown, Trash2, ArrowUpRight, ArrowDownRight, Pencil, Check, X, Wallet } from 'lucide-react';
import { useState } from 'react';
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
import { AddSavingsAccountDialog } from './AddSavingsAccountDialog';
import { AddSavingsTransactionDialog } from './AddSavingsTransactionDialog';
import type { SavingsAccount, SavingsTransaction } from '@/features/finance/hooks/useSavingsData';
import { DeleteAccountConfirmDialog } from '@/features/finance/payment-methods/components/DeleteAccountConfirmDialog';

interface AccountPerformance extends SavingsAccount {
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  netContributions: number;
  performancePercent: number;
  transactionCount: number;
}

import { AddTransferDialog } from '@/features/finance/transactions/components/AddTransferDialog';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';

interface SavingsPerformanceProps {
  accounts: SavingsAccount[];
  accountPerformance: AccountPerformance[];
  transactions: SavingsTransaction[];
  totalBalance: number;
  onAddAccount: (account: { name: string; balance?: number; savings_goal?: number; estimated_yield?: number }) => Promise<{ error: unknown }>;
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
  } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleStartEdit = (tx: SavingsTransaction) => {
    setEditingTxId(tx.id);
    setDraft({
      amount: tx.amount,
      date: tx.date,
      description: tx.description || '',
      type: tx.type,
      payment_method_id: tx.payment_method_id,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!draft) { return; }
    const amount = Number(draft.amount) || 0;
    if (amount <= 0) {
      return; // Prevent saving with invalid amount
    }
    const updates = {
      amount: amount,
      date: draft.date,
      description: draft.description,
      type: draft.type,
      payment_method_id: draft.payment_method_id,
      savings_account_id: draft.payment_method_id,
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

  // Yield calculation per spec:
  // Yield = Interest / (Deposits_accumulated + Balance_before_interest)
  // Where:
  // - Deposits_accumulated = sum of TRANSACTION deposits only (excluding initial balance, interests, withdrawals)
  // - Balance_before_interest = initial_balance + transaction_deposits - withdrawals + interests_before_current
  const parseDate = (d: string) => new Date(d + 'T00:00:00');

  // Compute initial balance by reversing all transactions from current balance
  const getInitialBalance = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) { return 0; }

    let balance = account.balance;
    transactions
      .filter(t => t.payment_method_id === accountId)
      .forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'withdrawal') { balance += amt; } // reverse withdrawal
        else { balance -= amt; } // reverse deposit/interest
      });
    return balance;
  };

  const getDepositsAccumulated = (accountId: string, beforeDate: string) => {
    const cutoff = parseDate(beforeDate).getTime();
    // Only count transaction deposits, NOT initial balance
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
      {/* Header with total */}
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
        </div>
      </Card>

      {/* Actions */}
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
              {account.interest_rate > 0 && (
                <div className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Rentabilidad estimada: {account.interest_rate.toFixed(decimalPlaces)}%
                  </span>
                </div>
              )}

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

      {/* Recent transactions (Table) */}
      {transactions.length > 0 && (
        <div className="bg-gray-50/50 dark:bg-muted/20 rounded-xl border border-border/40 overflow-hidden shadow-md">
          <div className="w-full overflow-hidden">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-muted/40 to-muted/20">
                <tr>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Fecha</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Descripción</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Tipo</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Método de Pago</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Monto</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">% Rendimiento</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {transactions.slice(0, 20).map((tx, index) => {
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
                      {/* Date */}
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

                      {/* Description */}
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

                      {/* Type */}
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

                      {/* Método de Pago */}
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

                      {/* Amount */}
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

                      {/* Yield/Rendimiento */}
                      <td className="py-2.5 px-3 align-middle text-center">
                        {(() => {
                          const depositsAccumulated = getDepositsAccumulated(tx.payment_method_id, tx.date);
                          const balanceData = getBalanceBeforeInterest(tx.payment_method_id, tx.date);
                          const balanceBeforeInterest = balanceData.balance;
                          const denominator = depositsAccumulated + balanceBeforeInterest;
                          const isInterest = tx.type === 'interest';
                          const yieldPercent = isInterest && denominator > 0 ? (tx.amount / denominator) * 100 : 0;

                          return (
                            <span
                              className={`text-sm font-semibold tabular-nums ${isInterest ? 'text-emerald-600' : 'text-muted-foreground/60'
                                }`}
                              style={{ fontStyle: 'normal' }}
                            >
                              {yieldPercent < 1 && yieldPercent > 0
                                ? `<${(1).toFixed(decimalPlaces).replace('.', ',')}%`
                                : `${yieldPercent.toFixed(decimalPlaces)}%`}
                            </span>
                          );
                        })()}
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
          {transactions.length > 20 && (
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center text-xs text-muted-foreground/60 font-medium">
              Mostrando los últimos 20 movimientos
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







