import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { AlertCircle, Trash2, RefreshCcw, Download, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { useDataExport } from '../hooks/useDataExport';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';
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

export function DangerZone() {
    const navigate = useNavigate();
    const { resetProfileData } = useSettingsProfile();
    const { exportSelectedData, isExporting } = useDataExport();
    const [exportSelections, setExportSelections] = useState({
        paymentMethods: true,
        transactions: true,
        categories: true,
        budgets: true,
        savings: true,
        futureExpenses: true,
    });
    const [loading, setLoading] = useState(false);
    const [dataResetOptions, setDataResetOptions] = useState({
        transactions: true,
        budgets: true,
        savings: true,
        loans: true,
        futureExpenses: true,
    });
    const [profileResetOptions, setProfileResetOptions] = useState({
        deleteProfile: false, // Default to FALSE to ensure user choice
        transactions: true,
        bgudgets: true,
        budgets: true,
        savings: true,
        loans: true,
        futureExpenses: true,
        paymentMethods: true,
        categories: true,
        profileFlags: true,
        telegramConfig: false,
        gmailPermissions: false,
    });

    type DataResetOptionKey = keyof typeof dataResetOptions;
    type ProfileResetOptionKey = keyof typeof profileResetOptions;

    const toggleDataOption = (key: DataResetOptionKey) => (checked: boolean) => {
        setDataResetOptions(prev => ({ ...prev, [key]: checked }));
    };

    const toggleProfileOption = (key: ProfileResetOptionKey) => (checked: boolean) => {
        setProfileResetOptions(prev => {
            if (key !== 'deleteProfile') {
                return { ...prev, [key]: checked };
            }

            if (!checked) {
                return { ...prev, deleteProfile: false };
            }

            return {
                ...prev,
                deleteProfile: true,
                transactions: true,
                budgets: true,
                savings: true,
                loans: true,
                futureExpenses: true,
                paymentMethods: true,
                categories: true,
                profileFlags: true,
            };
        });
    };

    const hasDataSelection = Object.values(dataResetOptions).some(Boolean);
    const canDeleteProfile = profileResetOptions.deleteProfile;

    const handleResetTotal = async () => {
        setLoading(true);
        const result = await resetProfileData({
            transactions: profileResetOptions.deleteProfile ? true : profileResetOptions.transactions,
            budgets: profileResetOptions.deleteProfile ? true : profileResetOptions.budgets,
            savings: profileResetOptions.deleteProfile ? true : profileResetOptions.savings,
            loans: profileResetOptions.deleteProfile ? true : profileResetOptions.loans,
            futureExpenses: profileResetOptions.deleteProfile ? true : profileResetOptions.futureExpenses,
            paymentMethods: profileResetOptions.deleteProfile ? true : profileResetOptions.paymentMethods,
            categories: profileResetOptions.deleteProfile ? true : profileResetOptions.categories,
            profileFlags: profileResetOptions.deleteProfile ? true : profileResetOptions.profileFlags,
            telegramConfig: profileResetOptions.telegramConfig,
            gmailPermissions: profileResetOptions.gmailPermissions,
        });
        setLoading(false);
        if ((result as { success?: boolean })?.success) {
            navigate('/');
        }
    };

    const handleResetOperations = async () => {
        setLoading(true);
        await resetProfileData({
            transactions: dataResetOptions.transactions,
            budgets: dataResetOptions.budgets,
            savings: dataResetOptions.savings,
            loans: dataResetOptions.loans,
            futureExpenses: dataResetOptions.futureExpenses,
            paymentMethods: false,
            categories: false,
            profileFlags: false,
            telegramConfig: false,
            gmailPermissions: false,
        });
        setLoading(false);
    };

    return (
        <Card className="rounded-2xl shadow-sm border-destructive/20 bg-destructive/5 overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <AlertCircle className="h-5 w-5 text-destructive" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0 text-left">
                            <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                                Zona de Peligro
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 leading-tight">Acciones irreversibles sobre tus datos</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Export Data Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-primary/10 bg-white shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center p-2.5 rounded-xl bg-primary/10 shrink-0">
                            <Download className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-semibold leading-none">Exportar datos</p>
                            <p className="text-base text-muted-foreground leading-snug">Descarga un archivo Excel con tu información financiera seleccionada.</p>
                        </div>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="default"
                                size="sm"
                                className="w-full sm:w-[220px] font-medium"
                                disabled={isExporting}
                            >
                                {isExporting ? 'Exportando...' : 'Descargar Excel'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
                            <AlertDialogCancel
                                className="absolute right-4 top-4 mt-0 h-8 w-8 rounded-lg border border-slate-300/80 bg-transparent p-0 text-muted-foreground hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60"
                                aria-label="Cerrar"
                            >
                                <X className="h-4 w-4" />
                            </AlertDialogCancel>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Exportar Datos</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Selecciona qué información deseas incluir en tu archivo Excel.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                                <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <Label htmlFor="export-transactions" className="text-sm font-semibold cursor-pointer">Transacciones</Label>
                                    <Switch
                                        id="export-transactions"
                                        checked={exportSelections.transactions}
                                        onCheckedChange={(checked) => setExportSelections(prev => ({ ...prev, transactions: checked }))}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <Label htmlFor="export-categories" className="text-sm font-semibold cursor-pointer">Categorías</Label>
                                    <Switch
                                        id="export-categories"
                                        checked={exportSelections.categories}
                                        onCheckedChange={(checked) => setExportSelections(prev => ({ ...prev, categories: checked }))}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <Label htmlFor="export-payment-methods" className="text-sm font-semibold cursor-pointer">Métodos de Pago</Label>
                                    <Switch
                                        id="export-payment-methods"
                                        checked={exportSelections.paymentMethods}
                                        onCheckedChange={(checked) => setExportSelections(prev => ({ ...prev, paymentMethods: checked }))}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <Label htmlFor="export-budgets" className="text-sm font-semibold cursor-pointer">Presupuestos</Label>
                                    <Switch
                                        id="export-budgets"
                                        checked={exportSelections.budgets}
                                        onCheckedChange={(checked) => setExportSelections(prev => ({ ...prev, budgets: checked }))}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <Label htmlFor="export-savings" className="text-sm font-semibold cursor-pointer">Ahorros</Label>
                                    <Switch
                                        id="export-savings"
                                        checked={exportSelections.savings}
                                        onCheckedChange={(checked) => setExportSelections(prev => ({ ...prev, savings: checked }))}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <Label htmlFor="export-future-expenses" className="text-sm font-semibold cursor-pointer">Gastos Futuros</Label>
                                    <Switch
                                        id="export-future-expenses"
                                        checked={exportSelections.futureExpenses}
                                        onCheckedChange={(checked) => setExportSelections(prev => ({ ...prev, futureExpenses: checked }))}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                            </div>
                            <AlertDialogFooter className="pt-2">
                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => exportSelectedData(exportSelections)}
                                    className="bg-primary hover:bg-primary/80 text-white rounded-xl"
                                    disabled={!Object.values(exportSelections).some(Boolean) || isExporting}
                                >
                                    {isExporting ? 'Exportando...' : 'Descargar Ahora'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-destructive/10 bg-white shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center p-2.5 rounded-xl bg-destructive/10 shrink-0">
                            <RefreshCcw className="h-5 w-5 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-semibold leading-none">Borrar datos</p>
                            <p className="text-base text-muted-foreground leading-snug">Borra tus datos pero mantiene categorías y métodos de pago.</p>
                        </div>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-[220px] text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive font-medium"
                            >
                                Borrar datos
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
                            <AlertDialogCancel
                                className="absolute right-4 top-4 mt-0 h-8 w-8 rounded-lg border border-slate-300/80 bg-transparent p-0 text-muted-foreground hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60"
                                aria-label="Cerrar"
                            >
                                <X className="h-4 w-4" />
                            </AlertDialogCancel>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Selecciona los datos que deseas borrar. No se eliminan métodos de pago, categorías ni llaves.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <div className="space-y-1">
                                        <Label htmlFor="data-reset-transactions" className="text-sm font-semibold">Transacciones</Label>
                                        <p className="text-xs text-muted-foreground">Ingresos, gastos y transferencias.</p>
                                    </div>
                                    <Switch
                                        id="data-reset-transactions"
                                        checked={dataResetOptions.transactions}
                                        onCheckedChange={toggleDataOption('transactions')}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <div className="space-y-1">
                                        <Label htmlFor="data-reset-budgets" className="text-sm font-semibold">Presupuestos</Label>
                                        <p className="text-xs text-muted-foreground">Presupuestos mensuales e histórico.</p>
                                    </div>
                                    <Switch
                                        id="data-reset-budgets"
                                        checked={dataResetOptions.budgets}
                                        onCheckedChange={toggleDataOption('budgets')}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <div className="space-y-1">
                                        <Label htmlFor="data-reset-savings" className="text-sm font-semibold">Ahorros</Label>
                                        <p className="text-xs text-muted-foreground">Movimientos de ahorro.</p>
                                    </div>
                                    <Switch
                                        id="data-reset-savings"
                                        checked={dataResetOptions.savings}
                                        onCheckedChange={toggleDataOption('savings')}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <div className="space-y-1">
                                        <Label htmlFor="data-reset-loans" className="text-sm font-semibold">Préstamos</Label>
                                        <p className="text-xs text-muted-foreground">Préstamos y pagos registrados.</p>
                                    </div>
                                    <Switch
                                        id="data-reset-loans"
                                        checked={dataResetOptions.loans}
                                        onCheckedChange={toggleDataOption('loans')}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                    <div className="space-y-1">
                                        <Label htmlFor="data-reset-future-expenses" className="text-sm font-semibold">Gastos futuros</Label>
                                        <p className="text-xs text-muted-foreground">Gastos programados o recurrentes.</p>
                                    </div>
                                    <Switch
                                        id="data-reset-future-expenses"
                                        checked={dataResetOptions.futureExpenses}
                                        onCheckedChange={toggleDataOption('futureExpenses')}
                                        disabled={loading}
                                    />
                                </div>

                                {!hasDataSelection && (
                                    <p className="text-xs text-destructive font-medium">
                                        Selecciona al menos una opción para continuar.
                                    </p>
                                )}
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl bg-primary/60 text-white hover:bg-primary/60 hover:text-white">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleResetOperations}
                                    className="bg-destructive text-white hover:bg-destructive/60 hover:text-white hover:border-transparent rounded-xl"
                                    disabled={!hasDataSelection || loading}
                                >
                                    {loading ? 'BORRANDO...' : 'Sí, borrar datos'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-destructive/10 bg-white shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center p-2.5 rounded-xl bg-destructive/10 text-destructive shrink-0">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-semibold leading-none">Resetear perfil</p>
                            <p className="text-base text-muted-foreground leading-snug">Elimina tus datos y reinicia tu cuenta desde cero.</p>
                        </div>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full sm:w-[220px] font-medium"
                            >
                                Resetear perfil
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl border-destructive/20 max-h-[85vh] overflow-y-auto">
                            <AlertDialogCancel
                                className="absolute right-4 top-4 mt-0 h-8 w-8 rounded-lg border border-slate-300/80 bg-transparent p-0 text-muted-foreground hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60"
                                aria-label="Cerrar"
                            >
                                <X className="h-4 w-4" />
                            </AlertDialogCancel>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-destructive">¡ADVERTENCIA!</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Selecciona exactamente qué deseas eliminar. Las integraciones se conservan por defecto.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Perfil</p>
                                    <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                        <div className="space-y-1">
                                            <Label htmlFor="reset-data-group" className="text-sm font-semibold">Eliminar perfil completo</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Borra datos, categorías, métodos de pago y configuración. Las llaves se mantienen salvo que las marques.
                                            </p>
                                        </div>
                                        <Switch
                                            id="reset-data-group"
                                            checked={profileResetOptions.deleteProfile}
                                            onCheckedChange={toggleProfileOption('deleteProfile')}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Datos</p>
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-transactions" className="text-sm font-semibold">Transacciones</Label>
                                                <p className="text-xs text-muted-foreground">Ingresos, gastos y transferencias.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-transactions"
                                                checked={profileResetOptions.transactions}
                                                onCheckedChange={toggleProfileOption('transactions')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-budgets" className="text-sm font-semibold">Presupuestos</Label>
                                                <p className="text-xs text-muted-foreground">Presupuestos mensuales e histórico.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-budgets"
                                                checked={profileResetOptions.budgets}
                                                onCheckedChange={toggleProfileOption('budgets')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-savings" className="text-sm font-semibold">Ahorros</Label>
                                                <p className="text-xs text-muted-foreground">Cuentas de ahorro y movimientos.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-savings"
                                                checked={profileResetOptions.savings}
                                                onCheckedChange={toggleProfileOption('savings')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-loans" className="text-sm font-semibold">Préstamos</Label>
                                                <p className="text-xs text-muted-foreground">Préstamos y pagos registrados.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-loans"
                                                checked={profileResetOptions.loans}
                                                onCheckedChange={toggleProfileOption('loans')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-future-expenses" className="text-sm font-semibold">Gastos futuros</Label>
                                                <p className="text-xs text-muted-foreground">Gastos programados o recurrentes.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-future-expenses"
                                                checked={profileResetOptions.futureExpenses}
                                                onCheckedChange={toggleProfileOption('futureExpenses')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Configuración</p>
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-payment-methods" className="text-sm font-semibold">Métodos de pago</Label>
                                                <p className="text-xs text-muted-foreground">Cuentas, tarjetas y saldos asociados. Incluye cuentas de ahorro.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-payment-methods"
                                                checked={profileResetOptions.paymentMethods}
                                                onCheckedChange={toggleProfileOption('paymentMethods')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-categories" className="text-sm font-semibold">Categorías</Label>
                                                <p className="text-xs text-muted-foreground">Todas las categorías personalizadas. También elimina presupuestos.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-categories"
                                                checked={profileResetOptions.categories}
                                                onCheckedChange={toggleProfileOption('categories')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="profile-reset-profile-flags" className="text-sm font-semibold">Estado del perfil</Label>
                                                <p className="text-xs text-muted-foreground">Onboarding, importaciones pendientes y bienvenida.</p>
                                            </div>
                                            <Switch
                                                id="profile-reset-profile-flags"
                                                checked={profileResetOptions.profileFlags}
                                                onCheckedChange={toggleProfileOption('profileFlags')}
                                                disabled={loading || profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Integraciones</p>
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="reset-telegram" className="text-sm font-semibold">Bot de Telegram</Label>
                                                <p className="text-xs text-muted-foreground">Elimina token, chat ID y notificaciones.</p>
                                            </div>
                                            <Switch
                                                id="reset-telegram"
                                                checked={profileResetOptions.telegramConfig}
                                                onCheckedChange={toggleProfileOption('telegramConfig')}
                                                disabled={loading || !profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                                            <div className="space-y-1">
                                                <Label htmlFor="reset-gmail" className="text-sm font-semibold">Permisos Gmail</Label>
                                                <p className="text-xs text-muted-foreground">Desconecta Gmail y elimina los tokens de acceso.</p>
                                            </div>
                                            <Switch
                                                id="reset-gmail"
                                                checked={profileResetOptions.gmailPermissions}
                                                onCheckedChange={toggleProfileOption('gmailPermissions')}
                                                disabled={loading || !profileResetOptions.deleteProfile}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!canDeleteProfile && (
                                    <p className="text-xs text-destructive font-medium">
                                        Activa “Eliminar perfil completo” para continuar.
                                    </p>
                                )}
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl bg-primary/60 text-white hover:bg-primary/60 hover:text-white">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleResetTotal();
                                    }}
                                    className="bg-destructive text-white hover:bg-destructive/60 hover:text-white hover:border-transparent rounded-xl"
                                    disabled={!canDeleteProfile || loading}
                                >
                                    {loading ? 'BORRANDO...' : 'ESTOY SEGURO, BORRAR'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card >
    );
}
