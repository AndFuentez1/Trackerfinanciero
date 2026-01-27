import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSettingsProfile } from '../hooks/useSettingsProfile';

export function DecimalSettingsSection() {
    const { decimalPlaces, updateProfile, currency } = useSettingsProfile();
    const [tempDecimals, setTempDecimals] = useState(decimalPlaces);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await updateProfile({ decimal_places: tempDecimals });
        setSaving(false);
    };

    const previewValue = 1234.5678;
    const formattedPreview = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency || 'COP',
        minimumFractionDigits: tempDecimals,
        maximumFractionDigits: tempDecimals,
    }).format(previewValue);

    const hasChanges = tempDecimals !== decimalPlaces;

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Banknote className="h-5 w-5 text-primary" />
                    return (
                        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                    <Banknote className="h-5 w-5 text-primary" />
                                    Números decimales
                                </CardTitle>
                                <CardDescription>Configura cuántos decimales mostrar en los montos</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                                Cantidad: {tempDecimals}
                                            </span>
                                        </div>
                                        <Slider
                                            value={[tempDecimals]}
                                            min={0}
                                            max={3}
                                            step={1}
                                            onValueChange={(vals) => setTempDecimals(vals[0])}
                                            className="py-4"
                                        />
                                    </div>

                                    <div className="p-4 rounded-xl bg-white border border-gray-300 space-y-2">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Vista previa</span>
                                        <div className="text-2xl font-mono font-bold text-foreground transition-all duration-300">
                                            {formattedPreview}
                                        </div>
                                    </div>

                                    {/* Botón Guardar formato eliminado */}
                                </div>
                            </CardContent>
                        </Card>
                    );
                        {saving ? 'Guardando...' : 'Guardar cambios'}
