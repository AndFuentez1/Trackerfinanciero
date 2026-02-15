import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Lock, LogOut, Shield, Key } from 'lucide-react';
import { Button } from "@/shared/ui/button";
import { SetPasswordDialog } from "@/features/auth/components/SetPasswordDialog";
import { useAuth } from '@/features/auth/hooks/useAuth';

export function SecuritySection() {
    const { user, signOut } = useAuth();
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                    <Shield className="h-5 w-5 text-primary" />
                    Seguridad y cuenta
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">Gestiona el acceso a tu cuenta y tu sesión</CardDescription>
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


