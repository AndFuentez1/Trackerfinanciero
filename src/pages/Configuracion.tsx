import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceData, CategoryItem, TransactionType, PaymentMethod, PaymentMethodType } from '@/hooks/useFinanceData';
import { getTodayLocalDate } from '@/lib/dateUtils';
import { CURRENCIES } from '@/hooks/currencyConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PaymentMethodList } from '@/components/finance/PaymentMethodList';
import { EditPaymentMethodDialog } from '@/components/finance/EditPaymentMethodDialog';
import { AddPaymentMethodDialog } from '@/components/finance/AddPaymentMethodDialog';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Shield, Lock, Book } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
    Settings,
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
    Plus,
    CreditCard as CreditCardIcon
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
    { value: '#10b98a', label: 'Emerald' },
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
        resetProfileData,
        baseColor,
        themeOptions,
        setAppThemePreference,
        highlightedCard,
        setHighlightedCard,
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
    const [isDeleteTransactionsDialogOpen, setIsDeleteTransactionsDialogOpen] = useState(false);
    const [decimalPlaces, setDecimalPlaces] = useState<number>(0);
    const [originalDecimalPlaces, setOriginalDecimalPlaces] = useState<number>(0);
    const [isDecimalsSaved, setIsDecimalsSaved] = useState(true);
    const [selectedTheme, setSelectedTheme] = useState<string>(baseColor);

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

    // Obtener símbolo de moneda dinámico
    const getCurrencySymbol = () => {
        const curr = CURRENCIES.find(c => c.code === currency);
        return curr?.symbol || currency || '$';
    };

    const renderDecimalExample = () => {
        const symbol = getCurrencySymbol();
        const decimalsSpan = (count: number) => {
            if (count <= 0) return null;
            return (
                <span style={{ fontSize: '0.8em', opacity: 0.85 }}>
                    .{'0'.repeat(count)}
                </span>
            );
        };

        const symbolSpan = (
            <span style={{ fontSize: '0.8em' }}>{symbol}</span>
        );

        if (decimalPlaces === 0) return <>Sin decimales (ej: {symbolSpan} 1000)</>;
        if (decimalPlaces === 1) return <>Un decimal (ej: {symbolSpan} 1000{decimalsSpan(1)})</>;
        if (decimalPlaces === 2) return <>Dos decimales (ej: {symbolSpan} 1000{decimalsSpan(2)})</>;
        return <>Tres decimales (ej: {symbolSpan} 1000{decimalsSpan(3)})</>;
    };

    // Conversión estimada basada en pares de monedas comunes
    const getEstimatedConversionRate = (from: string, to: string): number | null => {
        const rates: { [key: string]: number } = {
            // COP conversions
            'COP_USD': 0.00024038, 'USD_COP': 4159.35,
            'COP_EUR': 0.00023070, 'EUR_COP': 4335.41,
            'COP_MXN': 0.00419340, 'MXN_COP': 238.47,
            'COP_ARS': 0.02260870, 'ARS_COP': 44.23,
            'COP_BRL': 0.00149701, 'BRL_COP': 667.64,
            'COP_CLP': 0.20576131, 'CLP_COP': 4.86,
            'COP_PEN': 0.00869423, 'PEN_COP': 115.04,
            // USD conversions
            'USD_EUR': 0.92589, 'EUR_USD': 1.08004,
            'USD_MXN': 17.4598, 'MXN_USD': 0.057297,
            'USD_ARS': 94.0617, 'ARS_USD': 0.010631,
            'USD_BRL': 5.00648, 'BRL_USD': 0.19974,
            'USD_CLP': 856.13, 'CLP_USD': 0.0011680,
            'USD_PEN': 3.70981, 'PEN_USD': 0.26954,
            // EUR conversions
            'EUR_MXN': 18.8693, 'MXN_EUR': 0.052997,
            'EUR_ARS': 101.537, 'ARS_EUR': 0.0098486,
            'EUR_BRL': 5.41049, 'BRL_EUR': 0.18484,
            'EUR_CLP': 924.563, 'CLP_EUR': 0.0010816,
            'EUR_PEN': 4.01042, 'PEN_EUR': 0.24935,
            // MXN conversions
            'MXN_ARS': 5.38079, 'ARS_MXN': 0.18584,
            'MXN_BRL': 0.28695, 'BRL_MXN': 3.48488,
            'MXN_CLP': 49.0134, 'CLP_MXN': 0.020402,
            'MXN_PEN': 0.21252, 'PEN_MXN': 4.70515,
            // ARS conversions
            'ARS_BRL': 0.053272, 'BRL_ARS': 18.77,
            'ARS_CLP': 9.10544, 'CLP_ARS': 0.10981,
            'ARS_PEN': 0.039477, 'PEN_ARS': 25.331,
            // BRL conversions
            'BRL_CLP': 170.976, 'CLP_BRL': 0.0058462,
            'BRL_PEN': 0.74038, 'PEN_BRL': 1.35067,
            // CLP conversions
            'CLP_PEN': 0.0043297, 'PEN_CLP': 231.04,
        };
        return rates[`${from}_${to}`] || null;
    };

    const renderConversionPlaceholder = (includeExample: boolean = true) => {
        if (!pendingCurrency) return includeExample ? 'Ej. 4000' : '4000';

        // Extraer solo el código si viene con espacios
        const currencyCode = currency.split(' ')[0];
        const pendingCode = pendingCurrency.split(' ')[0];

        const rate = getEstimatedConversionRate(currencyCode, pendingCode);
        if (!rate) return includeExample ? 'Ej. 4000' : '4000';

        // Obtener símbolos de ambas monedas usando getCurrencyConfig o buscando directamente
        const currencyConfig = CURRENCIES.find(c => c.code === currencyCode);
        const pendingConfig = CURRENCIES.find(c => c.code === pendingCode);

        const currencySymbol = currencyConfig?.symbol || currencyCode;
        const pendingSymbol = pendingConfig?.symbol || pendingCode;

        // Mostrar todos los decimales significativos
        const formatted = rate >= 1
            ? rate.toFixed(2)
            : rate.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');

        const example = `1 ${currencySymbol} = ${formatted} ${pendingSymbol}`;
        return includeExample ? `Ej: ${example}` : example;
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

    // Clear highlighted card on unmount
    useEffect(() => {
        return () => {
            setHighlightedCard(null);
        };
    }, []);

    // Load decimal places from profile
    useEffect(() => {
        const loadDecimalPlaces = async () => {
            if (!user?.id) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('decimal_places')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!error && data?.decimal_places !== undefined && data.decimal_places !== null) {
                    setDecimalPlaces(data.decimal_places);
                    setOriginalDecimalPlaces(data.decimal_places);
                    setIsDecimalsSaved(true);
                } else {
                    // Set default based on current currency
                    const currConfig = CURRENCIES.find(c => c.code === currency);
                    const defaultValue = currConfig?.decimals ?? 0;
                    setDecimalPlaces(defaultValue);
                    setOriginalDecimalPlaces(defaultValue);
                    setIsDecimalsSaved(true);
                }
            } catch (err) {
                // Error loading decimal places
            }
        };
        loadDecimalPlaces();
    }, [user?.id]);

    // Sync selectedTheme with baseColor from context
    useEffect(() => {
        setSelectedTheme(baseColor);
    }, [baseColor]);

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

        // Auto-set decimal places based on currency selection
        const selectedCurrency = CURRENCIES.find(c => c.code === val);
        if (selectedCurrency) {
            setDecimalPlaces(selectedCurrency.decimals);
        }
    };

    const handleSaveDecimalPlaces = async () => {
        if (!user?.id) return;
        try {
            // Usar updateProfile para actualizar y refrescar en toda la app
            const result = await updateProfile({ decimal_places: decimalPlaces });

            if (result?.error) {
                toast({
                    title: 'Error',
                    description: 'No se pudo guardar la configuración',
                    variant: 'destructive'
                });
                return;
            }

            setOriginalDecimalPlaces(decimalPlaces);
            setIsDecimalsSaved(true);

            toast({
                title: 'Éxito',
                description: `Visualización configurada a ${decimalPlaces} decimales`
            });
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Error al guardar la configuración',
                variant: 'destructive'
            });
        }
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

        // Si venía del onboarding, cerrar formulario -> esperar -> pop down -> esperar -> volver
        if (wasOnboardingIncomplete) {
            // 1. Cerrar formulario primero
            setIsDialogOpen(false);

            // 2. Esperar a que el modal se oculte antes de iniciar el pop-down
            setTimeout(() => {
                setHighlightedCard(null);

                // 3. Esperar a que la animación de pop-down termine antes de navegar
                setTimeout(() => {
                    navigate('/');
                }, 600);
            }, 300);
        } else {
            setIsDialogOpen(false);
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

        // Si se agregó exitosamente y venía del onboarding, cerrar diálogos -> esperar -> pop down -> esperar -> volver
        if (!result.error && wasOnboardingIncomplete) {
            // 1. Cerrar diálogo de adición/edición (esto se maneja en el componente padre pero por si acaso)
            setIsAddPMOpen(false);

            // 2. Esperar un momento decente
            setTimeout(() => {
                // 3. Efecto pop-down: limpiar el resaltado
                setHighlightedCard(null);

                // 4. Esperar a que la animación de pop-down termine antes de navegar
                setTimeout(() => {
                    navigate('/');
                }, 600);
            }, 300);
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

    if (loading) {
        return <SkeletonLoader tab="config" />;
    }

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
                <Card className="rounded-2xl shadow-lg border-none bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-blue-500" />
                            Moneda Principal
                        </CardTitle>
                        <CardDescription>Selecciona la moneda que se usará para tus reportes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={currency} onValueChange={handleCurrencyChange}>
                            <SelectTrigger id="currency-selector" name="currency">
                                <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCIES.map(curr => (
                                    <SelectItem key={curr.code} value={curr.code}>
                                        {curr.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Sesión Section */}
                <Card className="rounded-2xl shadow-lg border-none bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LogOut className="h-5 w-5 text-destructive" />
                            Sesión
                        </CardTitle>
                        <CardDescription>Cerrar sesión en este dispositivo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" className="w-full text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                            Cerrar Sesión
                        </Button>
                    </CardContent>
                </Card>

                <div className="hidden md:block md:col-span-2 w-full h-[1.5px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full my-4" />

                {/* Unified Category Management Section */}
                <Card
                    className={cn(
                        "rounded-2xl shadow-xl border-none bg-white md:col-span-2 transition-all duration-500 ease-in-out",
                        highlightedCard === 'categories' && [
                            "ring-4 ring-primary ring-offset-4 ring-offset-background scale-[1.05] z-30",
                            "bg-primary text-primary-foreground shadow-[0_0_30px_0_hsl(var(--primary)/0.8)]",
                            "animate-in zoom-in-[1.02] duration-500"
                        ]
                    )}
                >
                    <CardHeader className="flex flex-col gap-4 pb-4">
                        <div className="flex flex-row items-start sm:items-center justify-between gap-2">
                            <div className="space-y-1 flex-1">
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                    <div className={cn("w-2 h-6 bg-primary rounded-full", highlightedCard === 'categories' && "bg-primary-foreground")} />
                                    Gestión de Categorías
                                </CardTitle>
                            </div>
                            <Button
                                onClick={handleOpenAdd}
                                size="sm"
                                variant="default"
                                className={cn(
                                    "gap-2 shrink-0 duration-500",
                                    highlightedCard === 'categories' && "bg-white text-primary border-white hover:bg-white/90 scale-110 shadow-[0_0_30px_0_hsl(var(--primary)/0.8)] font-bold z-10"
                                )}
                            >
                                <span>Nueva categoría</span>
                                <Plus className={cn("h-4 w-4", highlightedCard === 'categories' && "animate-pulse")} />
                            </Button>
                        </div>
                        <CardDescription className={cn("transition-colors", highlightedCard === 'categories' ? "text-primary-foreground/90 font-medium" : "text-muted-foreground")}>
                            Configura tus categorías aquí para completar tu perfil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="expense" className="w-full">
                            <TabsList className="flex w-full p-1 gap-2 mb-6 bg-muted/50 rounded-lg border border-muted-foreground/30">
                                <TabsTrigger value="expense" className="flex-1 py-2 rounded-xl bg-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-600 font-semibold shadow-none border-none transition-all">Gastos</TabsTrigger>
                                <TabsTrigger value="income" className="flex-1 py-2 rounded-xl bg-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-600 font-semibold shadow-none border-none transition-all">Ingresos</TabsTrigger>
                                <TabsTrigger value="savings" className="flex-1 py-2 rounded-xl bg-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-600 font-semibold shadow-none border-none transition-all">Ahorros</TabsTrigger>
                                <TabsTrigger value="others" className="flex-1 py-2 rounded-xl bg-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-600 font-semibold shadow-none border-none transition-all">Otros</TabsTrigger>
                            </TabsList>
                            <TabsContent value="expense" className="mt-0 pt-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {categories.filter(c => c.type === 'expense').map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => c.type === 'expense').length === 0 && (
                                        <p className="col-span-full text-center py-8 text-muted-foreground text-sm">No hay categorías de gastos creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="income" className="mt-0 pt-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {categories.filter(c => c.type === 'income').map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => c.type === 'income').length === 0 && (
                                        <p className="col-span-full text-center py-8 text-muted-foreground text-sm">No hay categorías de ingresos creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="savings" className="mt-0 pt-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {categories.filter(c => ['saving', 'investment'].includes(c.type)).map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => ['saving', 'investment'].includes(c.type)).length === 0 && (
                                        <p className="col-span-full text-center py-8 text-muted-foreground text-sm">No hay categorías de ahorro creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="others" className="mt-0 pt-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {categories.filter(c => ['other', 'loan'].includes(c.type) || c.name === 'Loans').map(category => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={() => handleOpenEdit(category)}
                                            onDelete={() => initiateDeleteCategory(category)}
                                        />
                                    ))}
                                    {categories.filter(c => ['other', 'loan'].includes(c.type) || c.name === 'Loans').length === 0 && (
                                        <p className="col-span-full text-center py-8 text-muted-foreground text-sm">No hay otras categorías creadas.</p>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 w-full h-[1.5px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full my-4" />

                {/* Métodos de Pago Section */}
                <Card
                    className={cn(
                        "config-card md:col-span-2 transition-all duration-500 ease-in-out relative",
                        highlightedCard === 'payment-methods' && [
                            "ring-4 ring-primary ring-offset-4 ring-offset-background scale-[1.05] z-30",
                            "bg-primary text-primary-foreground shadow-[0_0_30px_0_hsl(var(--primary)/0.8)]",
                            "animate-in zoom-in-[1.02] duration-500"
                        ]
                    )}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <div className={cn("w-2 h-6 bg-slate-500 rounded-full", highlightedCard === 'payment-methods' && "bg-primary-foreground")} />
                                Métodos de Pago
                            </CardTitle>
                            <CardDescription className={cn("transition-colors", highlightedCard === 'payment-methods' ? "text-primary-foreground/90 font-medium" : "text-muted-foreground")}>
                                Configura tus cuentas y tarjetas aquí para completar tu perfil.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PaymentMethodList
                            variant="settings"
                            paymentMethods={paymentMethods}
                            onEdit={(pm) => handleOpenEditPM(pm)}
                            onDelete={(pm) => initiateDeletePaymentMethod(pm)}
                            onAdd={() => handleOpenAddPM()}
                            highlighted={highlightedCard === 'payment-methods'}
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-primary/25 to-transparent rounded-full my-3 shadow-sm hover:via-primary/60 transition-all duration-500" />

            <div className="flex flex-col gap-3">
                {/* Decimal Places Section */}
                <Card className="config-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            Números decimales
                        </CardTitle>
                        <CardDescription>Configura cuántos decimales mostrar en moneda</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <Label htmlFor="decimal-places" className="text-base font-medium mb-2 block">
                                    Decimales: {decimalPlaces}
                                </Label>
                                <input
                                    id="decimal-places"
                                    type="range"
                                    min="0"
                                    max="3"
                                    value={decimalPlaces}
                                    onChange={(e) => {
                                        const newValue = Number(e.target.value);
                                        setDecimalPlaces(newValue);
                                        setIsDecimalsSaved(newValue === originalDecimalPlaces);
                                    }}
                                    className="w-full premium-slider"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    {renderDecimalExample()}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleSaveDecimalPlaces}
                            className={cn(
                                "w-full rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 transition-all text-base py-3 border-none",
                                isDecimalsSaved && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={isDecimalsSaved}
                        >
                            {isDecimalsSaved ? 'Configuración Guardada' : 'Guardar Configuración'}
                        </Button>
                    </CardContent>
                </Card>

                <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full my-4" />

                {/* Theme Color Section */}
                <Card className="rounded-2xl shadow-lg border-none bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="w-2 h-6 bg-primary rounded-full" />
                            Tema de color
                        </CardTitle>
                        <CardDescription>Elige el color base de la aplicación</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {themeOptions.map((theme) => (
                                <button
                                    key={theme.hex}
                                    onClick={() => setSelectedTheme(theme.hex)}
                                    className={cn(
                                        "p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2",
                                        selectedTheme === theme.hex
                                            ? "border-primary ring-2 ring-primary ring-offset-2"
                                            : "border-border hover:border-primary"
                                    )}
                                    style={{ backgroundColor: `${theme.hex}20` }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                                        style={{ backgroundColor: theme.hex }}
                                    >
                                        {selectedTheme === theme.hex && (
                                            <div className="w-4 h-4 rounded-full bg-white" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <Button
                            onClick={() => setAppThemePreference(selectedTheme)}
                            className="w-full rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 transition-all text-base py-3 border-none"
                        >
                            Guardar Color
                        </Button>
                    </CardContent>
                </Card>

                <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full my-4" />

                <Card className={cn(
                    "rounded-2xl shadow-lg border-none bg-white transition-all duration-1000",
                    highlightPassword && "ring-4 ring-primary ring-offset-4 ring-offset-background scale-[1.02]"
                )}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            Seguridad
                        </CardTitle>
                        <CardDescription>Configura una contraseña para proteger tu acceso.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="default"
                            className="gap-2 h-auto py-2 px-3 justify-start bg-primary text-primary-foreground rounded-xl font-semibold shadow-md hover:bg-primary/90 border-none"
                            onClick={() => setShowPasswordDialog(true)}
                        >
                            <Lock className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary-foreground" />
                            <span className="text-left whitespace-normal font-medium">Establecer / Cambiar Contraseña</span>
                        </Button>
                    </CardContent>
                </Card>

                <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full my-4" />

                <section>
                    <Card className="rounded-2xl shadow-lg border-none bg-red-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-black">
                                <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                                Zona de Peligro
                            </CardTitle>
                            <CardDescription className="text-black">Acciones irreversibles sobre tu cuenta.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="default"
                                    className="bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 rounded-2xl font-medium shadow-sm transition-all duration-200 h-auto py-3 justify-center"
                                    onClick={() => setIsDeleteTransactionsDialogOpen(true)}
                                >
                                    <span className="whitespace-normal break-words text-center">
                                        Eliminar Datos
                                    </span>
                                </Button>
                                <Button
                                    variant="default"
                                    className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-2xl font-semibold shadow-sm transition-all duration-200 h-auto py-3 px-6 justify-center text-center"
                                    onClick={() => setIsResetDialogOpen(true)}
                                >
                                    <span className="whitespace-normal break-words">
                                        Resetear Perfil
                                    </span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>

            <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog(prev => ({ ...prev, open }))} modal={false}>
                <DialogContent
                    className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Pagar Tarjeta de Crédito</DialogTitle>
                        <DialogDescription className="sr-only">Transfiere fondos desde una cuenta para pagar tu tarjeta de crédito.</DialogDescription>
                        <CardDescription>Transfiere fondos para pagar tu tarjeta.</CardDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 pt-4">
                        <div className="flex flex-col gap-2">
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
                            await addTransfer(paySourceId, payDialog.cardId, Number(payAmount), 'Pago Tarjeta Crédito', getTodayLocalDate());
                            setPayDialog({ open: false, cardId: null, balance: 0 });
                            setPayAmount('');
                            setPaySourceId('');
                        }}>Confirmar Pago</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={conversionModalOpen} onOpenChange={setConversionModalOpen} modal={false}>
                <DialogContent
                    className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Cambiar Moneda</DialogTitle>
                        <DialogDescription className="sr-only">Configura la tasa y confirma el cambio de moneda de la aplicación.</DialogDescription>
                        <CardDescription>Estás cambiando la moneda de <strong>{currency}</strong> a <strong>{pendingCurrency}</strong>.</CardDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 pt-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="conversion-rate">
                                {conversionRate ? (
                                    <>Tasa de conversión: {renderConversionPlaceholder(false)}</>
                                ) : (
                                    <>Tasa de conversión</>
                                )}
                            </Label>
                            <Input
                                id="conversion-rate"
                                type="number"
                                value={conversionRate}
                                onChange={e => setConversionRate(e.target.value)}
                                placeholder={!conversionRate ? renderConversionPlaceholder(true) : ''}
                                className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&]:appearance-textfield"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">Al confirmar, todos los saldos de tus métodos de pago y los montos de las transacciones serán multiplicados por esta tasa.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="default" onClick={() => { setConversionModalOpen(false); setPendingCurrency(null); setConversionRate(''); }}>Cancelar</Button>
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
                            {isConverting ? 'Generando vista previa...' : 'Ver Vista Previa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Modal: show simple table of old/new balances */}
            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen} modal={false}>
                <DialogContent
                    className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Vista previa: cambios por conversión</DialogTitle>
                        <DialogDescription className="sr-only">Revisa la vista previa de saldos antes de aplicar la conversión de moneda.</DialogDescription>
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
                                            <td className="py-2">{pm.oldBalance == null ? '-' : pm.oldBalance.toFixed(decimalPlaces)}</td>
                                            <td className="py-2">{pm.newBalance == null ? '-' : pm.newBalance.toFixed(decimalPlaces)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">Nota: Las transacciones también serán actualizadas; este resumen muestra las cuentas para facilitar la revisión.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="default" onClick={() => { setPreviewModalOpen(false); setConversionPreview(null); setPendingCurrency(null); setConversionRate(''); }}>Cancelar</Button>
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
                                // Cerrar todos los modales y limpiar estado
                                setPreviewModalOpen(false);
                                setConversionPreview(null);
                                setConversionModalOpen(false);
                                setPendingCurrency(null);
                                setConversionRate('');

                                // Mostrar mensaje de éxito - la conversión ya actualiza currency internamente
                                toast({
                                    title: '✓ Conversión completada',
                                    description: `La moneda se cambió a ${pendingCurrency ?? ''}`
                                });
                            }
                        }}>{isConverting ? 'Convirtiendo...' : 'Confirmar y convertir'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={false}>
                <DialogContent
                    className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                        <DialogDescription className="sr-only">Gestiona las categorías para organizar tus transacciones.</DialogDescription>
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
                onSave={updatePaymentMethod}
            />

            <AddPaymentMethodDialog
                onAdd={handleAddPaymentMethod}
                open={isAddPMOpen}
                onOpenChange={setIsAddPMOpen}
            />

            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <AlertDialogContent className="border-destructive/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 font-bold flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            ¿Resetear perfil?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground font-medium" asChild>
                            <div>
                                <p className="text-[#333333]">Esta acción eliminará permanentemente todos tus gastos, presupuestos, cuentas y categorías.</p>
                                <span className="block mt-2 text-destructive font-bold uppercase underline tracking-wide">ESTA ACCIÓN ES IRREVERSIBLE</span>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="text-gray-600 hover:bg-gray-100 border-none shadow-none">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                await resetProfileData();
                                setIsResetDialogOpen(false);
                            }}
                            className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-2xl font-semibold px-6"
                        >
                            Resetear perfil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteTransactionsDialogOpen} onOpenChange={setIsDeleteTransactionsDialogOpen}>
                <AlertDialogContent className="border-orange-600/50">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-orange-600 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            ¿Eliminar todos los datos?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground font-medium" asChild>
                            <div>
                                Se eliminarán todas tus transacciones, préstamos, presupuestos y ahorros.
                                <span className="block mt-2 text-destructive font-bold uppercase underline">Esta acción no se puede deshacer. ¿Continuar?</span>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                try {
                                    if (!user?.id) return;
                                    // Eliminar datos operativos (manteniendo config: categorias, metodos)
                                    const tablesToDelete = [
                                        'transactions',
                                        'loans',
                                        'budgets',
                                        'savings_transactions',
                                        'savings_accounts'
                                    ];

                                    for (const table of tablesToDelete) {
                                        await supabase.from(table as any).delete().eq('user_id', user.id);
                                    }

                                    // Resetear los saldos de los métodos de pago a 0
                                    for (const pm of paymentMethods) {
                                        await supabase
                                            .from('payment_methods')
                                            .update({ balance: 0 })
                                            .eq('id', pm.id);
                                    }

                                    toast({ title: 'Éxito', description: 'Datos eliminados correctamente (Configuración conservada)' });
                                    setIsDeleteTransactionsDialogOpen(false);
                                    // Recargar datos
                                    window.location.reload();
                                } catch (err) {
                                    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                                    toast({ title: 'Error', description: `No se pudieron eliminar los datos: ${errorMessage}`, variant: 'destructive' });
                                }
                            }}
                            className="bg-orange-600/20 text-orange-600 hover:bg-orange-600/30 border border-orange-600/30"
                        >
                            Sí, eliminar todos mis datos
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
        <div className="flex items-center justify-between p-3 rounded-2xl shadow-md bg-white group transition-all hover:shadow-lg" style={{ minHeight: 56 }}>
            <div className="flex items-center gap-3 flex-1">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-105 shadow-sm"
                    style={{ backgroundColor: category.color || 'var(--primary)' }}
                >
                    {/* Icono sólido, sin borde */}
                    <span className="sr-only">Icono</span>
                </div>
                <span className="font-medium text-base text-foreground flex-1">{category.name === 'Loans' ? 'Préstamos' : category.name}</span>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button variant="outline" size="icon" onClick={onEdit}
                    className="h-9 w-9 rounded-xl border-none bg-slate-100 hover:bg-primary/1010 texprimaryy shadow-none"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={onDelete}
                    className="h-9 w-9 rounded-xl border-none bg-slate-100 hover:bg-red-100 text-red-600 shadow-none"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
