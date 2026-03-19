import { useState, useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Checkbox } from '@/shared/ui/checkbox';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import type { StagingTransaction } from '@/features/finance/types/financeTypes';
import { format } from 'date-fns';
import { MASTER_PALETTE } from '@/features/finance/hooks/useFinanceDataLogic';

interface ReviewStagingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stagingTransactions: StagingTransaction[];
    onConfirm: (selectedIds: string[]) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

export function ReviewStagingDialog({
    open,
    onOpenChange,
    stagingTransactions,
    onConfirm,
    onCancel,
    isLoading,
}: ReviewStagingDialogProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Set default selection when data changes
    useEffect(() => {
        if (open && stagingTransactions.length > 0) {
            const defaultSelected = new Set(
                stagingTransactions
                    .filter(t => !t.is_duplicate)
                    .map(t => t.id)
            );
            setSelectedIds(defaultSelected);
        }
    }, [open, stagingTransactions]);

    const duplicatesCount = useMemo(() => stagingTransactions.filter(t => t.is_duplicate).length, [stagingTransactions]);
    const newCount = stagingTransactions.length - duplicatesCount;

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const selectAllSafe = () => {
        const safeSelection = new Set(
            stagingTransactions
                .filter(t => !t.is_duplicate)
                .map(t => t.id)
        );
        setSelectedIds(safeSelection);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
                    <DialogTitle className="text-xl">Revisar registros importados</DialogTitle>
                    <DialogDescription>
                        Revisa las transacciones encontradas en tu archivo antes de guardarlas definitivamente en el sistema.
                    </DialogDescription>
                </DialogHeader>

                {/* Summary Banner */}
                <div className="px-6 py-4 bg-card flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                            </div>
                            <div>
                                <span className="text-sm font-semibold">{newCount}</span>
                                <span className="text-xs text-muted-foreground ml-1">Registros nuevos</span>
                            </div>
                        </div>
                        {duplicatesCount > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/30">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">{duplicatesCount}</span>
                                    <span className="text-xs text-muted-foreground ml-1">Posibles duplicados</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-sm font-medium text-muted-foreground">
                        {selectedIds.size} seleccionados de {stagingTransactions.length}
                    </div>
                </div>

                {duplicatesCount > 0 && (
                    <div className="mx-6 mb-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900 dark:text-amber-400">
                            <p className="font-semibold mb-1">Se encontraron posibles duplicados</p>
                            <p>
                                Hemos detectado algunas transacciones que coinciden (misma fecha, valor y cuenta) con registros
                                que ya existen en tu base de datos. Por seguridad, no han sido seleccionadas.
                            </p>
                            <Button
                                variant="link"
                                className="h-auto p-0 text-amber-700 dark:text-amber-300 font-semibold mt-1"
                                onClick={selectAllSafe}
                            >
                                Restaurar selección segura
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col px-6 pb-2">
                    <div className="grid grid-cols-[auto_100px_minmax(150px,1fr)_120px_100px_120px] gap-4 py-3 px-4 bg-muted/50 rounded-t-lg border border-border border-b-0 text-xs font-semibold text-muted-foreground mt-2">
                        <div className="w-6 flex items-center justify-center">
                            <Checkbox
                                checked={selectedIds.size === stagingTransactions.length && stagingTransactions.length > 0}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedIds(new Set(stagingTransactions.map(t => t.id)));
                                    } else {
                                        setSelectedIds(new Set());
                                    }
                                }}
                            />
                        </div>
                        <div>Fecha</div>
                        <div>Descripción</div>
                        <div>Categoría</div>
                        <div>Método</div>
                        <div className="text-right">Valor</div>
                    </div>

                    <ScrollArea className="flex-1 border border-border rounded-b-lg mb-4">
                        <div className="flex flex-col">
                            {stagingTransactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className={`
                    grid grid-cols-[auto_100px_minmax(150px,1fr)_120px_100px_120px] gap-4 py-3 px-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors items-center text-sm
                    ${tx.is_duplicate ? 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20' : ''}
                  `}
                                >
                                    <div className="w-6 flex items-center justify-center">
                                        <Checkbox
                                            checked={selectedIds.has(tx.id)}
                                            onCheckedChange={() => toggleSelection(tx.id)}
                                        />
                                    </div>
                                    <div className="text-muted-foreground">
                                        {format(new Date(tx.date), 'dd/MM/yyyy')}
                                    </div>
                                    <div className="truncate font-medium flex items-center gap-2">
                                        {tx.is_duplicate && (
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                        )}
                                        <span className="truncate" title={tx.description}>{tx.description || '-'}</span>
                                    </div>
                                    <div className="truncate text-muted-foreground">
                                        <Badge variant="outline" className="font-normal truncate max-w-full" title={tx.category || "No categorization"}>
                                            {tx.category || '-'}
                                        </Badge>
                                    </div>
                                    <div className="truncate text-muted-foreground">
                                        <span className="truncate block" title={tx.payment_method || "No Payment Method"}>{tx.payment_method || '-'}</span>
                                    </div>
                                    <div className={`text-right font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' :
                                            tx.type === 'expense' ? 'text-rose-600' : 'text-slate-600'
                                        }`}>
                                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                                        ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-6 pt-4 border-t border-border bg-muted/30 flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
                        Cancelar importación
                    </Button>
                    <div className="flex-1" />
                    <Button
                        onClick={() => onConfirm(Array.from(selectedIds))}
                        disabled={isLoading || selectedIds.size === 0}
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? 'Guardando...' : `Importar ${selectedIds.size} registros`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
