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
import { CategoryRow } from '@/components/finance/CategoryRow';
import { EditPaymentMethodDialog } from '@/components/finance/EditPaymentMethodDialog';
import { AddPaymentMethodDialog } from '@/components/finance/AddPaymentMethodDialog';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Sidebar } from '@/components/Sidebar';
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

export default function Configuracion() {
    // Simulación de loading para estructura base
    const [loading] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-row">
                <Sidebar />
                <div className="flex-1">
                    <SkeletonLoader tab="config" />
                </div>
            </div>
        );
    }

    // Main UI
    return (
        <div className="min-h-screen flex flex-row">
            <Sidebar />
            <div className="flex-1">
                <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                            <p className="text-muted-foreground">Gestiona tus categorías, métodos de pago, sesión y preferencias.</p>
                        </div>
                    </div>

                    {/* Card: Tema de la app */}
                    <Card className="rounded-2xl shadow-lg border-none bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <Settings className="h-6 w-6 text-primary" />
                                Tema de la app
                            </CardTitle>
                            <CardDescription>Elige el color base de la aplicación</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...aquí va el selector de tema... */}</CardContent>
                    </Card>

                    {/* Card: Gestión de categorías */}
                    <Card className="rounded-2xl shadow-lg border-none bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <Book className="h-6 w-6 text-primary" />
                                Gestión de Categorías
                            </CardTitle>
                            <CardDescription>Configura tus categorías aquí para completar tu perfil.</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...tabs y lista de categorías... */}</CardContent>
                    </Card>

                    {/* Card: Métodos de pago */}
                    <Card className="rounded-2xl shadow-lg border-none bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <Wallet className="h-6 w-6 text-primary" />
                                Métodos de Pago
                            </CardTitle>
                            <CardDescription>Configura tus cuentas y tarjetas aquí para completar tu perfil.</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...lista de métodos de pago... */}</CardContent>
                    </Card>

                    {/* Card: Número de decimales */}
                    <Card className="rounded-2xl shadow-lg border-none bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <Banknote className="h-6 w-6 text-primary" />
                                Números decimales
                            </CardTitle>
                            <CardDescription>Configura cuántos decimales mostrar en moneda</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...slider de decimales... */}</CardContent>
                    </Card>

                    {/* Card: Moneda principal */}
                    <Card className="rounded-2xl shadow-lg border-none bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <Globe className="h-6 w-6 text-primary" />
                                Moneda Principal
                            </CardTitle>
                            <CardDescription>Selecciona la moneda que se usará para tus reportes.</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...selector de moneda... */}</CardContent>
                    </Card>

                    {/* Card: Gestión de contraseña */}
                    <Card className="rounded-2xl shadow-lg border-none bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <Lock className="h-6 w-6 text-primary" />
                                Seguridad
                            </CardTitle>
                            <CardDescription>Configura una contraseña para proteger tu acceso.</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...botón para abrir dialog de contraseña... */}</CardContent>
                    </Card>

                    {/* Card: Cerrar sesión */}
                    <Card className="rounded-2xl shadow-lg border-none bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                                <LogOut className="h-6 w-6 text-destructive" />
                                Cerrar sesión
                            </CardTitle>
                            <CardDescription>Cerrar sesión en este dispositivo.</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...botón cerrar sesión... */}</CardContent>
                    </Card>

                    {/* Card: Zona de peligro (Reinicio de perfil y borrar datos) */}
                    <Card className="rounded-2xl shadow-lg border-none bg-red-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-black">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                                Zona de Peligro
                            </CardTitle>
                            <CardDescription className="text-black">Acciones irreversibles sobre tu cuenta.</CardDescription>
                        </CardHeader>
                        <CardContent>{/* ...botones de reset y borrar datos... */}</CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
