import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SetPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userEmail: string;
}

export function SetPasswordDialog({ open, onOpenChange, userEmail }: SetPasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) {
                setError(updateError.message);
            } else {
                toast({
                    title: 'Contraseña establecida',
                    description: 'Tu cuenta ahora está protegida con contraseña.',
                });
                onOpenChange(false);
                setPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            setError('Error al establecer la contraseña');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-primary/10">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl">Protege tu cuenta</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm leading-relaxed">
                        Actualmente accedes con enlaces mágicos. Crea una contraseña para tener una opción adicional de inicio de sesión más rápida.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <p className="text-xs text-blue-800 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                <strong>Cuenta:</strong> {userEmail}
                                <br />
                                Esta contraseña se guardará de forma segura y podrás usarla para entrar más rápido.
                            </span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium">
                            Nueva contraseña
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                className="pl-10 h-11"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium">
                            Confirmar contraseña
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="Repite tu contraseña"
                                className="pl-10 h-11"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </p>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Más tarde
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="gap-2">
                            <Shield className="h-4 w-4" />
                            {isSubmitting ? 'Guardando...' : 'Establecer contraseña'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
