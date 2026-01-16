import { useState, useMemo } from 'react';
import { TransactionType, CategoryItem, useFinanceData, MASTER_PALETTE } from '@/hooks/useFinanceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Tag, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddCategoryDialogProps {
    onAdd: (category: Omit<CategoryItem, 'id'>) => Promise<{ error: any; data?: CategoryItem }>;
    type?: TransactionType;
    onSuccess?: (category: CategoryItem) => void;
}

const typeOptions: { value: TransactionType; label: string }[] = [
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
    { value: 'saving', label: 'Ahorro' },
    { value: 'investment', label: 'Inversión' },
];

export function AddCategoryDialog({ onAdd, type: initialType = 'expense', onSuccess }: AddCategoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState<TransactionType>(initialType);
    const [selectedColor, setSelectedColor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get existing categories to check used colors
    const { categories } = useFinanceData();

    // Determine available colors
    const usedColors = useMemo(() => new Set(categories.map(c => c.color).filter(Boolean)), [categories]);
    const availableColors = useMemo(() => MASTER_PALETTE, []);

    // Auto-select first available color on open if none selected
    useMemo(() => {
        if (!selectedColor && open) {
            const firstAvailable = availableColors.find(c => !usedColors.has(c));
            if (firstAvailable) setSelectedColor(firstAvailable);
        }
    }, [open, availableColors, usedColors, selectedColor]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsSubmitting(true);
        const result = await onAdd({
            name,
            type,
            color: selectedColor,
        });

        setIsSubmitting(false);

        if (!result.error && result.data) {
            onSuccess?.(result.data);
            setName('');
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs font-medium text-primary hover:text-primary">
                    <Plus className="h-4 w-4" />
                    Nueva categoría
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Nueva Categoría
                    </DialogTitle>
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
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de flujo</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {typeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setType(option.value)}
                                    className={cn(
                                        'px-2 py-2 text-xs rounded-lg border transition-all truncate',
                                        type === option.value
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background hover:bg-muted border-border'
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Color distintivo (Único)</Label>
                        <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1">
                            {availableColors.map((c) => {
                                const isUsed = usedColors.has(c);
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        disabled={isUsed} // Prevent selecting used colors
                                        onClick={() => setSelectedColor(c)}
                                        className={cn(
                                            'h-6 w-6 rounded-full transition-all flex items-center justify-center',
                                            isUsed ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110',
                                            selectedColor === c ? 'ring-2 ring-primary ring-offset-1 scale-110' : ''
                                        )}
                                        style={{ backgroundColor: c }}
                                    >
                                        {selectedColor === c && <Check className="h-3 w-3 text-white" />}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            * Los colores opacos ya están siendo usados por otras categorías.
                        </p>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting || !selectedColor}>
                        {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
