import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceData, CategoryItem, TransactionType, PaymentMethod, PaymentMethodType } from '@/hooks/useFinanceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PaymentMethodList } from '@/components/finance/PaymentMethodList';
import { EditPaymentMethodDialog } from '@/components/finance/EditPaymentMethodDialog';
import { AddPaymentMethodDialog } from '@/components/finance/AddPaymentMethodDialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { SetPasswordDialog } from '@/components/auth/SetPasswordDialog';
import { Shield, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
    Settings,
    Plus,
    Pencil,
    Trash2,
    TrendingUp,
    HelpCircle,
    AlertCircle,
    Circle,
    LogOut,
    Globe,
    Calendar,
    Wallet,
    Banknote,
    CreditCard as CreditCardIcon,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Professional color palette for payment methods
const PRESET_COLORS = [
  { value: '#64748b', label: 'Slate' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#e11d48', label: 'Rose' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ec4899', label: 'Pink' },
];

type ConversionPreview = {
  payment_methods: Array<{
    id: string;
    name: string;
    oldBalance: number | null;
    newBalance: number | null;
  }>;
  transactions: Array<{
    id: string;
    oldAmount: number;
    newAmount: number;
  }>;
};

export default function ConfiguracionPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [highlightPassword, setHighlightPassword] = useState(false);
    const { user, signOut } = useAuth();
    const {
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        paymentMethods,
        updatePaymentMethod,
        deletePaymentMethod,
        addPaymentMethod,
        transactions,
        currency,
        updateProfile,
        addTransfer,
        convertCurrency,
        loading,
        resetProfileData
    } = useFinanceData();

    // Credit Card Payment State
    const [payDialog, setPayDialog] = useState<{ open: boolean; cardId: string | null; balance: number }>({ open: false, cardId: null, balance: 0 });
    const [paySourceId, setPaySourceId] = useState<string>('');
    const [payAmount, setPayAmount] = useState<string>('');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
    const [isPMDialogOpen, setIsPMDialogOpen] = useState(false);
    // Extend PaymentMethod locally to include color
    type PaymentMethodWithColor = PaymentMethod & { color?: string };
    const [editingPM, setEditingPM] = useState<PaymentMethodWithColor | null>(null);
    const [isEditPMOpen, setIsEditPMOpen] = useState(false);
    const [isAddPMOpen, setIsAddPMOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'category' | 'payment_method', count: number } | null>(null);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    // Duplicate detection/confirmation state
    const [duplicateResolve, setDuplicateResolve] = useState<PaymentMethodWithColor | null>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);

    const handleOpenAddPM = () => {
        setEditingPM(null);
        setIsAddPMOpen(true);
    };

    const handleOpenEditPM = (pm: PaymentMethod) => {
        setEditingPM(pm as PaymentMethodWithColor);
        setIsEditPMOpen(true);
    };



    const [formData, setFormData] = useState({
        name: '',
        type: 'expense' as TransactionType,
        color: '#3b82f6',
    });

    const [pmFormData, setPMFormData] = useState({
        name: '',
        type: 'debit' as PaymentMethodType,
        balance: 0,
        credit_limit: null as number | null,
        is_savings_account: false,
        savings_goal: null as number | null,
        estimated_yield: null as number | null,
        closing_date: null as number | null,
        payment_day: null as number | null,
        color: '#4f46e5',
    });

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const { toast } = useToast();

    useEffect(() => {
        if (searchParams.get('highlight') === 'password') {
            setHighlightPassword(true);
            const timer = setTimeout(() => {
                setHighlightPassword(false);
            }, 5000); // 5 seconds highlight
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    const [conversionModalOpen, setConversionModalOpen] = useState(false);
    const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
    const [conversionRate, setConversionRate] = useState<string>('');
    const [isConverting, setIsConverting] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [conversionPreview, setConversionPreview] = useState<null | { payment_methods: Array<{ id: string, name: string, oldBalance: number | null, newBalance: number | null }>, transactions: Array<{ id: string, oldAmount: number, newAmount: number }> }>(null);

    const handleCurrencyChange = async (val: string) => {
        // Intercept change and ask for conversion rate before persisting
        setPendingCurrency(val);
        setConversionRate('');
        setConversionModalOpen(true);
    };

    const handleOpenAdd = () => {
        setEditingCategory(null);
        setFormData({ name: '', type: 'expense', color: '#3b82f6' });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (category: CategoryItem) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            type: category.type,
            color: category.color || '#3b82f6',
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Verificar si venía del onboarding ANTES de agregar
        const wasOnboardingIncomplete = !currency || paymentMethods.length === 0 || categories.length === 0;
        
        if (editingCategory) {
            await updateCategory(editingCategory.id, formData);
        } else {
            await addCategory(formData);
        }
        setIsDialogOpen(false);
        
        // Solo verificar y redirigir si venía del onboarding
        if (wasOnboardingIncomplete) {
            checkOnboardingAndRedirect();
        }
    };

    const checkOnboardingAndRedirect = () => {
        // Siempre redirigir de vuelta al WelcomePanel/Dashboard
        // El Index.tsx decidirá si mostrar WelcomePanel o Dashboard basado en isEmptyState
        setTimeout(() => navigate('/'), 500);
    };

    const handleAddPaymentMethod = async (pm: Omit<PaymentMethod, 'id'>) => {
        // Verificar si venía del onboarding ANTES de agregar
        const wasOnboardingIncomplete = !currency || paymentMethods.length === 0 || categories.length === 0;
        
        const result = await addPaymentMethod(pm);
        
        // Si se agregó exitosamente y venía del onboarding, volver al panel principal
        if (!result.error && wasOnboardingIncomplete) {
            checkOnboardingAndRedirect();
        }
        
        return result;
    };

    const initiateDeleteCategory = (category: CategoryItem) => {
        const count = transactions.filter(t => t.category === category.name).length;
        setDeleteConfirm({ id: category.id, type: 'category', count });
    };

    const initiateDeletePaymentMethod = (pm: PaymentMethod) => {
        const count = transactions.filter(t => t.payment_method_id === pm.id).length;
        setDeleteConfirm({ id: pm.id, type: 'payment_method', count });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'category') {
            await deleteCategory(deleteConfirm.id);
        } else {
            await deletePaymentMethod(deleteConfirm.id);
        }
        setDeleteConfirm(null);
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando categorías...</div>;

    return (
        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">Gestiona tus categorías, métodos de pago y sesión.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Moneda Section */}
                <Card className="shadow-sm border-border/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-blue-500" />
                            Moneda Principal
                        </CardTitle>
                        <CardDescription>Selecciona la moneda que se usará para tus reportes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={currency} onValueChange={handleCurrencyChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="COP">Peso Colombiano (COP)</SelectItem>
                                <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Sesión Section */}
                <Card className="shadow-sm border-border/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LogOut className="h-5 w-5 text-destructive" />
                            Sesión
                        </CardTitle>
                        <CardDescription>Cerrar sesión en este dispositivo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                            Cerrar Sesión
                        </Button>
                    </CardContent>
                </Card>

                {/* Unified Category Management Section */}
                <Card className="shadow-sm border-border/60 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <div className="w-2 h-6 bg-primary rounded-full" />
                                Gestión de Categorías
                            </CardTitle>
                            <CardDescription>Personaliza tus categorías para clasificar mejor tus movimientos.</CardDescription>
                        </div>
                        <Button onClick={handleOpenAdd} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Nueva Categoría</span>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="expense" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-6">
                                <TabsTrigger value="expense">Gastos</TabsTrigger>
                                <TabsTrigger value="income">Ingresos</TabsTrigger>
                                <TabsTrigger value="savings">Ahorros</TabsTrigger>
                                <TabsTrigger value="others">Otros</TabsTrigger>
                            </TabsList>
                            <TabsContent value="expense" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {categories.filter(c => c.type === 'expense').map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => c.type === 'expense').length === 0 && (
                                        <p className="col-span-2 text-center py-8 text-muted-foreground text-sm">No hay categorías de gastos creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="income" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {categories.filter(c => c.type === 'income').map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => c.type === 'income').length === 0 && (
                                        <p className="col-span-2 text-center py-8 text-muted-foreground text-sm">No hay categorías de ingresos creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="savings" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {categories.filter(c => ['saving', 'investment'].includes(c.type)).map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => ['saving', 'investment'].includes(c.type)).length === 0 && (
                                        <p className="col-span-2 text-center py-8 text-muted-foreground text-sm">No hay categorías de ahorro creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="others" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {categories.filter(c => ['other', 'loan'].includes(c.type) || c.name === 'Loans').map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => ['other', 'loan'].includes(c.type) || c.name === 'Loans').length === 0 && (
                                        <p className="col-span-2 text-center py-8 text-muted-foreground text-sm">No hay otras categorías creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Métodos de Pago Section */}
                <Card className="shadow-sm border-border/60 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <div className="w-2 h-6 bg-purple-500 rounded-full" />
                                Métodos de Pago
                            </CardTitle>
                            <CardDescription>Gestiona tus cuentas, tarjetas y efectivo.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PaymentMethodList
                            variant="settings"
                            paymentMethods={paymentMethods}
                            onEdit={(pm) => handleOpenEditPM(pm)}
                            onDelete={(pm) => initiateDeletePaymentMethod(pm)}
                            onAdd={() => handleOpenAddPM()}
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className={cn(
                    "border-primary/10 bg-primary/5 shadow-sm transition-all duration-1000",
                    highlightPassword && "ring-4 ring-primary ring-offset-4 ring-offset-background bg-primary/10 scale-[1.02]"
                )}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            Seguridad
                        </CardTitle>
                        <CardDescription>Configura una contraseña para proteger tu acceso.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => setShowPasswordDialog(true)}
                        >
                            <Lock className="h-4 w-4" />
                            Establecer / Cambiar Contraseña
                        </Button>
                    </CardContent>
                </Card>

                <section className="pt-8 border-t border-destructive/20">
                    <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <div className="w-2 h-6 bg-destructive rounded-full" />
                                Zona de Peligro
                            </CardTitle>
                            <CardDescription>Acciones irreversibles sobre tu cuenta.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="destructive"
                                className="bg-destructive hover:bg-destructive/90 text-white font-bold"
                                onClick={() => setIsResetDialogOpen(true)}
                            >
                                Resetear Perfil / Borrar todos los datos
                            </Button>
                        </CardContent>
                    </Card>
                </section>
            </div>

            <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Pagar Tarjeta de Crédito</DialogTitle>
                        <CardDescription>Transfiere fondos para pagar tu tarjeta.</CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Pagar desde</Label>
                            <Select value={paySourceId} onValueChange={setPaySourceId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cuenta origen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.filter(p => p.type !== 'credit').map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name} (${p.balance})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Monto a pagar</Label>
                            <Input
                                type="number"
                                value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Deuda actual: ${payDialog.balance}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={async () => {
                            if (!paySourceId || !payDialog.cardId) return;
                            await addTransfer(paySourceId, payDialog.cardId, Number(payAmount), 'Pago Tarjeta Crédito', new Date().toISOString());
                            setPayDialog({ open: false, cardId: null, balance: 0 });
                            setPayAmount('');
                            setPaySourceId('');
                        }}>Confirmar Pago</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={conversionModalOpen} onOpenChange={setConversionModalOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Cambiar Moneda</DialogTitle>
                        <CardDescription>Estás cambiando la moneda de <strong>{currency}</strong> a <strong>{pendingCurrency}</strong>.</CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="conversion-rate">Tasa de conversión (1 {currency} = ? {pendingCurrency})</Label>
                            <Input
                                id="conversion-rate"
                                type="number"
                                value={conversionRate}
                                onChange={e => setConversionRate(e.target.value)}
                                placeholder={`Ej. 4000 (1 ${currency} = 4000 ${pendingCurrency})`}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">Al confirmar, todos los saldos de tus métodos de pago y los montos de las transacciones serán multiplicados por esta tasa.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setConversionModalOpen(false); setPendingCurrency(null); setConversionRate(''); }}>Cancelar</Button>
                        <Button onClick={async () => {
                            const rate = parseFloat(conversionRate.replace(',', '.'));
                            if (isNaN(rate) || rate <= 0) {
                                try { toast({ title: 'Error', description: 'Ingresa una tasa de conversión válida', variant: 'destructive' }); } catch (e) { alert('Ingresa una tasa de conversión válida'); }
                                return;
                            }

                            // Request a dry-run preview from the hook
                            setIsConverting(true);
                            const previewRes = await convertCurrency(rate, pendingCurrency ?? '', true);
                            setIsConverting(false);

                            if (previewRes?.error) {
                                try { toast({ title: 'Error', description: 'No se pudo generar la vista previa', variant: 'destructive' }); } catch (e) { alert('No se pudo generar la vista previa'); }
                                return;
                            }

                            if (previewRes?.preview) {
                                setConversionPreview(previewRes.preview as any);
                                setConversionModalOpen(false);
                                setPreviewModalOpen(true);
                            }
                        }} disabled={isConverting}>
                            {isConverting ? 'Generando vista previa...' : 'Vista previa y convertir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Modal: show simple table of old/new balances */}
            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>Vista previa: cambios por conversión</DialogTitle>
                        <CardDescription>A continuación se muestran los saldos actuales y los saldos convertidos. Confirma para aplicar los cambios.</CardDescription>
                    </DialogHeader>
                    <div className="pt-2">
                        <div className="w-full overflow-hidden">
                            <table className="w-full text-sm table-auto">
                                <thead>
                                    <tr className="text-left">
                                        <th className="py-2">Cuenta</th>
                                        <th className="py-2">Saldo anterior</th>
                                        <th className="py-2">Saldo convertido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conversionPreview?.payment_methods.map(pm => (
                                        <tr key={pm.id} className="border-t">
                                            <td className="py-2">{pm.name}</td>
                                            <td className="py-2">{pm.oldBalance == null ? '-' : pm.oldBalance}</td>
                                            <td className="py-2">{pm.newBalance == null ? '-' : pm.newBalance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">Nota: Las transacciones también serán actualizadas; este resumen muestra las cuentas para facilitar la revisión.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setPreviewModalOpen(false); setConversionPreview(null); setPendingCurrency(null); setConversionRate(''); }}>Cancelar</Button>
                        <Button onClick={async () => {
                            const rate = parseFloat(conversionRate.replace(',', '.'));
                            if (isNaN(rate) || rate <= 0) {
                                try { toast({ title: 'Error', description: 'Tasa inválida', variant: 'destructive' }); } catch (e) { alert('Tasa inválida'); }
                                return;
                            }

                            setIsConverting(true);
                            const res = await convertCurrency(rate, pendingCurrency ?? '', false);
                            setIsConverting(false);

                            if (!res?.error) {
                                setPreviewModalOpen(false);
                                setConversionPreview(null);
                                setPendingCurrency(null);
                                setConversionRate('');
                            }
                        }}>{isConverting ? 'Convirtiendo...' : 'Confirmar y convertir'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Nombre</Label>
                            <Input
                                id="cat-name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-type">Tipo</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val: TransactionType) => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="expense">Gasto</SelectItem>
                                    <SelectItem value="income">Ingreso</SelectItem>
                                    <SelectItem value="saving">Ahorro</SelectItem>
                                    <SelectItem value="investment">Inversión</SelectItem>
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-color">Color distintivo</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="cat-color"
                                    type="color"
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="w-16 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    value={formData.color}
                                    readOnly
                                    className="flex-1 font-mono text-sm"
                                />
                                <div
                                    className="w-10 h-10 rounded-lg shadow-sm"
                                    style={{ backgroundColor: formData.color }}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" className="w-full">
                                {editingCategory ? 'Actualizar' : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <EditPaymentMethodDialog
                paymentMethod={editingPM}
                open={isEditPMOpen}
                onOpenChange={setIsEditPMOpen}
            />

            <AddPaymentMethodDialog
                onAdd={handleAddPaymentMethod}
                open={isAddPMOpen}
                onOpenChange={setIsAddPMOpen}
            />

            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <AlertDialogContent className="border-destructive/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            ¿Estás completamente seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground font-medium" asChild>
                            <div>
                                Esta acción eliminará permanentemente todos tus gastos, presupuestos, cuentas y categorías.
                                <span className="block mt-2 text-destructive font-bold uppercase underline">No se puede deshacer.</span>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                await resetProfileData();
                                setIsResetDialogOpen(false);
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Sí, borrar todo permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-muted-foreground text-sm">
                                <p>Esta acción no se puede deshacer.</p>
                                {deleteConfirm?.count ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                                        <p className="font-bold mb-1 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            ¡Atención!
                                        </p>
                                        <p>
                                            Esta {deleteConfirm.type === 'category' ? 'categoría' : 'método de pago'} tiene
                                            <strong> {deleteConfirm.count} movimientos</strong> asociados.
                                            Si lo borras, esas transacciones quedarán sin asignar y tendrás que
                                            reclasificarlas manualmente.
                                        </p>
                                    </div>
                                ) : (
                                    <p>
                                        Se eliminará el {deleteConfirm?.type === 'category' ? 'categoría' : 'método de pago'}
                                        seleccionado. No hay transacciones asociadas actualmente.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <SetPasswordDialog
                open={showPasswordDialog}
                onOpenChange={setShowPasswordDialog}
                userEmail={user?.email || ''}
            />
        </div>
    );
}

function CategoryRow({
    category,
    onEdit,
    onDelete
}: {
    category: CategoryItem;
    onEdit: () => void;
    onDelete: () => void
}) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all group">
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: category.color || '#3b82f6' }}
                >
                    <div className="w-3 h-3 rounded-full bg-white/40" />
                </div>
                <span className="font-semibold text-sm text-foreground/90">{category.name === 'Loans' ? 'Préstamos' : category.name}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-9 w-9 hover:bg-white shadow-sm border border-transparent hover:border-border">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:border-destructive/20 border border-transparent">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
