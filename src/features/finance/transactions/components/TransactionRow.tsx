import { memo, useState } from 'react';
import type { Transaction, PaymentMethod, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { AddCategoryDialog } from '@/features/finance/categories/components/AddCategoryDialog';
import {
    Trash2,
    CreditCard,
    AlertCircle,
    Pencil,
    Check,
    X
} from 'lucide-react'; // Ensure Lucide icons
import { cn, getCurrencySymbol } from '@/core/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import { typeStyles, typeLabels } from './constants';

type TransactionDraft = {
    description: string;
    amount: number;
    category_id: string | null;
    payment_method_id: string | null;
    date: string;
};

interface TransactionRowProps {
    transaction: Transaction;
    isEditing: boolean;
    draft: TransactionDraft | null;
    paymentMethods: PaymentMethod[];
    categories: CategoryItem[];
    highlightOrphaned: boolean;
    currency: string;
    onStartEdit: (t: Transaction) => void;
    onCancelEdit: () => void;
    onSaveEdit: (t: Transaction) => void;
    onDelete: (id: string) => void;
    onUpdate?: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<{ error?: unknown } | void>;
    onDraftChange: (updates: Partial<TransactionDraft>) => void;
}

export const TransactionRow = memo(({
    transaction,
    isEditing,
    draft,
    paymentMethods,
    categories,
    highlightOrphaned,
    currency,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onUpdate,
    onDraftChange
}: TransactionRowProps) => {
    const decimalPlaces = useDecimalPlaces();
    const { formatCurrencySmall } = useFormatCurrency();
    const { addCategory } = useFinanceData();
    const [localCategories, setLocalCategories] = useState<CategoryItem[]>([]);

    // Helper logic moved from TransactionList
    const toInputDate = (iso: string) => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) { return ''; }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const formatDate = (dateString: string) => {
        // Fix UTC timezone drift: parse exactly at noon local to prevent UTC offsets shifting dates backwards
        const isLiteralDate = /^\d{4}-\d{2}-\d{2}$/.test((dateString || '').trim());
        const d = isLiteralDate ? new Date(`${dateString}T12:00:00`) : new Date(dateString);
        if (isNaN(d.getTime())) { return ''; }
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const month = months[d.getMonth()] || '';
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    const getPaymentMethodName = (pmId: string | null | undefined) => {
        if (!pmId) { return null; }
        const pm = paymentMethods.find(p => p.id === pmId);
        return pm?.name || null;
    };

    const getCategoryOptionsForType = (type: Transaction['type']) => {
        const allCats = [...categories, ...localCategories];
        if (type === 'transfer_in' || type === 'transfer_out') {
            return allCats.filter(c => (c.type as string) === 'transfer' || c.type === 'transfer_out' || c.type === 'transfer_in');
        }
        return allCats.filter(c => c.type === type);
    };

    const getCategoryDisplay = (t: Transaction) => {
        if (t.type === 'transfer_in' || t.type === 'transfer_out') {
            return { name: 'Transferencia', color: '#6b7280' };
        }

        const categoryItem = categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
        return {
            name: categoryItem?.name || t.category || 'S/C',
            color: categoryItem?.color || '#3b82f6'
        };
    };

    const isNegativeType = (type: Transaction['type']) => type === 'expense' || type === 'transfer_out';

    const pmName = getPaymentMethodName(transaction.payment_method_id);
    const categoryDisplay = getCategoryDisplay(transaction);
    const needsCategory = !(transaction.type === 'transfer_in' || transaction.type === 'transfer_out');
    const isOrphan = (needsCategory && (!transaction.category && !transaction.category_id)) || !transaction.payment_method_id;

    return (
        <tr
            className={cn(
                'border-b border-border transition-all duration-200 group hover:bg-muted/30',
                isEditing && 'bg-primary/5 hover:bg-primary/10',
                isOrphan && 'bg-destructive/5 hover:bg-destructive/10',
                highlightOrphaned && isOrphan && 'border-l-4 border-l-destructive'
            )}
        >
            {/* Date */}
            <td className="py-3 px-4 align-middle text-center border-r border-border" style={{ fontStyle: 'normal' }}>
                {isEditing ? (
                    <input
                        type="date"
                        className="h-8 px-2 text-xs bg-background/50 border rounded-md w-[9rem]"
                        value={toInputDate(draft?.date || transaction.date)}
                        onChange={(e) => onDraftChange({ date: e.target.value })}
                    />
                ) : (
                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap" style={{ fontStyle: 'normal' }}>
                        {formatDate(transaction.date)}
                    </span>
                )}
            </td>

            {/* Description */}
            <td className="py-2.5 px-2 align-middle max-w-[180px] text-center border-r border-border" style={{ fontStyle: 'normal' }}>
                {isEditing ? (
                    <Input
                        value={draft?.description ?? transaction.description}
                        onChange={(e) => onDraftChange({ description: e.target.value })}
                        className="h-8 text-sm max-w-[180px] text-center"
                    />
                ) : (
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-[13px] text-foreground font-medium line-clamp-2 leading-tight text-center" style={{ fontStyle: 'normal' }}>
                            {transaction.description}
                        </span>
                        {isOrphan && (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded whitespace-nowrap" style={{ fontStyle: 'normal' }}>
                                <AlertCircle className="h-3 w-3" />
                                Atención
                            </span>
                        )}
                    </div>
                )}
            </td>

            {/* Type */}
            <td className="py-2.5 px-2 align-middle text-center border-r border-border" style={{ fontStyle: 'normal' }}>
                <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    typeStyles[transaction.type]
                )} style={{ fontStyle: 'normal' }}>
                    {typeLabels[transaction.type]}
                </span>
            </td>

            {/* Category */}
            <td className="py-2.5 px-2 align-middle text-center max-w-[120px] border-r border-border" style={{ fontStyle: 'normal' }}>
                {isEditing ? (
                    <div className="mx-auto max-w-[120px]">
                        <Select
                            onValueChange={(v) => onDraftChange({ category_id: v })}
                            value={draft?.category_id || ''}
                        >
                            <SelectTrigger className="h-8 text-[9px] uppercase font-bold bg-background/50 hover:bg-background">
                                <SelectValue placeholder="Cat." />
                            </SelectTrigger>
                            <SelectContent>
                                {getCategoryOptionsForType(transaction.type).map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                ))}
                                <div className="border-t border-border/50 px-1 py-1 mt-1">
                                    <AddCategoryDialog
                                        type={transaction.type as "expense" | "income" | "saving" | "investment"}
                                        onAdd={addCategory}
                                        onSuccess={(cat) => {
                                            setLocalCategories(prev => [...prev, cat]);
                                            onDraftChange({ category_id: cat.id });
                                        }}
                                    />
                                </div>
                            </SelectContent>
                        </Select>
                    </div>
                ) : onUpdate && (!transaction.category && !transaction.category_id) ? (
                    <div className="mx-auto max-w-[120px]">
                        <Select
                            onValueChange={(v) => {
                                const cat = categories.find(c => c.id === v);
                                onUpdate(transaction.id, {
                                    category_id: v,
                                    category: cat?.name || ''
                                });
                            }}
                            value=""
                        >
                            <SelectTrigger className="h-8 text-[9px] uppercase font-bold border-destructive/30 bg-background/50 hover:bg-background">
                                <SelectValue placeholder="Cat." />
                            </SelectTrigger>
                            <SelectContent>
                                {getCategoryOptionsForType(transaction.type).map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                ))}
                                <div className="border-t border-border/50 px-1 py-1 mt-1">
                                    <AddCategoryDialog
                                        type={transaction.type as "expense" | "income" | "saving" | "investment"}
                                        onAdd={addCategory}
                                        onSuccess={(cat) => {
                                            setLocalCategories(prev => [...prev, cat]);
                                            onUpdate!(transaction.id, { category_id: cat.id, category: cat.name });
                                        }}
                                    />
                                </div>
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="flex items-center justify-center max-w-[120px] mx-auto">
                        <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider line-clamp-2 text-center leading-tight"
                            style={{
                                backgroundColor: (categoryDisplay.color || '#3b82f6') + '20',
                                color: categoryDisplay.color || '#3b82f6',
                                fontStyle: 'normal'
                            }}
                        >
                            {categoryDisplay.name}
                        </span>
                    </div>
                )}
            </td>

            {/* Payment Method */}
            <td className="py-2.5 px-3 align-middle text-center border-r border-border min-w-[140px]">
                {isEditing ? (
                    <div className="mx-auto max-w-[160px]">
                        <Select
                            onValueChange={(v) => onDraftChange({ payment_method_id: v })}
                            value={draft?.payment_method_id || ''}
                        >
                            <SelectTrigger className="h-8 text-[10px] bg-background/50 hover:bg-background">
                                <SelectValue placeholder="Método" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map(pm => (
                                    <SelectItem key={pm.id} value={pm.id} className="text-xs">{pm.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : pmName ? (
                    <div className="flex items-center justify-center gap-1.5 overflow-hidden">
                        <CreditCard className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate text-center font-bold" style={{ fontStyle: 'normal', minWidth: '100px', display: 'inline-block' }}>
                            {(() => {
                                const pm = paymentMethods.find(p => p.id === transaction.payment_method_id);
                                let suffix = '';
                                if (pm) {
                                    switch (pm.type) {
                                        case 'debit': suffix = ' (D)'; break;
                                        case 'credit': suffix = ' (C)'; break;
                                        case 'cash': suffix = ' (E)'; break;
                                        case 'savings': suffix = ' (A)'; break;
                                        default: suffix = '';
                                    }
                                }
                                return pmName + suffix;
                            })()}
                        </span>
                    </div>
                ) : (
                    onUpdate ? (
                        <div className="mx-auto max-w-[140px]">
                            <Select
                                onValueChange={(v) => onUpdate(transaction.id, { payment_method_id: v })}
                                value=""
                            >
                                <SelectTrigger className="h-8 text-[10px] border-destructive/30 bg-background/50 hover:bg-background">
                                    <SelectValue placeholder="Método" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map(pm => (
                                        <SelectItem key={pm.id} value={pm.id} className="text-xs">{pm.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase text-center" style={{ fontStyle: 'normal', minWidth: '100px', display: 'inline-block' }}>Sin desembolso</span>
                    )
                )}
            </td>

            {/* Amount */}
            <td className="py-2.5 px-4 align-middle text-center whitespace-nowrap min-w-[120px] border-r border-arquitectura-2/30" style={{ fontStyle: 'normal' }}>
                {isEditing ? (
                    <MoneyInput
                        className="h-8 text-sm w-[10rem] ml-auto text-right"
                        value={draft?.amount ?? transaction.amount}
                        onChange={(val) => onDraftChange({ amount: val })}
                    />
                ) : (
                    <span className="text-sm font-bold tabular-nums whitespace-nowrap flex items-center justify-center gap-1 text-foreground">
                        <span className={isNegativeType(transaction.type) ? 'text-red-500' : 'text-green-600'} style={{ fontWeight: 700 }}>
                            {isNegativeType(transaction.type) ? '-' : '+'}
                        </span>
                        {(() => {
                            // Usar el símbolo correcto según currency (import directo)
                            const currCode = typeof currency === 'string' ? currency : 'COP';
                            const symbol = getCurrencySymbol(currCode);
                            const decimals = decimalPlaces;
                            const formatted = new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: currCode,
                                minimumFractionDigits: decimals,
                                maximumFractionDigits: decimals,
                                currencyDisplay: 'code',
                            }).format(transaction.amount).replace(currCode, symbol);
                            if (decimals === 0) {
                                return (
                                    <span className="inline-flex items-baseline gap-1">
                                        <span style={{ fontSize: '80%' }}>{symbol}</span>
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
                                    <span style={{ fontSize: '80%' }}>{symbol}</span>
                                    <span>
                                        {integerPart}
                                        <span style={{ fontSize: '80%', opacity: 0.8 }}>,{decimalPart}</span>
                                    </span>
                                </span>
                            );
                        })()}
                    </span>
                )}
            </td>

            {/* Status */}
            <td className="py-2.5 px-3 align-middle text-center" style={{ fontStyle: 'normal' }}>
                <span className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    isOrphan ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800'
                )} style={{ fontStyle: 'normal' }}>
                    {isOrphan ? 'Atención' : 'OK'}
                </span>
            </td>

            {/* Actions */}
            <td className="py-2.5 px-2 align-middle text-center">
                <div className="flex items-center justify-center gap-1.5 transition-all duration-200">
                    {isEditing ? (
                        <>
                            <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                                onClick={() => onSaveEdit(transaction)}
                                title="Guardar cambios"
                                aria-label="Guardar cambios"
                            >
                                <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                                variant="default"
                                size="icon"
                                className="h-8 w-8 rounded-lg border border-border/80 bg-background/50 hover:bg-muted/50 transition-colors"
                                onClick={onCancelEdit}
                                title="Cancelar edición"
                                aria-label="Cancelar edición"
                            >
                                <X className="h-4 w-4 text-slate-500" />
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border border-border/80 bg-transparent text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-200"
                            onClick={() => onStartEdit(transaction)}
                            title="Editar transacción"
                            aria-label="Editar transacción"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg border border-border/80 bg-transparent text-foreground hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-500 transition-all duration-200"
                        onClick={() => onDelete(transaction.id)}
                        title="Eliminar transacción"
                        aria-label="Eliminar transacción"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </td>
        </tr>
    );
});




