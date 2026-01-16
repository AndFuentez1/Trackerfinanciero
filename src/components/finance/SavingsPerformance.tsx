import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PiggyBank, TrendingUp, Trash2, ArrowUpRight, ArrowDownRight, Pencil, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { AddSavingsAccountDialog } from './AddSavingsAccountDialog';
import { AddSavingsTransactionDialog } from './AddSavingsTransactionDialog';
import { SavingsAccount, SavingsTransaction } from '@/hooks/useSavingsData';

interface AccountPerformance extends SavingsAccount {
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  netContributions: number;
  performancePercent: number;
  transactionCount: number;
}

import { AddTransferDialog } from './AddTransferDialog';

interface SavingsPerformanceProps {
  accounts: SavingsAccount[];
  accountPerformance: AccountPerformance[];
  transactions: SavingsTransaction[];
  totalBalance: number;
  onAddAccount: (account: { name: string; balance?: number; interest_rate?: number }) => Promise<{ error: any }>;
  onDeleteAccount: (id: string) => Promise<void>;
  onAddTransaction: (transaction: Omit<SavingsTransaction, 'id'>) => Promise<{ error: any }>;
  onUpdateTransactionAmount: (id: string, newAmount: number) => Promise<{ error: any }>;
  onUpdateTransactionFull: (id: string, updates: {
    amount?: number;
    date?: string;
    description?: string;
    type?: 'deposit' | 'withdrawal' | 'interest';
    payment_method_id?: string;
  }) => Promise<{ error: any }>;
  onAddTransfer: (fromId: string, toId: string, amount: number, description: string, date: string) => Promise<{ error: any }>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};


export function SavingsPerformance({
  accounts,
  accountPerformance,
  transactions,
  totalBalance,
  onAddAccount,
  onDeleteAccount,
  onAddTransaction,
  onUpdateTransactionAmount,
  onUpdateTransactionFull,
  onAddTransfer,
  onDeleteTransaction
}: SavingsPerformanceProps) {
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    amount: number;
    date: string;
    description: string;
    type: 'deposit' | 'withdrawal' | 'interest';
    payment_method_id: string;
  } | null>(null);

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
    if (!draft) return;
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
  return (
    <div className="space-y-6">
      {/* Header with total */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total en ahorros</p>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <PiggyBank className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <AddSavingsAccountDialog onAdd={onAddAccount} />
        {accounts.length > 0 && (
          <AddSavingsTransactionDialog accounts={accounts} onAdd={onAddTransaction} />
        )}
        <AddTransferDialog onAdd={onAddTransfer} />
      </div>

      {/* Accounts performance */}
      <div className="grid gap-4 md:grid-cols-2 auto-rows-fr">
        {accountPerformance.map(account => (
          <Card key={account.id} className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(account.balance)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteAccount(account.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {account.interest_rate > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    Tasa: {account.interest_rate.toFixed(2)}% anual
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Depósitos</p>
                  <p className="text-lg font-bold text-green-600 tracking-tight">{formatCurrency(account.totalDeposits)}</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Retiros</p>
                  <p className="text-lg font-bold text-red-600 tracking-tight">{formatCurrency(account.totalWithdrawals)}</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Intereses</p>
                  <p className="text-lg font-bold text-primary tracking-tight">{formatCurrency(account.totalInterest)}</p>
                </div>
              </div>


            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <PiggyBank className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No tienes cuentas de ahorro</p>
            <p className="text-sm text-muted-foreground/70 mb-4">
              Crea una cuenta para empezar a registrar tus ahorros
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions (Table) */}
      {transactions.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="w-full overflow-hidden">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/30">
                <tr>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Método de Pago</th>
                  <th className="py-4 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monto</th>
                  <th className="py-4 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">% Rendimiento</th>
                  <th className="py-4 px-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {transactions.slice(0, 20).map((tx, index) => {
                  const account = accounts.find(a => a.id === tx.payment_method_id);
                  const isEditing = editingTxId === tx.id;
                  const toInputDate = (dateStr: string) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    if (isNaN(d.getTime())) return '';
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
                            className="h-8 px-2 text-xs bg-background/50 border rounded-md"
                            value={toInputDate(draft?.date || tx.date)}
                            onChange={(e) => setDraft(d => d ? { ...d, date: e.target.value ?? '' } : d)}
                          />
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                            {formatDate(tx.date)}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3 align-middle">
                        {isEditing ? (
                          <Input
                            value={draft?.description ?? tx.description ?? ''}
                            onChange={(e) => setDraft(d => d ? { ...d, description: e.target.value ?? '' } : d)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-foreground font-medium line-clamp-1 leading-tight">
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
                            <SelectTrigger className="h-8 text-[10px] bg-background/50 hover:bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deposit">Depósito</SelectItem>
                              <SelectItem value="withdrawal">Retiro</SelectItem>
                              <SelectItem value="interest">Interés</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">
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
                              <SelectTrigger className="h-8 text-[10px] bg-background/50 hover:bg-background">
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
                          <span className="text-xs text-muted-foreground truncate font-medium leading-tight block">
                            {account?.name || 'Otro'}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 align-middle text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-8 text-xs font-bold border-primary w-[8rem] ml-auto text-right"
                            value={draft?.amount ?? tx.amount}
                            onChange={(e) => setDraft(d => d ? { ...d, amount: Number(e.target.value) || 0 } : d)}
                          />
                        ) : (
                          <span className={cn(
                            "text-sm font-bold tabular-nums",
                            tx.type === 'withdrawal' ? 'text-rose-600' : 'text-emerald-600'
                          )}>
                            {tx.type === 'withdrawal' ? '-' : '+'}
                            {formatCurrency(tx.amount)}
                          </span>
                        )}
                      </td>

                      {/* Yield/Rendimiento */}
                      <td className="py-2.5 px-3 align-middle text-right">
                        <span 
                          className={`text-xs font-semibold tabular-nums ${
                            tx.type === 'interest' ? 'text-emerald-600' : 'text-muted-foreground/60'
                          }`} 
                          style={{ fontStyle: 'normal' }}
                        >
                          {tx.calculated_yield !== null && tx.calculated_yield !== undefined
                            ? `${tx.calculated_yield.toFixed(2)}%`
                            : '0.00%'}
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
                                onClick={() => handleSaveEdit(tx.id)}
                                title="Guardar cambios"
                              >
                                <Check className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
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
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 transition-colors group/edit"
                                onClick={() => handleStartEdit(tx)}
                                title="Editar movimiento"
                              >
                                <Pencil className="h-4 w-4 text-slate-400 group-hover/edit:text-primary transition-colors" />
                              </Button>
                              <Button
                                variant="ghost"
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
    </div>
  );
}