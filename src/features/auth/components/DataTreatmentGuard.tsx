import React, { useState } from 'react';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

import { REGIONS } from '@/features/finance/constants/regionConstants';

export function DataTreatmentGuard({ children }: { children: React.ReactNode }) {
    const { profile, updateProfile, profileLoading } = useFinance();
    const [country, setCountry] = useState<string>(profile?.country || '');
    const [accepted, setAccepted] = useState(profile?.data_treatment_accepted === true);
    const [loading, setLoading] = useState(false);
    const [isRejected, setIsRejected] = useState(false);
    const { toast } = useToast();

    if (profileLoading || !profile) {
        return <>{children}</>;
    }

    // If the user hasn't completed the welcome panel, let the WelcomePanel handle the data treatment acceptance.
    const needsConsent = profile.welcome_completed && (profile.data_treatment_accepted === false || profile.data_treatment_accepted === null);

    const handleAccept = async () => {
        if (!country) {
            toast({ title: 'Atención', description: 'Por favor selecciona tu región', variant: 'destructive' });
            return;
        }
        if (!accepted) {
            toast({ title: 'Atención', description: 'Debes aceptar la política de tratamiento de datos', variant: 'destructive' });
            return;
        }

        setLoading(true);
        const { success, error } = await updateProfile({
            country,
            data_treatment_accepted: true,
        });
        setLoading(false);

        if (success) {
            toast({ title: 'Éxito', description: 'Política aceptada correctamente.' });
        } else {
            toast({ title: 'Error', description: error || 'Hubo un problema al guardar la información.', variant: 'destructive' });
        }
    };

    const handleReject = () => {
        setIsRejected(true);
    };

    const handleRevertRejection = () => {
        setIsRejected(false);
    };

    return (
        <>
            <Dialog open={needsConsent}>
                <DialogContent
                    className="sm:max-w-[425px] [&>button]:hidden outline-none"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{isRejected ? "Acceso Restringido" : "Tratamiento de Datos"}</DialogTitle>
                        {isRejected ? (
                            <DialogDescription className="text-left text-balance sm:text-justify max-w-sm mt-4 text-[14px] pr-2 sm:pr-4">
                                Para ofrecerte un servicio seguro y cumplir con las leyes de privacidad globales, el manejo de tu información financiera requiere de tu consentimiento explícito.
                                <br /><br />
                                Si decides no aceptar la política de tratamiento de datos, lamentablemente no podremos habilitar tu acceso a la plataforma, ya que no podríamos procesar ni almacenar tus transacciones legalmente.
                            </DialogDescription>
                        ) : (
                            <DialogDescription className="text-left text-balance sm:text-justify pr-2 sm:pr-4">
                                Para continuar utilizando la aplicación y garantizar el cumplimiento de las normativas de privacidad, necesitamos que confirmes tu región de residencia y aceptes la política de tratamiento de datos.
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {isRejected ? (
                        <div className="pt-4 flex flex-col gap-3">
                            <Button onClick={handleRevertRejection} variant="default" className="w-full">
                                Revisar y Aceptar Política
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 py-4 pr-2 sm:pr-4">
                                <div className="space-y-2">
                                    <Label>Región de residencia</Label>
                                    <Select value={country} onValueChange={setCountry}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona una región" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REGIONS.map(r => (
                                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-start space-x-2 mt-2">
                                    <Checkbox id="terms" checked={accepted} onCheckedChange={(c) => setAccepted(!!c)} />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor="terms"
                                            className="text-[14px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Acepto la política de tratamiento de datos
                                        </label>
                                    </div>
                                </div>
                                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed text-left text-balance sm:text-justify pl-6">
                                    Al aceptar, autorizas el almacenamiento y procesamiento de tus datos financieros conforme a las leyes de protección de datos de tu región.
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2">
                                <Button onClick={handleReject} disabled={loading} variant="ghost" className="w-full sm:w-auto">
                                    Cerrar y Rechazar
                                </Button>
                                <Button onClick={handleAccept} disabled={loading} className="w-full sm:w-auto">
                                    {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                    Aceptar y Continuar
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <div className={needsConsent ? "pointer-events-none blur-[2px] select-none h-full transition-all duration-300" : "h-full"}>
                {children}
            </div>
        </>
    );
}
