import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Mail, CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import type { ConfigStatus } from '../hooks/useUserConfigStatus';
import type { BackendStatus } from '../hooks/useBackendReady';

interface GmailConfigSectionProps {
    configStatus?: ConfigStatus;
    isLoadingConfig: boolean;
    isPerformingSync: boolean;
    backendStatus: BackendStatus;
    onConnect: () => void;
    onDisconnect: () => void;
    onRetryBackend: () => void;
    onShowHistory: () => void;
}

export function GmailConfigSection({
    configStatus,
    isLoadingConfig,
    isPerformingSync,
    backendStatus,
    onConnect,
    onDisconnect,
    onRetryBackend,
    onShowHistory
}: GmailConfigSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    Gmail
                </Label>
                {isLoadingConfig ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1 pb-1">
                        <div className="h-4 w-24 animate-pulse bg-muted rounded"></div>
                    </div>
                ) : isPerformingSync ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Conectando...
                    </div>
                ) : configStatus?.gmailConnected ? (
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
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                <CheckCircle2 className="h-4 w-4" />
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
            <p className="text-base text-muted-foreground">
                Conecta tu cuenta de Gmail para procesar facturas automáticamente
            </p>
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
                        <Button size="sm" onClick={onConnect} className="w-40" disabled={isPerformingSync || backendStatus !== 'ready'}>
                            Conectar Gmail
                        </Button>
                        {backendStatus === 'checking' && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Verificando servidor...
                            </span>
                        )}
                        {backendStatus === 'error' && (
                            <span className="flex items-center gap-1 text-[11px] text-amber-600">
                                <XCircle className="h-3 w-3" />
                                Servidor no responde
                                <button onClick={onRetryBackend} className="underline ml-1">Reintentar</button>
                            </span>
                        )}
                        {backendStatus === 'ready' && (
                            <span className="flex items-center gap-1 text-[11px] text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Servidor listo
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
