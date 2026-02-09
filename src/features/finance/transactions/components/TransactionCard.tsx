import { memo } from 'react';
import { Transaction, PaymentMethod, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import {
    Trash2,
    CreditCard,
    Pencil
} from 'lucide-react';
import { cn } from '@/core/utils';
import { Button } from '@/shared/ui/button';

interface TransactionCardProps {
    transaction: Transaction;
    paymentMethods: PaymentMethod[];
    categories: CategoryItem[];
    onStartEdit: (t: Transaction) => void;
    onDelete: (id: string) => void;
}

export const TransactionCard = memo(({
    transaction,
    paymentMethods,
    categories,
    onStartEdit,
    onDelete
}: TransactionCardProps) => {
    const { formatCurrencySmall } = useFormatCurrency();

    // Helpers duplicated/shared logic
    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const month = months[d.getMonth()] || '';
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    const getPaymentMethodName = (pmId: string | null | undefined) => {
        if (!pmId) return null;
        const pm = paymentMethods.find(p => p.id === pmId);
        return pm?.name || null;
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
        <div
            className={cn(
                "bg-card rounded-xl border p-4 shadow-sm",
                isOrphan ? "border-destructive/50 bg-destructive/5" : "border-border",
                transaction.type === 'expense' ? "border-l-4 border-l-rose-500" : "border-l-4 border-l-emerald-500"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                                backgroundColor: (categoryDisplay.color || '#3b82f6') + '20',
                                color: categoryDisplay.color || '#3b82f6',
                            }}
                        >
                            {categoryDisplay.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatDate(transaction.date)}
                        </span>
                    </div>
                    <h4 className="font-medium text-sm line-clamp-1">{transaction.description}</h4>
                </div>
                <div className="text-right">
                    <span className={cn(
                        "block text-lg font-bold",
                        isNegativeType(transaction.type) ? "text-rose-600" : "text-emerald-600"
                    )}>
                        {isNegativeType(transaction.type) ? '-' : '+'}
                        {formatCurrencySmall(transaction.amount)}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    <span>{pmName || 'Sin método'}</span>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-sm border-input hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all bg-transparent text-muted-foreground"
                        onClick={() => onStartEdit(transaction)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-sm border-input hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all bg-transparent text-muted-foreground"
                        onClick={() => onDelete(transaction.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
});



