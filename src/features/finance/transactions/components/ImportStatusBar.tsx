import { Button } from '@/shared/ui/button';
import { FileCheck, AlertCircle } from 'lucide-react';

interface ImportStatusBarProps {
    // Estados UX (no técnicos):
    // 'pending-approval': Datos cargados esperando aprobación del usuario
    // 'applying': Aplicando datos a la base de datos
    // 'none': No hay nada que mostrar
    uiState: 'pending-approval' | 'applying' | 'none';
    recordCount: number;
    onReviewAndApprove: () => void;
    onDiscard?: () => void;
}

export function ImportStatusBar({
    uiState,
    recordCount,
    onReviewAndApprove,
    onDiscard,
}: ImportStatusBarProps) {
    // No mostrar si no hay nada pendiente
    if (uiState === 'none') {
        return null;
    }

    // Estado UX: Aplicando datos
    if (uiState === 'applying') {
        return (
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-blue-600 rounded-full" />
                    <p className="text-sm font-medium text-blue-900">
                        Aplicando {recordCount} {recordCount === 1 ? 'registro' : 'registros'}...
                    </p>
                </div>
            </div>
        );
    }

    // Estado UX: Datos cargados, pendientes de aprobación
    if (uiState === 'pending-approval') {
        return (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-semibold text-emerald-900">Datos importados desde Excel</h3>
                        </div>

                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-amber-900 font-medium">
                                    Los registros están listos, pero aún no afectan tus saldos.
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                    {recordCount} {recordCount === 1 ? 'transacción' : 'transacciones'} esperando tu aprobación.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={onReviewAndApprove}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                            Revisar y aprobar registros
                        </Button>
                        {onDiscard && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={onDiscard}
                                className="text-slate-600 border-slate-300 hover:bg-slate-100"
                            >
                                Descartar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

