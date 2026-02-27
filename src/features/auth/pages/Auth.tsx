import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '@/shared/hooks/useSEO';
import { useEffect, useState, forwardRef } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getBackendUrl } from '@/core/api/backend';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Wallet, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SetPasswordStep } from '@/features/auth/components/SetPasswordStep';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Checkbox } from '@/shared/ui/checkbox';
import { calculateProportionalTheme } from '@/features/finance/utils/themeCalculations';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';

const Auth = forwardRef<HTMLDivElement>((_, ref) => {
  useSEO({
    title: 'Ingreso',
    description: 'Securely access your financial tracker account.'
  });
  const navigate = useNavigate();
  const { user, loading, signInWithOtp, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [userName, setUserName] = useState('');
  // Rate limiting states
  const [lastEmailSentTime, setLastEmailSentTime] = useState(0);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [isProcessingTokens, setIsProcessingTokens] = useState(false);

  // Password flow states
  const [passwordStep, setPasswordStep] = useState<'email' | 'login' | 'create' | 'set-password'>('email');
  const [activeTab, setActiveTab] = useState<string>('magic-link');
  const [resendTimer, setResendTimer] = useState(60);
  const [isLoginMode, setIsLoginMode] = useState(true);

  useEffect(() => {
    // Wake up backend ping
    try {
      fetch(`${getBackendUrl()}/health`).catch(() => { });
    } catch { }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (emailSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailSent, resendTimer]);

  // Rate limit countdown effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (rateLimitCountdown > 0) {
      interval = setInterval(() => {
        setRateLimitCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue === 0) {
            setRateLimitError(false);
          }
          return newValue;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [rateLimitCountdown]);

  // REMOVED: Redirect logic is handled by App.tsx routing
  // This was causing a redirect loop when Google OAuth redirected back
  // useEffect(() => {
  //   if (user && !loading) {
  //     if (user.email_confirmed_at) {
  //       navigate('/');
  //     } else {
  //       setNeedsVerification(true);
  //     }
  //   }
  // }, [user, loading, navigate]);

  useEffect(() => {
    // Detect if we are in an OAuth callback or recovery flow
    const hash = window.location.hash || '';
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    const hasOAuthTokens =
      hash.includes('access_token') ||
      hash.includes('refresh_token') ||
      hash.includes('type=recovery') ||
      window.location.search.includes('code=');

    if (hasOAuthTokens || mode === 'reset-password' || mode === 'set-password') {
      setIsProcessingTokens(true);
      if (mode === 'reset-password' || mode === 'set-password' || hash.includes('type=recovery')) {
        setActiveTab('password');
        setPasswordStep('set-password');
      }

      // Safety timeout: if after 10s we haven't redirected, show the form
      const timer = setTimeout(() => setIsProcessingTokens(false), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Error translation mapping
  const translateError = (errorMessage: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Correo o contraseña incorrectos.',
      'Email not confirmed': 'Debes verificar tu correo antes de entrar.',
      'User not found': 'No se encontró una cuenta con este correo.',
      'Too many requests': 'Danos unos minutos.',
      'User already registered': 'Este correo ya está registrado.',
      'Password should be': 'La contraseña debe tener al menos 6 caracteres.',
      'Email rate limit exceeded': 'Danos unos minutos.',
      'over_email_send_rate_limit': 'Danos unos minutos.',
      'rate limit': 'Danos unos minutos.',
      'Failed to fetch': 'Danos unos minutos.',
      'Network request failed': 'Danos unos minutos.',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage?.includes(key)) {
        return value;
      }
    }
    return errorMessage || 'Error de autenticación';
  };

  // Rate limit validation (120 segundos entre envíos)
  const checkAndUpdateRateLimit = (): boolean => {
    const now = Date.now();
    const timeSinceLastEmail = now - lastEmailSentTime;
    const RATE_LIMIT_MS = 120000; // 120 segundos

    if (timeSinceLastEmail < RATE_LIMIT_MS) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_MS - timeSinceLastEmail) / 1000);
      setRateLimitError(true);
      setRateLimitCountdown(remainingSeconds);
      setError(''); // No mostrar en UI, solo en botón
      return false;
    }

    setRateLimitError(false);
    setRateLimitCountdown(0);
    setLastEmailSentTime(now);
    return true;
  };

  const handleSendMagicLink = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) { e.preventDefault(); }
    setError('');

    // Validar rate limit antes de proceder
    if (!checkAndUpdateRateLimit()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: otpError } = await signInWithOtp(email, rememberMe);
      if (otpError) {
        const isOverEmailLimit =
          otpError.message?.includes('over_email_send_rate_limit') ||
          otpError.message?.includes('Email rate limit exceeded') ||
          otpError.message?.includes('rate limit') ||
          otpError.message?.includes('429') ||
          otpError.message?.toLowerCase().includes('too many');

        if (isOverEmailLimit) {
          // Tratamos como enviado para mostrar el estado genérico "Revisa tu correo"
          setEmailSent(true);
          setResendTimer(120);
          setRateLimitError(true);
          setRateLimitCountdown(120);
          setError('');
        } else {
          setError(translateError(otpError.message || 'Error'));
        }
      } else {
        setEmailSent(true);
        setResendTimer(120);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleSubmitting(true);

    try {
      // Construct dynamic redirect URL based on environment
      const origin = window.location.origin;
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      // If localhost, redirect to root '/'. Emulate prod BASE_URL only if actually in prod.
      const baseUrl = isLocalhost ? '/' : import.meta.env.BASE_URL;
      const redirectTo = `${origin}${baseUrl}`; // Points to root, not /auth

      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        }
      });

      if (googleError) {
        setError('No se pudo iniciar con Google. Intenta de nuevo.');
      }
      // La redirección ocurre automáticamente si no hay error
    } catch {
      setError('No se pudo iniciar con Google. Intenta de nuevo.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };


  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { data, error: authError } = await signInWithPassword(email.trim(), password, rememberMe);

      if (authError) {
        const authErrObj = authError as { status?: number, error?: string, code?: string };
        const errorStatus = authErrObj.status;
        const errorError = authErrObj.error;

        if (errorStatus === 400 && errorError === 'invalid_grant') {
          setIsSubmitting(false);
          setError('');
          await handleSendMagicLink(e);
          return;
        }

        if (authError.message?.includes('Invalid login credentials') || authError.message?.includes('invalid')) {
          setError('Correo o contraseña incorrectos.');
        } else if (authErrObj.code === 'email_not_confirmed' || authError.message?.includes('Email not confirmed')) {
          setNeedsVerification(true);
        } else {
          setError(translateError(authError.message || 'Error'));
        }
      } else if (data?.user) {
        // Redirection is handled automatically by PublicRoute reacting to AuthContext changes.
        // This avoids race conditions between navigating and the context updating.
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

    if (!userName.trim()) {
      setError('Por favor, ingresa tu nombre completo');
      return;
    }

    setIsSubmitting(true);

    try {
      const origin = window.location.origin;
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      const baseUrl = isLocalhost ? '/' : import.meta.env.BASE_URL;
      const redirectUrl = `${origin}${baseUrl}`;

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: userName.trim(),
          },
          emailRedirectTo: redirectUrl,
        }
      });

      if (signUpError) {
        let translatedError = signUpError.message || 'Error';
        if (signUpError.message?.includes('User already registered')) {
          translatedError = 'Este correo ya está registrado. Intenta iniciar sesión.';
        } else if (signUpError.message?.includes('Password should be')) {
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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(translateError(updateError.message || 'Error'));
      } else {
        navigate('/settings');
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading || isProcessingTokens) {
    return <SkeletonLoader tab="auth" fullPage />;
  }

  if (needsVerification) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-8 text-center animate-in fade-in duration-500">
          <div className="p-4 rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold">Verifica tu correo</h1>
            <p className="text-muted-foreground" aria-live="polite">
              Hemos enviado un enlace de confirmación a <span className="font-semibold text-foreground">{email || (user?.email)}</span>.
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Debes confirmar tu correo para acceder al Dashboard.
            </p>
          </div>
          <Button variant="default" className="w-full" onClick={() => {
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
      <div className="w-full max-w-md space-y-4 animate-fade-in py-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 shadow-inner">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">TrackFinance</h1>
            <p className="text-muted-foreground text-sm mt-1">Tu control financiero, simplificado.</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-11 text-base font-semibold flex items-center justify-center gap-2 bg-white border border-slate-300 rounded-[8.8px] transition-all duration-300 text-foreground opacity-100 hover:bg-slate-100 hover:text-foreground focus:bg-gray-200 active:bg-gray-200"
          style={{ boxShadow: 'none' }}
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || isGoogleSubmitting}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 533.5 544.3"
            className="h-4 w-4"
          >
            <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.2H272v95.1h147.3c-6.4 34.5-25.9 63.7-55.2 83.1v68.9h89.2c52.2-48.1 80.2-119 80.2-196.9z" />
            <path fill="#34a853" d="M272 544.3c74.7 0 137.3-24.7 183.1-67.1l-89.2-68.9c-24.7 16.6-56.5 26.2-93.9 26.2-72.2 0-133.4-48.7-155.3-114.1H25.8v71.6c45.5 90.2 138.8 152.3 246.2 152.3z" />
            <path fill="#fbbc04" d="M116.7 320.4c-5.5-16.6-8.7-34.3-8.7-52.4 0-18.2 3.3-35.8 8.7-52.4V143H25.8C9.3 176.3 0 213.5 0 252.6c0 39.1 9.3 76.3 25.8 109.6z" />
            <path fill="#ea4335" d="M272 107.7c40.6 0 77.1 14 105.9 41.6l79.5-79.5C409.3 24.7 346.7 0 272 0 164.6 0 71.3 62.1 25.8 152.3l90.9 72.6C138.6 156.4 199.8 107.7 272 107.7z" />
          </svg>
          Continuar con Google
        </Button>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setError('');
          }}
          className="w-full flex flex-col"
        >
          <TabsList className="flex w-full p-1 gap-2 mb-8 bg-muted/20 border border-slate-300 rounded-[8px]">
            <TabsTrigger value="magic-link" className="rounded-[7px] flex-1 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-slate-300 border border-transparent data-[state=inactive]:hover:border-slate-300 data-[state=inactive]:hover:border-2 transition-all duration-300 ease-in-out">Magic Link</TabsTrigger>
            <TabsTrigger value="password" className="rounded-[7px] flex-1 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-2 data-[state=active]:border-slate-300 border border-transparent data-[state=inactive]:hover:border-slate-300 data-[state=inactive]:hover:border-2 transition-all duration-300 ease-in-out">Contraseña</TabsTrigger>
          </TabsList>

          <TabsContent value="magic-link" className="animate-in fade-in duration-300">
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
                      className="pl-10 h-11 border-default/80 rounded-[8.8px]"
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
                    className="border border-slate-300 shadow-[0_0_48px_0_rgba(var(--color-primary),1)] hover:shadow-[0_0_56px_0_rgba(var(--color-primary),1)] transition-shadow"
                  />
                  <Label htmlFor="remember-otp" className="text-sm text-muted-foreground cursor-pointer">
                    Mantener sesión iniciada
                  </Label>
                </div>

                {error && (
                  <p className="text-xs font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-center gap-2" role="alert">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-[8.8px]"
                  disabled={isSubmitting || rateLimitError}
                >
                  {isSubmitting ? 'Enviando...' : rateLimitError ? `Espera un momento antes de reintentar (${rateLimitCountdown}s)` : 'Enviar enlace mágico'}
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
                <div className="bg-muted border border-muted-foreground/30 p-6 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-white border border-primary/60 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">¡Enlace enviado!</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" aria-live="polite">
                    Hemos enviado un acceso directo a <span className="font-bold">{email}</span>.
                    Revisa tu bandeja de entrada (y spam).
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-primary/80 bg-white text-foreground hover:bg-primary/80 hover:text-white rounded-[8.8px] transition-all duration-300"
                  onClick={(e) => handleSendMagicLink(e)}
                  disabled={resendTimer > 0 || isSubmitting || rateLimitError}
                >
                  {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : rateLimitError ? `Espera un momento (${rateLimitCountdown}s)` : 'Reenviar enlace mágico'}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-primary/80 bg-white text-foreground hover:bg-primary/80 hover:text-white rounded-[8.8px] transition-all duration-300"
                  onClick={() => setEmailSent(false)}
                >
                  Usar otro correo o método
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="password" className="animate-in fade-in duration-300">
            {emailSent ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-muted border border-muted-foreground/30 p-6 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-white border border-primary/60 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">¡Verifica tu correo!</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Hemos enviado un enlace de confirmación a <span className="font-bold">{email}</span>.
                    Abre el enlace para activar tu cuenta.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-primary/80 bg-white text-foreground hover:bg-primary/80 hover:text-white rounded-[8.8px] transition-all duration-300"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                    setUserName('');
                  }}
                >
                  Continuar
                </Button>
              </div>
            ) : passwordStep === 'set-password' ? null : (
              <form onSubmit={isLoginMode ? handlePasswordLogin : handlePasswordCreate} className="space-y-5">
                {!isLoginMode && (
                  <div className="space-y-2">
                    <Label htmlFor="name-direct" className="text-sm font-medium">Nombre Completo</Label>
                    <Input
                      id="name-direct"
                      type="text"
                      placeholder="Tu nombre completo"
                      className="h-11 border-default/80 rounded-[8.8px]"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email-direct" className="text-sm font-medium">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-direct"
                      type="email"
                      placeholder="nombre@ejemplo.com"
                      className="pl-10 h-11 border-default/80 rounded-[8.8px]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-direct" className="text-sm font-medium">Contraseña</Label>
                    {isLoginMode && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!email) {
                            setError('Por favor, ingresa tu correo primero.');
                            return;
                          }
                          if (!checkAndUpdateRateLimit()) { return; }

                          setError('');
                          setIsSubmitting(true);
                          try {
                            const origin = window.location.origin;
                            const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
                            const baseUrl = isLocalhost ? '/' : import.meta.env.BASE_URL;
                            const { error: resetError } = await supabase.auth.signInWithOtp({
                              email: email.trim(),
                              options: {
                                shouldCreateUser: false,
                                emailRedirectTo: `${origin}${baseUrl}`,
                              }
                            });
                            if (resetError) {
                              const isOverEmailLimit = resetError.message?.includes('rate_limit') || resetError.message?.includes('429');
                              if (isOverEmailLimit) {
                                setEmailSent(true);
                                setRateLimitError(true);
                                setRateLimitCountdown(60);
                              } else {
                                setError(translateError(resetError.message || 'Error'));
                              }
                            } else {
                              setEmailSent(true);
                            }
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="text-xs text-primary hover:underline"
                        disabled={isSubmitting || rateLimitError}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password-direct"
                      type="password"
                      placeholder={isLoginMode ? "••••••••" : "Mínimo 6 caracteres"}
                      className="pl-10 h-11 border-default/80 rounded-[8.8px]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {!isLoginMode && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password-direct" className="text-sm font-medium">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password-direct"
                        type="password"
                        placeholder="Repite tu contraseña"
                        className="pl-10 h-11 border-default/80 rounded-[8.8px]"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="remember-direct"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border border-slate-300 shadow-[0_0_48px_0_rgba(var(--color-primary),1)] hover:shadow-[0_0_56px_0_rgba(var(--color-primary),1)] transition-shadow"
                  />
                  <Label htmlFor="remember-direct" className="text-sm text-muted-foreground cursor-pointer">
                    Mantener sesión iniciada
                  </Label>
                </div>

                {error && (
                  <p className="text-xs font-medium text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-center gap-2" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-[8.8px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (isLoginMode ? 'Iniciando sesión...' : 'Creando cuenta...') : (isLoginMode ? 'Entrar' : 'Crear cuenta')}
                </Button>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      setError('');
                    }}
                    className="w-full text-sm text-primary hover:underline transition-colors font-medium"
                    disabled={isSubmitting}
                  >
                    {isLoginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('magic-link');
                      setError('');
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-primary transition-colors underline"
                    disabled={isSubmitting}
                  >
                    Entrar con enlace mágico
                  </button>
                </div>
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


