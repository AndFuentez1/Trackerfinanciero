import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tags, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsCategories } from '../hooks/useSettingsCategories';
import { CategoryDialog } from '../dialogs/CategoryDialog';
import { CategoryItem } from '@/hooks/useFinanceData';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from "@/components/ui/alert-dialog";

export function CategoriesSection() {
    const { categories, addCategory, updateCategory, deleteCategory } = useSettingsCategories();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));

    const handleEdit = (cat: CategoryItem) => {
        setEditingCategory(cat);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const handleSave = async (category: Omit<CategoryItem, 'id'>, id?: string) => {
        if (id) {
            await updateCategory(id, category);
        } else {
            await addCategory(category);
        }
    };

    const typeLabels: Record<string, string> = {
        expense: 'Gasto',
        income: 'Ingreso',
        transfer: 'Transf.',
        saving: 'Ahorro',
        investment: 'Inversión',
        loan: 'Préstamo'
    };

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Tags className="h-5 w-5 text-primary" />
                            Categorías ({categories.length})
                        </CardTitle>
                        <CardDescription>Organiza tus transacciones por temas</CardDescription>
                    </div>
                    <Button onClick={handleAdd} className="gap-2 h-10 px-4 rounded-xl shrink-0">
                        <Plus className="h-4 w-4" />
                        Nueva
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

                <ScrollArea className="flex-1 -mx-2 px-2 max-h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-4 pb-2">
                        {filteredCategories.map((cat) => (
                            <div
                                key={cat.id}
                                className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-all duration-200 bg-muted/10 h-16"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div
                                        className="h-3 w-3 rounded-md shadow-sm shrink-0"
                                        style={{ backgroundColor: cat.color || '#64748b' }}
                                    />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-semibold truncate" title={cat.name}>{cat.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium uppercase tracking-wider h-4 bg-muted/50 text-muted-foreground border-none">
                                                {typeLabels[cat.type] || cat.type}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(cat)}
                                        className="h-7 w-7 rounded-lg"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Se eliminará la categoría <strong>{cat.name}</strong>.
                                                    Asegúrate de que no tenga transacciones asociadas, de lo contrario la acción fallará por seguridad.
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
                        ))}
                        {filteredCategories.length === 0 && (
                            <div className="col-span-3 text-center py-8 text-muted-foreground">
                                <p className="text-sm italic">No se encontraron categorías</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

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
