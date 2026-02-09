import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Mail, Key, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/shared/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Switch } from '@/shared/ui/switch';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface ConfigStatus {
    gmailConnected: boolean;
    geminiConfigured: boolean;
    telegramConfigured: boolean;
    gmailConnectedAt?: string;
    geminiConfiguredAt?: string;
    telegramConfiguredAt?: string;
    notifyRulesExceptions?: boolean;
    notifyAiExceptions?: boolean;
    hasEmail?: boolean;
}

export function AdvancedSettings() {
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Gemini API Key
    const [geminiKey, setGeminiKey] = useState('');
    const [savingGemini, setSavingGemini] = useState(false);

    // Telegram
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [notifyRulesExceptions, setNotifyRulesExceptions] = useState(false);
    const [notifyAiExceptions, setNotifyAiExceptions] = useState(false);
    const [savingTelegram, setSavingTelegram] = useState(false);

    // Confirmation Dialog
    const [pendingAction, setPendingAction] = useState<'gemini' | 'telegram' | null>(null);
    const [showEmailConfirm, setShowEmailConfirm] = useState(false);

    // Fetch config status using React Query
    const { data: configStatus, isLoading: loading } = useQuery({
        queryKey: ['userConfig', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const response = await fetch(`${BACKEND_URL}/api/user/config/status?userId=${user.id}`);
            if (!response.ok) throw new Error('Failed to fetch config');
            return await response.json() as ConfigStatus;
        },
        enabled: !!user?.id,
        // Cache indefinitely to prevent layout shift/loading skeleton on tab switch
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    // Update local state when config loads
    useEffect(() => {
        if (configStatus) {
            setNotifyRulesExceptions(configStatus.notifyRulesExceptions ?? false);
            setNotifyAiExceptions(configStatus.notifyAiExceptions ?? false);
        }
    }, [configStatus]);

    const connectGmail = () => {
        if (!user?.id || !user?.email) {
            toast({
                title: 'Error',
                description: 'No hay sesión activa',
                variant: 'destructive'
            });
            return;
        }

        // Abrir OAuth flow en nueva ventana
        const authUrl = `${BACKEND_URL}/auth/google?userId=${user.id}&email=${encodeURIComponent(user.email)}`;
        window.open(authUrl, '_blank', 'width=600,height=700');

        // Recargar estado después de 5 segundos
        setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['userConfig', user.id] });
        }, 5000);
    };

    const disconnectGmail = async () => {
        if (!user?.id) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/user/config/gmail/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) throw new Error('Error desconectando Gmail');

            toast({
                title: 'Gmail desconectado',
                description: 'Tu cuenta de Gmail ha sido desconectada'
            });

            queryClient.invalidateQueries({ queryKey: ['userConfig', user.id] });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo desconectar Gmail',
                variant: 'destructive'
            });
        }
    };

    const performSaveGemini = async (includeEmail: boolean = false) => {
        if (!user?.id || !geminiKey.trim()) return;

        try {
            setSavingGemini(true);

            const body: any = {
                userId: user.id,
                geminiApiKey: geminiKey
            };
            if (includeEmail && user.email) {
                body.email = user.email;
            }

            const response = await fetch(`${BACKEND_URL}/api/user/config/gemini`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error('Error guardando Gemini API Key');

            toast({
                title: 'Gemini configurado',
                description: 'Tu API Key ha sido guardada de forma segura'
            });

            setGeminiKey('');
            queryClient.invalidateQueries({ queryKey: ['userConfig', user.id] });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo guardar la API Key',
                variant: 'destructive'
            });
        } finally {
            setSavingGemini(false);
            setPendingAction(null);
            setShowEmailConfirm(false);
        }
    };

    const handleSaveGeminiClick = () => {
        if (!user?.id || !geminiKey.trim()) {
            toast({
                title: 'Error',
                description: 'Ingresa una API Key válida',
                variant: 'destructive'
            });
            return;
        }

        if (!configStatus?.hasEmail && user.email) {
            setPendingAction('gemini');
            setShowEmailConfirm(true);
        } else {
            performSaveGemini();
        }
    };

    // Optimistic Toggle Handler
    const handleToggleChange = async (type: 'rules' | 'ai', value: boolean) => {
        if (!user?.id) return;

        // Optimistic update
        if (type === 'rules') {
            setNotifyRulesExceptions(value);
            if (value) setNotifyAiExceptions(false); // Mutually exclusive logic
        } else {
            setNotifyAiExceptions(value);
            if (value) setNotifyRulesExceptions(false);
        }

        try {
            const body: any = {
                userId: user.id,
                // Partial update: don't send botToken/chatId unless we are saving them
                notifyRulesExceptions: type === 'rules' ? value : (value ? false : notifyRulesExceptions),
                notifyAiExceptions: type === 'ai' ? value : (value ? false : notifyAiExceptions)
            };

            // If user has no email in DB, we MUST attach it to this save too to ensure record exists
            if (!configStatus?.hasEmail && user.email) {
                body.email = user.email;
            }

            const response = await fetch(`${BACKEND_URL}/api/user/config/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error('Failed to save toggle');

            // Background revalidation
            queryClient.invalidateQueries({ queryKey: ['userConfig', user.id] });

        } catch (error) {
            // Revert state on error (pessimistic rollback)
            toast({
                title: 'Error',
                description: 'No se pudo guardar el cambio',
                variant: 'destructive'
            });
            queryClient.invalidateQueries({ queryKey: ['userConfig', user.id] });
        }
    };


    const performSaveTelegram = async (includeEmail: boolean = false) => {
        if (!user?.id) return;

        try {
            setSavingTelegram(true);

            const body: any = {
                userId: user.id,
                botToken: telegramBotToken.trim() || undefined, // undefined to trigger partial update logic in backend
                chatId: telegramChatId.trim() || undefined,
                notifyRulesExceptions, // Send current state
                notifyAiExceptions
            };
            if (includeEmail && user.email) {
                body.email = user.email;
            }

            const response = await fetch(`${BACKEND_URL}/api/user/config/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error('Error guardando configuración de Telegram');

            toast({
                title: 'Telegram configurado',
                description: 'Credenciales guardadas correctamente'
            });

            setTelegramBotToken('');
            setTelegramChatId('');
            queryClient.invalidateQueries({ queryKey: ['userConfig', user.id] });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo guardar la configuración',
                variant: 'destructive'
            });
        } finally {
            setSavingTelegram(false);
            setPendingAction(null);
            setShowEmailConfirm(false);
        }
    };

    const handleSaveTelegramClick = () => {
        if (!user?.id) return;

        if (!configStatus?.hasEmail && user.email) {
            setPendingAction('telegram');
            setShowEmailConfirm(true);
        } else {
            performSaveTelegram();
        }
    };

    const onConfirmEmail = () => {
        if (pendingAction === 'gemini') {
            performSaveGemini(true);
        } else if (pendingAction === 'telegram') {
            performSaveTelegram(true);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Configuraciones Avanzadas</CardTitle>
                    <CardDescription>Cargando información del servidor...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Configuraciones Avanzadas</CardTitle>
                    <CardDescription>
                        Configura integraciones opcionales para procesamiento automático de facturas
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Gmail OAuth */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Mail className="h-5 w-5 text-muted-foreground" />
                                Gmail
                            </Label>
                            {configStatus?.gmailConnected ? (
                                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Conectado
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <XCircle className="h-4 w-4" />
                                    No conectado
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Conecta tu cuenta de Gmail para procesar facturas automáticamente
                        </p>
                        <div className="flex justify-end">
                            {configStatus?.gmailConnected ? (
                                <Button variant="outline" size="sm" onClick={disconnectGmail} className="w-40 text-destructive border-destructive hover:bg-destructive/10">
                                    Desconectar
                                </Button>
                            ) : (
                                <Button size="sm" onClick={connectGmail} className="w-40">
                                    Conectar Gmail
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="border-t" />

                    {/* Gemini API Key */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Key className="h-5 w-5 text-muted-foreground" />
                                Gemini AI (Opcional)
                            </Label>
                            {configStatus?.geminiConfigured ? (
                                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Configurado
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <XCircle className="h-4 w-4" />
                                    No configurado
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Agrega tu API Key de Google Gemini para categorización inteligente.
                        </p>
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <Label htmlFor="gemini-key" className="text-xs text-muted-foreground">API Key</Label>
                                <div className="flex gap-3">
                                    <Input
                                        id="gemini-key"
                                        type="password"
                                        placeholder={configStatus?.geminiConfigured ? "••••••••••••••••••••••••" : "AIzaSy..."}
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleSaveGeminiClick}
                                        disabled={savingGemini || !geminiKey.trim()}
                                        size="sm"
                                        className="w-40"
                                    >
                                        {savingGemini ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Guardar Key'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Obtén tu API Key en{' '}
                            <a
                                href="https://makersuite.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Google AI Studio
                            </a>
                        </p>
                    </div>

                    <div className="border-t" />

                    {/* Telegram (Opcional) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Send className="h-5 w-5 text-muted-foreground" />
                                Telegram (Opcional)
                            </Label>
                            {configStatus?.telegramConfigured ? (
                                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Configurado
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <XCircle className="h-4 w-4" />
                                    No configurado
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Configura para validar manualmente facturas que el sistema no pudo clasificar.
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-4 rounded-lg border p-4 bg-card/50">
                                <h4 className="font-medium text-sm">Credenciales del Bot</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="telegram-bot-token" className="text-xs text-muted-foreground">
                                            Bot Token
                                        </Label>
                                        <Input
                                            id="telegram-bot-token"
                                            type="password"
                                            placeholder={configStatus?.telegramConfigured ? "••••••••••••••" : "Ej: 123456:ABC-DEF..."}
                                            value={telegramBotToken}
                                            onChange={(e) => setTelegramBotToken(e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="telegram-chat-id" className="text-xs text-muted-foreground">
                                            Chat ID
                                        </Label>
                                        <Input
                                            id="telegram-chat-id"
                                            type="text"
                                            placeholder={configStatus?.telegramConfigured ? "Reemplazar ID..." : "Ej: 987654321"}
                                            value={telegramChatId}
                                            onChange={(e) => setTelegramChatId(e.target.value)}
                                            pattern="[0-9]*"
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-lg border p-4 bg-card/50">
                                <h4 className="font-medium text-sm">Reglas de Notificación</h4>
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex flex-1 items-start justify-between space-x-2">
                                        <Label htmlFor="notify-rules" className="flex flex-col space-y-1 cursor-pointer">
                                            <span>Revisar Excepciones (Reglas)</span>
                                            <span className="font-normal text-xs text-muted-foreground">
                                                Notificar si las reglas fallan (Categoría: "Otros"). Solo si NO usas AI.
                                            </span>
                                        </Label>
                                        <Switch
                                            id="notify-rules"
                                            checked={notifyRulesExceptions}
                                            onCheckedChange={(checked) => handleToggleChange('rules', checked)}
                                        />
                                    </div>
                                    <div className="flex flex-1 items-start justify-between space-x-2">
                                        <Label htmlFor="notify-ai" className="flex flex-col space-y-1 cursor-pointer">
                                            <span>Revisar Excepciones (IA)</span>
                                            <span className="font-normal text-xs text-muted-foreground">
                                                Notificar si el Agente IA falla o es incierto.
                                            </span>
                                        </Label>
                                        <Switch
                                            id="notify-ai"
                                            checked={notifyAiExceptions}
                                            onCheckedChange={(checked) => handleToggleChange('ai', checked)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleSaveTelegramClick}
                                disabled={
                                    savingTelegram ||
                                    (!telegramBotToken.trim() || !telegramChatId.trim())
                                }
                                size="sm"
                                className="w-40"
                            >
                                {savingTelegram ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Guardar Credenciales'
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Vincular Correo Electrónico</AlertDialogTitle>
                        <AlertDialogDescription>
                            Para guardar esta configuración, necesitamos vincular tu correo electrónico actual ({user?.email}) a tu perfil de configuración.
                            <br /><br />
                            ¿Deseas continuar usando <strong>{user?.email}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowEmailConfirm(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmEmail}>Sí, vincular y guardar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}



