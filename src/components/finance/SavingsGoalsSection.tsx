import { CategoryItem } from '@/hooks/useFinanceData';
import { Target, TrendingUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SavingsGoalsSectionProps {
    categories: CategoryItem[];
    onUpdateGoal: (id: string, goal: number) => Promise<any>;
}

export function SavingsGoalsSection({ categories, onUpdateGoal }: SavingsGoalsSectionProps) {
    const [editingGoal, setEditingGoal] = useState<string | null>(null);
    const [goalValue, setGoalValue] = useState<string>('');

    const savingsCategories = categories.filter(
        c => c.type === 'saving' || c.type === 'savings'
    );

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (savingsCategories.length === 0) return null;

    return (
        <div className="finance-card bg-white">
            <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Metas de Ahorro</h3>
            </div>

            <div className="space-y-6">
                {savingsCategories.map((category) => {
                    const hasGoal = category.saving_goal && category.saving_goal > 0;
                    const isEditing = editingGoal === category.id;

                    return (
                        <div key={category.id} className="space-y-3 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: category.color || '#3b82f6' }}
                                        />
                                        <p className="text-sm font-medium text-foreground">{category.name === 'Loans' ? 'Préstamos' : category.name}</p>
                                    </div>
                                </div>
                                {!hasGoal && !isEditing && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[10px] h-7 px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                        onClick={() => {
                                            setEditingGoal(category.id);
                                            setGoalValue('');
                                        }}
                                    >
                                        <Plus className="h-3 w-3" />
                                        Activar Meta
                                    </Button>
                                )}
                                {hasGoal && !isEditing && (
                                    <div className="text-right cursor-pointer hover:opacity-70" onClick={() => {
                                        setEditingGoal(category.id);
                                        setGoalValue(String(category.saving_goal));
                                    }}>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Meta</p>
                                        <p className="text-xs font-bold text-primary">{formatCurrency(category.saving_goal!)}</p>
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <div className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                                    <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        placeholder="Monto objetivo..."
                                        value={goalValue}
                                        onChange={(e) => setGoalValue(e.target.value)}
                                        autoFocus
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={async () => {
                                            const val = parseFloat(goalValue);
                                            if (!isNaN(val)) {
                                                await onUpdateGoal(category.id, val);
                                            }
                                            setEditingGoal(null);
                                        }}
                                    >
                                        OK
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() => setEditingGoal(null)}
                                    >
                                        ×
                                    </Button>
                                </div>
                            )}

                            {!isEditing && !hasGoal && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <TrendingUp className="h-3 w-3" />
                                    Creciendo sin meta fija
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
