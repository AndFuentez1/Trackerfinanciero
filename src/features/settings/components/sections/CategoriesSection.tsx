import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tags, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useSettingsCategories } from '../hooks/useSettingsCategories';
import { CategoryDialog } from '../dialogs/CategoryDialog';
import type { CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import type { AlphabetTab } from '../hooks/useCategoryPagination';
import { useCategoryPagination } from '../hooks/useCategoryPagination';

import { CategoriesGridSkeleton } from '@/shared/components/skeletons/SkeletonLoader';

interface CategoriesSectionProps {
    highlighted?: boolean;
    onCategoryCreated?: () => void;
}

const DEFAULT_CATEGORY_COLOR = '#64748b'; // Slate 500

export function CategoriesSection({ highlighted, onCategoryCreated }: CategoriesSectionProps = {}) {
    const { categories, addCategory, updateCategory, deleteCategory, loading } = useSettingsCategories();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
    const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'saving'>('expense');

    // Filter by type and search term
    const typeFilteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        c.type === activeTab
    ).sort((a, b) => a.name.localeCompare(b.name));

    // Use custom hook for pagination logic
    const { alphabetTab, setAlphabetTab, filteredCategories, getTabLabel } = useCategoryPagination(typeFilteredCategories);

    // Calculate available colors
    const usedColors = new Set(categories.map(c => c.color).filter(Boolean) as string[]);
    const availableColorsCount = 50 - usedColors.size;
    const canCreateCategory = availableColorsCount > 0;

    const handleEdit = (cat: CategoryItem) => {
        setEditingCategory(cat);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const handleSave = async (category: Omit<CategoryItem, 'id'>, id?: string) => {
        let result;
        if (id) {
            result = await updateCategory(id, category);
        } else {
            result = await addCategory({
                name: category.name,
                type: category.type,
                color: category.color || DEFAULT_CATEGORY_COLOR
            });
            // Trigger callback if creating new category (not editing)
            if (onCategoryCreated && !result?.error) {
                onCategoryCreated();
            }
        }
        return result;
    };

    const typeLabels: Record<string, string> = {
        expense: 'Gasto',
        income: 'Ingreso',
        transfer: 'Transf.',
        saving: 'Ahorro',
        investment: 'Inversión',
        loan: 'Préstamo'
    };

    const renderCategoryCard = (cat: CategoryItem) => (
        <div
            key={cat.id}
            className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-all duration-200 bg-muted/10 h-16"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div
                    className="h-5 w-5 rounded-sm shadow-sm shrink-0 border border-border/20"
                    style={{ backgroundColor: cat.color || DEFAULT_CATEGORY_COLOR }}
                />
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold truncate" title={cat.name}>{cat.name}</span>

                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(cat)}
                    className="h-7 w-7 rounded-lg"
                    aria-label={`Editar categoría ${cat.name}`}
                >
                    <Edit2 className="h-3 w-3" />
                </Button>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar categoría ${cat.name}`}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Se eliminará la categoría <strong>{cat.name}</strong>.
                                Las transacciones asociadas se mantendrán pero sin categoría asignada.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteCategory(cat.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                            <Tags className="h-5 w-5 text-primary" />
                            Categorías ({filteredCategories.length}/{categories.length})
                        </CardTitle>
                        <CardDescription className="text-base">Organiza tus transacciones por tipo</CardDescription>
                    </div>
                    <Button onClick={handleAdd} disabled={!canCreateCategory} className="gap-2 h-10 px-4 rounded-xl shrink-0 md:text-[15px]">
                        <Plus className="h-4 w-4" />
                        Nueva<span className="hidden md:inline"> categoría</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar categorías..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
                    />
                </div>

                {!canCreateCategory && (
                    <Alert className="border-destructive/50 bg-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-sm text-destructive">
                            Se ha alcanzado el máximo de categorías a crear, cambia o elimina alguna
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'income' | 'expense' | 'saving')} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-11 rounded-xl bg-muted/30">
                        <TabsTrigger value="income" className="rounded-lg data-[state=active]:bg-success/15 data-[state=active]:text-success">
                            Ingresos
                        </TabsTrigger>
                        <TabsTrigger value="expense" className="rounded-lg data-[state=active]:bg-destructive/15 data-[state=active]:text-destructive">
                            Gastos
                        </TabsTrigger>
                        <TabsTrigger value="saving" className="rounded-lg data-[state=active]:bg-sky-100/70 data-[state=active]:text-sky-700">
                            Ahorros
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-4 space-y-4">
                        {loading ? (
                            <CategoriesGridSkeleton count={6} />
                        ) : typeFilteredCategories.length >= 20 ? (
                            /* Show pagination tabs when 20+ categories */
                            <Tabs value={alphabetTab} onValueChange={(v) => setAlphabetTab(v as AlphabetTab)} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 h-10 rounded-xl bg-muted/20">
                                    <TabsTrigger value="all" className="rounded-lg text-xs">
                                        Todos ({typeFilteredCategories.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="first" className="rounded-lg text-xs">
                                        {getTabLabel('first')}
                                    </TabsTrigger>
                                    <TabsTrigger value="second" className="rounded-lg text-xs">
                                        {getTabLabel('second')}
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value={alphabetTab} className="mt-4">
                                    <div className="flex-1 -mx-2 px-2">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-4 pb-2">
                                            {filteredCategories.map(renderCategoryCard)}
                                            {filteredCategories.length === 0 && (
                                                <div className="col-span-3 text-center py-8 text-muted-foreground">
                                                    <p className="text-sm italic">No se encontraron categorías</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            /* Show all categories directly when less than 20 */
                            <div className="flex-1 -mx-2 px-2">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-4 pb-2">
                                    {typeFilteredCategories.map(renderCategoryCard)}
                                    {typeFilteredCategories.length === 0 && (
                                        <div className="col-span-3 text-center py-8 text-muted-foreground">
                                            <p className="text-sm italic">No se encontraron categorías</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <CategoryDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    categoryToEdit={editingCategory}
                    onSave={handleSave}
                />
            </CardContent>
        </Card>
    );
}


