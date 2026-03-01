import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Lock, LogOut, Shield, Key, Mail } from 'lucide-react';
import { Button } from "@/shared/ui/button";
import { SetPasswordDialog } from "@/features/auth/components/SetPasswordDialog";
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGmailTokenStatus } from '@/features/settings/hooks/useGmailTokenStatus';

export function SecuritySection() {
    const { user, signOut } = useAuth();
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const { status: gmailStatus, loading: gmailLoading } = useGmailTokenStatus();

    const formatExpiryTime = (expiresIn: number | null) => {
        if (!expiresIn || expiresIn <= 0) return 'Expirado';

        const hours = Math.floor(expiresIn / 3600);
        const minutes = Math.floor((expiresIn % 3600) / 60);

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days} día${days > 1 ? 's' : ''}`;
        }
        if (hours > 0) {
            return `${hours} hora${hours > 1 ? 's' : ''}`;
        }
        return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    };

    const handleGmailConnect = () => {
        if (!user?.id || !user?.email) return;
        window.open(`/auth/google?userId=${user.id}&email=${user.email}`, '_blank', 'width=600,height=700');
    };

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <Shield className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base sm:text-lg font-bold text-muted-foreground tracking-tight leading-none">
                                Seguridad y cuenta
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 leading-tight">Gestiona el acceso a tu cuenta y tu sesión</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center p-2.5 rounded-xl bg-primary/10 shrink-0">
                            <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-semibold leading-none">Contraseña</p>
                            <p className="text-base text-muted-foreground leading-snug">Establece una contraseña para entrar más rápido</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPasswordDialog(true)}
                        className="w-full sm:w-[220px] font-medium"
                    >
                        Cambiar / Establecer
                    </Button>
                </div>



                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center p-2.5 rounded-xl bg-destructive/10 shrink-0">
                            <LogOut className="h-5 w-5 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-semibold leading-none">Cerrar sesión</p>
                            <p className="text-base text-muted-foreground leading-snug">Cierra tu sesión en este dispositivo</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signOut()}
                        className="w-full sm:w-[220px] border-destructive text-destructive bg-white hover:bg-destructive/10 hover:text-destructive hover:border-destructive font-medium"
                    >
                        Cerrar sesión ahora
                    </Button>
                </div>

                {user && (
                    <SetPasswordDialog
                        open={showPasswordDialog}
                        onOpenChange={setShowPasswordDialog}
                        userEmail={user.email || ''}
                    />
                )}
            </CardContent>
        </Card>
    );
}


