import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Key, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { ConfigStatus } from '../hooks/useUserConfigStatus';

interface GeminiConfigSectionProps {
    configStatus?: ConfigStatus;
    isSyncing: boolean;
    geminiKey: string;
    savingGemini: boolean;
    onGeminiKeyChange: (key: string) => void;
    onSaveGeminiClick: () => void;
}

export function GeminiConfigSection({
    configStatus,
    isSyncing,
    geminiKey,
    savingGemini,
    onGeminiKeyChange,
    onSaveGeminiClick
}: GeminiConfigSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    Gemini AI (Opcional)
                </Label>
                {isSyncing ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sincronizando
                    </div>
                ) : configStatus?.geminiConfigured ? (
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
            <p className="text-base text-muted-foreground">
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
                            onChange={(e) => onGeminiKeyChange(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            onClick={onSaveGeminiClick}
                            disabled={savingGemini || !geminiKey.trim() || isSyncing}
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
    );
}
