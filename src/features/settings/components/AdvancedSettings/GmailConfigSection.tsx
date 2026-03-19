import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Mail, CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import type { ConfigStatus } from '../hooks/useUserConfigStatus';
import type { BackendStatus } from '../hooks/useBackendReady';

interface GmailConfigSectionProps {
    configStatus?: ConfigStatus;
    isPerformingSync: boolean;
    backendStatus: BackendStatus;
    onConnect: () => void;
    onDisconnect: () => void;
    onRetryBackend: () => void;
    onShowHistory: () => void;
    manualProcessedCount?: number;
    automaticProcessedCount?: number;
    aiProcessedCount?: number;
}

export function GmailConfigSection({
    configStatus,
    isPerformingSync,
    backendStatus,
    onConnect,
    onDisconnect,
    onRetryBackend,
    onShowHistory,
    manualProcessedCount = 0,
    automaticProcessedCount = 0,
    aiProcessedCount = 0
}: GmailConfigSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    Gmail
                </Label>
                {configStatus?.gmailConnected ? (
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowHistory}
                            className="h-8 px-2 text-muted-foreground hover:text-primary gap-2"
                            title="Buscar en historial"
                            disabled={isPerformingSync || configStatus?.requiresReauth}
                        >
                            {isPerformingSync ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                            <span className="text-xs">{isPerformingSync ? 'Conectando...' : 'Buscar facturas'}</span>
                        </Button>
                        {configStatus?.requiresReauth ? (
                            <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                                <XCircle className="h-4 w-4 text-destructive" />
                                Necesita revisión (Conexión expirada)
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Conectado
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <XCircle className="h-4 w-4" />
                        No conectado
                    </div>
                )}
            </div>
            <p className="text-[15px] text-muted-foreground">
                Conecta tu cuenta de Gmail para procesar facturas automáticamente
            </p>
            <div className="w-full space-y-3">
                <div className="rounded-lg border border-border/60 bg-white/70 dark:bg-muted/30 px-3 py-2 shadow-sm">
                    <ul className="flex flex-col text-[15px] list-disc list-inside m-0 p-0 text-muted-foreground">
                        <li>Facturas procesadas manualmente <span className="font-semibold text-foreground">{manualProcessedCount.toLocaleString('es-CO')}</span></li>
                        <li>Facturas procesadas por filtro <span className="font-semibold text-foreground">{automaticProcessedCount.toLocaleString('es-CO')}</span></li>
                        <li>Facturas procesadas por AI <span className="font-semibold text-foreground">{aiProcessedCount.toLocaleString('es-CO')}</span></li>
                    </ul>
                </div>
                <div className="flex justify-end">
                    {configStatus?.gmailConnected ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDisconnect}
                            disabled={isPerformingSync}
                            className="w-40 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            Desconectar
                        </Button>
                    ) : (
                        <div className="flex flex-col items-end gap-1.5">
                            <Button size="sm" onClick={onConnect} className="w-40 text-[15px]" disabled={isPerformingSync || backendStatus !== 'ready'}>
                                Conectar Gmail
                            </Button>
                            {backendStatus === 'checking' && (
                                <span className="flex items-center gap-1 text-[15px] text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Verificando servidor...
                                </span>
                            )}
                            {backendStatus === 'error' && (
                                <span className="flex items-center gap-1 text-[15px] text-amber-600">
                                    <XCircle className="h-3 w-3" />
                                    Servidor no responde
                                    <button onClick={onRetryBackend} className="underline ml-1">Reintentar</button>
                                </span>
                            )}
                            {backendStatus === 'ready' && (
                                <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Servidor listo
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
