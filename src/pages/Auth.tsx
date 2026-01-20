import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SetPasswordStep } from '@/components/auth/SetPasswordStep';



const Auth = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { user, loading, signInWithOtp, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  // Password flow states
  const [passwordStep, setPasswordStep] = useState<'email' | 'login' | 'create' | 'set-password'>('email');
  const [userExists, setUserExists] = useState(false);
  const [userNeedsPassword, setUserNeedsPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('magic-link');
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (emailSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailSent, resendTimer]);

  useEffect(() => {
    if (user && !loading) {
      if (user.email_confirmed_at) {
        navigate('/');
      } else {
        setNeedsVerification(true);
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'reset-password' || mode === 'set-password' || window.location.hash.includes('type=recovery')) {
      setActiveTab('password');
      setPasswordStep('set-password');
    }
  }, []);

  // Error translation mapping
  const translateError = (errorMessage: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Correo o contraseña incorrectos.',
      'Email not confirmed': 'Debes verificar tu correo antes de entrar.',
      'User not found': 'No se encontró una cuenta con este correo.',
      'Too many requests': 'Demasiados intentos. Por favor, espera un momento.',
      'User already registered': 'Este correo ya está registrado.',
      'Password should be': 'La contraseña debe tener al menos 6 caracteres.',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }
    return errorMessage;
  };

  const handleSendMagicLink = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await signInWithOtp(email, rememberMe);
      if (error) {
        setError(translateError(error.message));
      } else {
        setEmailSent(true);
        setResendTimer(60);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Try to sign in with an empty password to detect if user has password set
      const { error } = await signInWithPassword(email, '', false);

      if (error) {
        console.log('Detection error:', error.message);

        // If "Invalid login credentials" - user EXISTS and HAS a password
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid')) {
          setUserExists(true);
          setUserNeedsPassword(false);
          setPasswordStep('login');
        }
        // If "Email not confirmed" - user exists but needs verification
        else if ((error as any).code === 'email_not_confirmed' || error.message.includes('Email not confirmed')) {
          setUserExists(true);
          setUserNeedsPassword(false);
          setPasswordStep('login');
        }
        // Any other error - assume user doesn't exist or has no password
        else {
          setUserExists(false);
          setUserNeedsPassword(true);
          setPasswordStep('create');
        }
      } else {
        // Successful login with empty password (unlikely)
        setUserExists(true);
        setPasswordStep('login');
      }
    } catch (err) {
      console.error('Email detection error:', err);
      // On any exception, assume new user
      setUserExists(false);
      setUserNeedsPassword(true);
      setPasswordStep('create');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await signInWithPassword(email.trim(), password, rememberMe);
      if (error) {
        if ((error as any).code === 'email_not_confirmed' || error.message.includes('Email not confirmed')) {
          setNeedsVerification(true);
        } else {
          setError(translateError(error.message));
        }
      } else {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordCreate = async (e: React.FormEvent) => {
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
      let redirectUrl = window.location.origin;
      if (!redirectUrl.startsWith('http')) {
        redirectUrl = `https://${redirectUrl}`;
      }
      redirectUrl = `${redirectUrl}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });

      if (error) {
        // Translate error messages
        let translatedError = error.message;
        if (error.message.includes('User already registered')) {
          translatedError = 'Este correo ya está registrado. Intenta iniciar sesión.';
        } else if (error.message.includes('Password should be')) {
          translatedError = 'La contraseña debe tener al menos 6 caracteres.';
        }
        setError(translatedError);
      } else {
        setNeedsVerification(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(translateError(error.message));
      } else {
        navigate('/configuracion');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8 text-center animate-in fade-in duration-500">
          <div className="p-4 rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Verifica tu correo</h1>
            <p className="text-muted-foreground">
              Hemos enviado un enlace de confirmación a <span className="font-semibold text-foreground">{email || (user?.email)}</span>.
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Debes confirmar tu correo para acceder al Dashboard.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => {
            setNeedsVerification(false);
            setEmailSent(false);
          }}>
            Volver al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in py-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 shadow-inner">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">TrackFinance</h1>
            <p className="text-muted-foreground text-sm mt-1">Tu control financiero, simplificado.</p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setError(''); // Clear errors when switching tabs
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger value="magic-link" className="rounded-md">Magic Link</TabsTrigger>
            <TabsTrigger value="password" className="rounded-md">Contraseña</TabsTrigger>
          </TabsList>

          <TabsContent value="magic-link">
            {!emailSent ? (
              <form onSubmit={handleSendMagicLink} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-otp" className="text-sm font-medium">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-otp"
                      type="email"
                      placeholder="nombre@ejemplo.com"
                      className="pl-10 h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="remember-otp"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-otp" className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
                    Mantener sesión iniciada
                  </Label>
                </div>

                {error && (
                  <p className="text-xs font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar enlace mágico'}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('password');
                    setError('');
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors underline pt-2"
                >
                  Volver al inicio de sesión con contraseña
                </button>
              </form>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-emerald-900">¡Enlace enviado!</h3>
                  <p className="text-sm text-emerald-700/80 leading-relaxed">
                    Hemos enviado un acceso directo a <span className="font-bold">{email}</span>.
                    Revisa tu bandeja de entrada (y spam).
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => handleSendMagicLink(e)}
                  disabled={resendTimer > 0 || isSubmitting}
                >
                  {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : 'Reenviar enlace mágico'}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setEmailSent(false)}
                >
                  Usar otro correo o método
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="password">
            {passwordStep === 'email' && (
              <form onSubmit={handleEmailContinue} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email-pwd" className="text-sm font-medium">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-pwd"
                      type="email"
                      placeholder="nombre@ejemplo.com"
                      className="pl-10 h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Verificando...' : 'Continuar'}
                </Button>

                {/* Direct Magic Link Fallback */}
                <button
                  type="button"
                  onClick={async () => {
                    setActiveTab('magic-link');
                    setError('');
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors underline pt-2"
                  disabled={isSubmitting}
                >
                  Entrar con enlace mágico
                </button>
              </form>
            )}

            {passwordStep === 'login' && (
              <form onSubmit={handlePasswordLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">{email}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPasswordStep('email');
                        setPassword('');
                        setError('');
                      }}
                      className="h-8 text-xs"
                    >
                      Cambiar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-login" className="text-sm font-medium">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password-login"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="remember-login"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label
                    htmlFor="remember-login"
                    className="text-sm font-medium leading-none cursor-pointer select-none"
                  >
                    Recordarme en este dispositivo
                  </Label>
                </div>

                {error && (
                  <p className="text-xs font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Iniciando sesión...' : 'Entrar'}
                </Button>

                {/* Emergency Magic Link / Forgot Password Button */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError('Por favor, ingresa tu correo primero.');
                      return;
                    }
                    setError('');
                    setIsSubmitting(true);
                    try {
                      let redirectUrl = window.location.origin;
                      if (!redirectUrl.startsWith('http')) {
                        redirectUrl = `https://${redirectUrl}`;
                      }
                      redirectUrl = `${redirectUrl}/`;

                      // Call resetPasswordForEmail for a secure flow that allows setting a password
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${redirectUrl}auth?mode=reset-password`,
                      });

                      if (error) {
                        setError(translateError(error.message));
                      } else {
                        // Feedback to user
                        setEmailSent(true);
                        setActiveTab('magic-link'); // Switch to magic link view to show success or next steps
                        // Optional: use toast if available, but emailSent already shows a success view in Auth.tsx
                      }
                    } catch (err) {
                      setError('Error al enviar el correo. Por favor intenta de nuevo.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors underline pt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : '¿Olvidaste tu contraseña? Restablecer acceso'}
                </button>
              </form>
            )}

            {passwordStep === 'create' && (
              <form onSubmit={handlePasswordCreate} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">{email}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
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

                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <p className="text-xs text-blue-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Crea una contraseña para tu nueva cuenta. Recibirás un correo de confirmación.</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password-create" className="text-sm font-medium">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password-create"
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
                    <Label htmlFor="password-confirm" className="text-sm font-medium">Confirmar contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password-confirm"
                        type="password"
                        placeholder="Repite tu contraseña"
                        className="pl-10 h-11"
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
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
                </Button>
              </form>
            )}

            <SetPasswordStep
              passwordStep={passwordStep}
              email={email}
              setPasswordStep={setPasswordStep}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              error={error}
              setError={setError}
              isSubmitting={isSubmitting}
              handleSetPassword={handleUpdatePassword}
            />

          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground px-8 leading-relaxed">
          Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
        </p>
      </div>
    </div>
  );
});

Auth.displayName = 'Auth';

export default Auth;