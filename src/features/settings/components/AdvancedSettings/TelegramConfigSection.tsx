import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { ConfigStatus } from '../hooks/useUserConfigStatus';

interface TelegramConfigSectionProps {
    configStatus?: ConfigStatus;
    isSyncing: boolean;
    telegramBotToken: string;
    telegramChatId: string;
    notifyRulesExceptions: boolean;
    notifyAiExceptions: boolean;
    savingTelegram: boolean;
    testingTelegram: boolean;
    onBotTokenChange: (val: string) => void;
    onChatIdChange: (val: string) => void;
    onToggleRules: (checked: boolean) => void;
    onToggleAi: (checked: boolean) => void;
    onSaveTelegramClick: () => void;
    onTestTelegramClick: () => void;
}

export function TelegramConfigSection({
    configStatus,
    isSyncing,
    telegramBotToken,
    telegramChatId,
    notifyRulesExceptions,
    notifyAiExceptions,
    savingTelegram,
    testingTelegram,
    onBotTokenChange,
    onChatIdChange,
    onToggleRules,
    onToggleAi,
    onSaveTelegramClick,
    onTestTelegramClick
}: TelegramConfigSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                    <Send className="h-5 w-5 text-muted-foreground" />
                    Telegram (Opcional)
                </Label>
                {isSyncing ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sincronizando
                    </div>
                ) : configStatus?.telegramVerified ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Verificado
                    </div>
                ) : configStatus?.telegramConfigured ? (
                    <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Configurado (sin prueba)
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <XCircle className="h-4 w-4" />
                        No configurado
                    </div>
                )}
            </div>
            <p className="text-base text-muted-foreground">
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
                                placeholder={configStatus?.telegramConfigured ? "Guardado (oculto)" : "Ej: 123456:ABC-DEF..."}
                                value={telegramBotToken}
                                onChange={(e) => onBotTokenChange(e.target.value)}
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
                                placeholder={configStatus?.telegramConfigured ? "Guardado (oculto)" : "Ej: 987654321"}
                                value={telegramChatId}
                                onChange={(e) => onChatIdChange(e.target.value)}
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
                                onCheckedChange={onToggleRules}
                                disabled={isSyncing}
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
                                onCheckedChange={onToggleAi}
                                disabled={isSyncing}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2 gap-2">
                <Button
                    variant="outline"
                    onClick={onTestTelegramClick}
                    disabled={testingTelegram || isSyncing || !configStatus?.telegramConfigured}
                    size="sm"
                    className="w-40"
                    title={!configStatus?.telegramConfigured ? 'Primero guarda las credenciales' : 'Enviar mensaje de prueba'}
                >
                    {testingTelegram ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        'Probar Telegram'
                    )}
                </Button>
                <Button
                    onClick={onSaveTelegramClick}
                    disabled={
                        savingTelegram ||
                        isSyncing ||
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
    );
}
