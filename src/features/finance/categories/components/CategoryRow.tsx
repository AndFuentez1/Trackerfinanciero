import React from 'react';
import { Button } from '@/shared/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/core/utils';
import { CategoryItem } from '@/features/finance/hooks/useFinanceData';

interface CategoryRowProps {
  category: CategoryItem;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({ category, onEdit, onDelete, className }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl border border-muted bg-white px-4 py-3 shadow-sm hover:shadow-md transition-all',
        className
      )}
      style={{ borderLeft: `6px solid ${category.color || '#3b82f6'}` }}
    >
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-semibold text-base truncate" title={category.name}>{category.name}</span>
        <span className="text-xs text-muted-foreground capitalize">{category.type}</span>
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar categoría">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Eliminar categoría">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};


