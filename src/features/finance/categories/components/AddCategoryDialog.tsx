import { useState, useMemo, useEffect } from 'react';
import type { TransactionType, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { useFinanceData, MASTER_PALETTE } from '@/features/finance/hooks/useFinanceData';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/ui/dialog';
import { Plus, Tag, Check } from 'lucide-react';
import { cn } from '@/core/utils';

interface AddCategoryDialogProps {
    onAdd: (category: Omit<CategoryItem, 'id'>) => Promise<{ error: unknown; data?: CategoryItem }>;
    type?: TransactionType;
    onSuccess?: (category: CategoryItem) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

const typeOptions: { value: TransactionType; label: string }[] = [
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
    { value: 'saving', label: 'Ahorro' },
    { value: 'investment', label: 'Inversión' },
];

export function AddCategoryDialog({ onAdd, type: initialType = 'expense', onSuccess, open: controlledOpen, onOpenChange, trigger }: AddCategoryDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange! : setInternalOpen;

    const [name, setName] = useState('');
    const [type, setType] = useState<TransactionType>(initialType);
    const [selectedColor, setSelectedColor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get existing categories to check used colors
    const { categories } = useFinanceData();

    // Determine available colors
    // Determine available colors
    const usedColors = useMemo(() => new Set(categories.map(c => c.color).filter(Boolean)), [categories]);
    const availablePool = useMemo(() => MASTER_PALETTE.filter(c => !usedColors.has(c)), [usedColors]);

    // State for visible options
    const [visibleOptions, setVisibleOptions] = useState<string[]>([]);

    // Initialize visible options when dialog opens, pre-selecting the first available color
    useEffect(() => {
        if (open) {
            // New category scenario: pre-select the first available color
            const options = availablePool.slice(0, 10);
            setVisibleOptions(options);
            setSelectedColor(options[0] || '');
        }
    }, [open]); // Depend on open to reset. Not on availablePool to avoid reshuffles.

    const handleColorClick = (color: string) => {
        setSelectedColor(color);
    };

    // Mantener sincronizado el tipo con el valor inicial recibido
    useEffect(() => {
        setType(initialType);
    }, [initialType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) { return; }

        setIsSubmitting(true);
        const result = await onAdd({
            name,
            type,
            color: selectedColor || visibleOptions[0], // Fallback
        });

        setIsSubmitting(false);

        if (!result.error && result.data) {
            onSuccess?.(result.data);
            setName('');
        }
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} modal={false}>
            {trigger !== undefined ? (
                trigger
            ) : (
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs font-medium border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva categoría
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Nueva Categoría
                    </DialogTitle>
                    <DialogDescription className="sr-only">Crea una categoría para organizar tus transacciones.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="cat-name">Nombre de la categoría</Label>
                        <Input
                            id="cat-name"
                            placeholder="Ej: Suscripciones, Regalos..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="h-11 md:h-9"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cat-type">Tipo</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {typeOptions.map((option) => {
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setType(option.value);
                                        }}
                                        className={cn(
                                            'px-2 py-2 text-xs rounded-lg border transition-all truncate min-h-[44px] md:min-h-[36px] flex items-center justify-center',
                                            type === option.value
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background hover:bg-muted border-border'
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Color seleccionado</Label>
                        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl border border-border/50">
                            <div
                                className="h-8 w-8 rounded-md shadow-sm border border-border/20 transition-all duration-300"
                                style={{ backgroundColor: selectedColor || 'transparent' }}
                            />
                            <div className="text-sm text-muted-foreground">
                                {selectedColor ? 'Color asignado' : 'Selecciona un color'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Colores disponibles</Label>
                        <div className="grid grid-cols-5 gap-3 pt-1">
                            {visibleOptions.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => handleColorClick(c)}
                                    className={cn(
                                        'h-8 w-8 md:h-6 md:w-6 rounded-md transition-all flex items-center justify-center border border-transparent hover:border-border/20',
                                        'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            {visibleOptions.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">No hay más colores disponibles</span>
                            )}
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-11 md:h-9" disabled={isSubmitting || !selectedColor}>
                        {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}


