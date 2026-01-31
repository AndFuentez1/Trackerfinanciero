import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Trash2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
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

export function DangerZone() {
    const { resetProfileData, resetOperationalData } = useSettingsProfile();
    const [loading, setLoading] = useState(false);

    const handleResetTotal = async () => {
        setLoading(true);
        await resetProfileData();
        setLoading(false);
    };

    const handleResetOperations = async () => {
        setLoading(true);
        await resetOperationalData();
        setLoading(false);
    };

    return (
        <Card className="rounded-2xl shadow-sm border-destructive/20 bg-destructive/5 overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Zona de Peligro
                </CardTitle>
                <CardDescription className="text-destructive/80 font-medium">Acciones irreversibles sobre tus datos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-destructive/10 bg-white/50 backdrop-blur-sm gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/10">
                            <RefreshCcw className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Borrado de datos operativos</p>
                            <p className="text-xs text-muted-foreground">Borra transacciones, préstamos y presupuestos pero MANTIENE categorías y métodos de pago.</p>
                        </div>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10 font-medium"
                            >
                                Borrar transacciones
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción eliminará todas tus transacciones, préstamos y presupuestos.
                                    Tus categorías y cuentas (métodos de pago) se conservarán con saldo 0.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleResetOperations}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                >
                                    Sí, borrar transacciones
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-destructive/10 bg-white/50 backdrop-blur-sm gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Reset total de perfil</p>
                            <p className="text-xs text-muted-foreground">Elimina ABSOLUTAMENTE TODO y reinicia tu cuenta desde cero.</p>
                        </div>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full sm:w-auto font-medium"
                            >
                                Resetear perfil completo
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl border-destructive/20">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-destructive">¡ADVERTENCIA CRÍTICA!</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es irreversible. Se eliminarán transacciones, categorías, cuentas, presupuestos y configuraciones.
                                    Tu perfil volverá al estado inicial.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleResetTotal}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                >
                                    ESTOY SEGURO, BORRAR TODO
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
