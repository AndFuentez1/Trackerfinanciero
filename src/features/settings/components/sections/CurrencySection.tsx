import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Globe, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2, Banknote, Save } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useToast } from '@/shared/hooks/use-toast';
import { Separator } from '@/shared/ui/separator';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';

export function CurrencySection() {
    const { currency, updateProfile, decimalPlaces } = useSettingsProfile();
    const { convertCurrency } = useFinanceData();
    const { toast } = useToast();

    // Currency State
    const [selectedCurrency, setSelectedCurrency] = useState(currency ?? '');
    const [conversionRate, setConversionRate] = useState('1');
    const [isConverting, setIsConverting] = useState(false);
    const [showConversion, setShowConversion] = useState(false);

    // Decimal State
    const [tempDecimals, setTempDecimals] = useState(decimalPlaces || 0);
    const [savingDecimals, setSavingDecimals] = useState(false);

    // Sync state when profile loads
    useEffect(() => {
        if (currency !== undefined) { setSelectedCurrency(currency ?? ''); }
        if (decimalPlaces !== undefined) { setTempDecimals(decimalPlaces); }
    }, [currency, decimalPlaces]);

    // Currency Actions
    const handleSimpleChange = async () => {
        setIsConverting(true);
        await updateProfile({ currency: selectedCurrency });
        setIsConverting(false);
        setShowConversion(false);
    };

    const handleFullConversion = async () => {
        const rate = parseFloat(conversionRate);
        if (isNaN(rate) || rate <= 0) {
            toast({
                title: 'Tasa inválida',
                description: 'Por favor ingresa un número válido mayor a cero.',
                variant: 'destructive'
            });
            return;
        }

        setIsConverting(true);
        const { error } = await convertCurrency(rate, selectedCurrency);
        setIsConverting(false);

        if (!error) {
            toast({
                title: '¡Conversión exitosa!',
                description: `Se han actualizado todos tus registros a ${selectedCurrency}.`,
            });
            setShowConversion(false);
        }
    };

    // Decimal Actions
    const handleSaveDecimals = async () => {
        setSavingDecimals(true);
        await updateProfile({ decimal_places: tempDecimals });
        setSavingDecimals(false);
    };

    const hasDecimalChanges = tempDecimals !== decimalPlaces;

    const previewValue = 1234.5678;
    const formattedPreview = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency || 'COP',
        minimumFractionDigits: tempDecimals,
        maximumFractionDigits: tempDecimals,
    }).format(previewValue);

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-gray-50/50 dark:bg-muted/20 overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <Globe className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base sm:text-lg font-bold text-muted-foreground tracking-tight leading-none">
                                Moneda y Formato
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 leading-tight">Configura tu moneda principal y la visualización de cifras</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Currency Selection */}
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-sm font-medium text-muted-foreground pl-1">Moneda actual</label>
                        <Select value={selectedCurrency || undefined} onValueChange={setSelectedCurrency}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="Selecciona una moneda" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {CURRENCIES.map(c => (
                                    <SelectItem key={c.code} value={c.code} className="rounded-lg">
                                        <span className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded">{c.code}</span>
                                            {c.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedCurrency !== currency && !showConversion && (
                        <Button
                            onClick={() => setShowConversion(true)}
                            className="h-11 px-6 rounded-xl animate-in fade-in slide-in-from-right-2"
                        >
                            Cambiar Moneda
                        </Button>
                    )}
                </div>

                {/* Conversion Logic (Hidden by default) */}
                {showConversion && (
                    <div className="p-4 rounded-2xl border-2 border-border/60 bg-primary/5 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 text-primary">
                            <RefreshCw className="h-5 w-5 animate-spin-slow" />
                            <h4 className="font-bold">Opciones de Cambio</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-background border border-border shadow-sm space-y-3">
                                <h5 className="font-bold text-sm flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    Cambio simple
                                </h5>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Solo cambia el símbolo. Los montos existentes NO se modificarán. Útil si solo te equivocaste al elegir.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-lg"
                                    onClick={handleSimpleChange}
                                    disabled={isConverting}
                                >
                                    Solo cambiar símbolo
                                </Button>
                            </div>

                            <div className="p-4 rounded-xl bg-background border border-border/50 shadow-sm space-y-3">
                                <h5 className="font-bold text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Conversión total
                                </h5>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Multiplica TODOS tus saldos y transacciones por una tasa de cambio. Ideal si te mudas de país.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 text-center font-bold text-sm bg-muted rounded py-1">1 {currency}</div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <Input
                                                value={conversionRate}
                                                onChange={(e) => setConversionRate(e.target.value)}
                                                type="number"
                                                step="0.0001"
                                                className="h-8 text-center font-bold font-mono"
                                            />
                                        </div>
                                        <div className="flex-1 text-center font-bold text-sm bg-muted rounded py-1">{selectedCurrency}</div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    className="w-full rounded-lg"
                                    onClick={handleFullConversion}
                                    disabled={isConverting}
                                >
                                    {isConverting ? 'Convirtiendo...' : 'Aplicar Conversión'}
                                </Button>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => setShowConversion(false)}
                            disabled={isConverting}
                        >
                            Cancelar
                        </Button>
                    </div>
                )}

                <Separator className="my-4" />

                {/* Decimal Places Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-muted-foreground" />
                            Decimales visibles
                        </h4>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            {tempDecimals} decimales
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <Slider
                            value={[tempDecimals]}
                            min={0}
                            max={3}
                            step={1}
                            onValueChange={(vals) => setTempDecimals(vals[0])}
                            className="py-2"
                        />

                        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
                            <span className="text-xs text-muted-foreground">Vista previa:</span>
                            <CurrencyDisplay
                                amount={previewValue}
                                currencyCode={currency}
                                className="text-lg"
                            />
                        </div>
                    </div>

                    {hasDecimalChanges && (
                        <div className="flex justify-end pt-2 animate-in fade-in slide-in-from-top-1">
                            <Button
                                onClick={handleSaveDecimals}
                                disabled={savingDecimals}
                                size="sm"
                                className="gap-2"
                            >
                                <Save className="h-4 w-4" />
                                {savingDecimals ? 'Guardando...' : 'Guardar Formato'}
                            </Button>
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}




