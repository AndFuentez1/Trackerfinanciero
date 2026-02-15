import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import type { CategoryItem, TransactionType} from '@/features/finance/hooks/useFinanceData';
import { useFinanceData, MASTER_PALETTE } from '@/features/finance/hooks/useFinanceData';
import { cn } from '@/core/utils';
import { Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryToEdit?: CategoryItem | null;
    onSave: (category: Omit<CategoryItem, 'id'>, id?: string) => Promise<{ error?: any }>;
}

export function CategoryDialog({ open, onOpenChange, categoryToEdit, onSave }: CategoryDialogProps) {
    const { categories } = useFinanceData();
    const [name, setName] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [selectedColor, setSelectedColor] = useState('');
    const [visibleOptions, setVisibleOptions] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate available colors exclude those used by OTHER categories
    const usedColors = useMemo(() => {
        const set = new Set(categories.map(c => c.color).filter(Boolean) as string[]);
        // If editing, verify the current category's color is NOT considered "used" by others
        if (categoryToEdit?.color) {
            set.delete(categoryToEdit.color);
        }
        return set;
    }, [categories, categoryToEdit]);

    // Pool of valid colors to show (all master palette minus used ones)
    const availablePool = useMemo(() => {
        return MASTER_PALETTE.filter(c => !usedColors.has(c));
    }, [usedColors]);

    useEffect(() => {
        if (open) {
            if (categoryToEdit) {
                setName(categoryToEdit.name);
                setType(categoryToEdit.type);
                // If editing, user's color is selected.
                setSelectedColor(categoryToEdit.color || availablePool[0]);

                // Initialize visible options: Take first 10 strictly available (not used)
                // If the user replaces their color, the new one comes from this list.
                // We ensure the current selected color is NOT in the visible options to avoid duplication?
                // The requirement says: "If selected... removed from selection box".
                // So visibleOptions should NOT contain selectedColor.
                const initialOptions = availablePool
                    .filter(c => c !== categoryToEdit.color)
                    .slice(0, 10);
                setVisibleOptions(initialOptions);
            } else {
                setName('');
                setType('expense');

                // New category: show top 10 available and pre-select the first one
                const options = availablePool.slice(0, 10);
                setVisibleOptions(options);
                setSelectedColor(options[0] || '');
            }
        }
    }, [categoryToEdit, open]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleColorClick = (color: string) => {
        setSelectedColor(color);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {return;}

        setIsSubmitting(true);
        const result = await onSave({
            name,
            type,
            color: selectedColor || visibleOptions[0],
            is_default: false
        }, categoryToEdit?.id);

        setIsSubmitting(false);

        if (!result.error) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{categoryToEdit ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                    <DialogDescription>
                        Define el nombre y color único para identificar esta categoría.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Nombre</Label>
                            <Input
                                id="cat-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Supermercado"
                                required
                                className="h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-type">Tipo</Label>
                            <Select value={type} onValueChange={(v: TransactionType) => setType(v)}>
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="Selecciona tipo" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="expense">Gasto</SelectItem>
                                    <SelectItem value="income">Ingreso</SelectItem>
                                    <SelectItem value="transfer">Transferencia</SelectItem>
                                    <SelectItem value="saving">Ahorro</SelectItem>
                                    <SelectItem value="investment">Inversión</SelectItem>
                                    <SelectItem value="loan">Préstamo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label>Color seleccionado</Label>
                            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl border border-border/50">
                                <div
                                    className="h-10 w-10 rounded-md shadow-sm border border-border/20 transition-all duration-300"
                                    style={{ backgroundColor: selectedColor || 'transparent' }}
                                />
                                <div className="text-sm text-muted-foreground">
                                    {selectedColor ? 'Color asignado a la categoría' : 'Selecciona un color abajo'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Colores disponibles</Label>
                            {availablePool.length === 0 ? (
                                <Alert className="border-destructive/50 bg-destructive/10">
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                    <AlertDescription className="text-sm text-destructive">
                                        Se ha alcanzado el máximo de categorías a crear, cambia o elimina alguna
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <div className="grid grid-cols-5 gap-3 pt-1">
                                    {visibleOptions.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => handleColorClick(c)}
                                            className={cn(
                                                "h-10 w-10 rounded-md shadow-sm transition-all duration-200 hover:scale-110 active:scale-95 border border-transparent hover:border-border/20",
                                                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                                            )}
                                            style={{ backgroundColor: c }}
                                            aria-label={`Seleccionar color ${c}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting || !selectedColor} className="w-full sm:w-auto h-11 px-8 rounded-xl">
                            {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


