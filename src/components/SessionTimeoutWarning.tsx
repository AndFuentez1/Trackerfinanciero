import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionTimeoutWarningProps {
    /** Whether the warning dialog is open */
    open: boolean;
    /** Remaining time in milliseconds */
    remainingTime: number;
    /** Callback when user wants to extend session */
    onExtend: () => void;
    /** Callback when user wants to logout now */
    onLogout: () => void;
}

/**
 * Modal warning shown before automatic session timeout
 * Displays countdown and allows user to extend session or logout
 */
export function SessionTimeoutWarning({
    open,
    remainingTime,
    onExtend,
    onLogout,
}: SessionTimeoutWarningProps) {
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        if (!open) return;

        const updateCountdown = () => {
            const totalSeconds = Math.floor(remainingTime / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [open, remainingTime]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onExtend()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-orange-100 rounded-full text-orange-600 animate-pulse">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-xl">Sesión por expirar</DialogTitle>
                    </div>
                    <DialogDescription className="text-base pt-2">
                        Tu sesión se cerrará automáticamente por inactividad en:
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-6 gap-4">
                    <div className="relative">
                        <Clock className="w-16 h-16 text-orange-500 animate-pulse" />
                    </div>
                    <div className="text-5xl font-bold text-orange-600 tabular-nums">
                        {countdown}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        ¿Deseas continuar con tu sesión?
                    </p>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={onLogout}
                        className="w-full sm:w-auto order-2 sm:order-1"
                    >
                        Cerrar sesión ahora
                    </Button>
                    <Button
                        onClick={onExtend}
                        className="w-full sm:w-auto order-1 sm:order-2 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        Extender sesión
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
