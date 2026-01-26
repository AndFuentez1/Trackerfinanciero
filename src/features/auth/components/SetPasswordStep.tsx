import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SetPasswordStepProps {
    passwordStep: string;
    email: string;
    setPasswordStep: (step: 'email' | 'login' | 'create' | 'set-password') => void;
    password: string;
    setPassword: (val: string) => void;
    confirmPassword: string;
    setConfirmPassword: (val: string) => void;
    error: string;
    setError: (val: string) => void;
    isSubmitting: boolean;
    handleSetPassword: (e: React.FormEvent) => void;
}

export function SetPasswordStep({
    passwordStep,
    email,
    setPasswordStep,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    setError,
    isSubmitting,
    handleSetPassword,
}: SetPasswordStepProps) {
    if (passwordStep !== 'set-password') return null;

    return (
        <form onSubmit={handleSetPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">{email}</span>
                    </div>
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => {
                            setPasswordStep('email');
                            setPassword('');
                            setConfirmPassword('');
                            setError('');
                        }}
                        className="h-8 text-xs"
                    >
                        Cambiar
                    </Button>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Cuenta existente sin contraseña
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                        Tu cuenta existe pero no tiene contraseña establecida. Por seguridad, te enviaremos un correo de verificación antes de permitirte crear una.
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setPasswordStep('email');
                                const magicLinkTab = document.querySelector('[value="magic-link"]') as HTMLElement;
                                magicLinkTab?.click();
                            }}
                            className="w-full border-primary/80 bg-white text-foreground hover:bg-primary/80 hover:text-white rounded-[8.8px] transition-all duration-300 h-9"
                        >
                            ¿Prefieres entrar con un enlace a tu correo?
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password-set" className="text-sm font-medium">Nueva contraseña</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="password-set"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="pl-10 h-11 border-slate-300 rounded-[8.8px]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password-set-confirm" className="text-sm font-medium">Confirmar contraseña</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="password-set-confirm"
                            type="password"
                            placeholder="Repite tu contraseña"
                            className="pl-10 h-11 border-slate-300 rounded-[8.8px]"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>

            {error && (
                <p className="text-xs font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </p>
            )}

            <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-[8.8px]"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Enviando verificación...' : 'Establecer contraseña'}
            </Button>
        </form>
    );
}
