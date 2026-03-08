import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Globe, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2, Banknote, Save, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { cn } from '@/core/utils';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { getExchangeRate } from '@/features/finance/constants/exchangeRates';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useToast } from '@/shared/hooks/use-toast';
import { Separator } from '@/shared/ui/separator';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

import { REGIONS } from '@/features/finance/constants/regionConstants';

export function CurrencySection() {
    const { currency, country, updateProfile, decimalPlaces } = useSettingsProfile();
    const { convertCurrency, currencyUsage, updateConfig } = useFinanceData();
    const { toast } = useToast();

    // Currency State
    const [selectedCurrency, setSelectedCurrency] = useState(currency ?? '');
    const [conversionRate, setConversionRate] = useState('1');
    const [isConverting, setIsConverting] = useState(false);
    const [showConversion, setShowConversion] = useState(false);
    const [currencyOpen, setCurrencyOpen] = useState(false);

    // Decimal State
    const [tempDecimals, setTempDecimals] = useState(decimalPlaces || 0);
    const [savingDecimals, setSavingDecimals] = useState(false);

    // Region State
    const [selectedRegion, setSelectedRegion] = useState(country || 'Latam');
    const [pendingRegion, setPendingRegion] = useState<string | null>(null);
    const [savingRegion, setSavingRegion] = useState(false);

    // Sync state when profile loads
    useEffect(() => {
        if (currency !== undefined) { setSelectedCurrency(currency ?? ''); }
        if (decimalPlaces !== undefined) { setTempDecimals(decimalPlaces); }
        if (country !== undefined) { setSelectedRegion(country || 'Latam'); }
    }, [currency, decimalPlaces, country]);

    // Currency Actions
    const handleSimpleChange = async () => {
        setIsConverting(true);
        await updateProfile({ currency: selectedCurrency });

        // Track usage in Supabase so sort order persists across devices
        const newCount = (currencyUsage[selectedCurrency] ?? 0) + 1;
        void updateConfig({ currency_usage: { ...currencyUsage, [selectedCurrency]: newCount } });

        setIsConverting(false);
        setShowConversion(false);
    };

    const sortedCurrencies = useMemo(() => {
        return [...CURRENCIES].sort((a, b) => {
            const usageA = currencyUsage[a.code] ?? 0;
            const usageB = currencyUsage[b.code] ?? 0;
            if (usageB !== usageA) return usageB - usageA;
            return a.name.localeCompare(b.name);
        });
    }, [currencyUsage, currencyOpen]);

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
            const newCount = (currencyUsage[selectedCurrency] ?? 0) + 1;
            void updateConfig({ currency_usage: { ...currencyUsage, [selectedCurrency]: newCount } });
        }
    };

    // Decimal Actions
    const handleSaveDecimals = async () => {
        setSavingDecimals(true);
        await updateProfile({ decimal_places: tempDecimals });
        setSavingDecimals(false);
    };

    const handleRegionChangeRequest = (val: string) => {
        if (val !== selectedRegion) {
            setPendingRegion(val);
        }
    };

    const confirmRegionChange = async () => {
        if (!pendingRegion) return;
        setSavingRegion(true);
        const { error } = await updateProfile({ country: pendingRegion });
        if (!error) {
            setSelectedRegion(pendingRegion);
            toast({
                title: 'Región actualizada',
                description: `Se ha cambiado la configuración a ${pendingRegion}.`,
            });
        }
        setSavingRegion(false);
        setPendingRegion(null);
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
        <Card className="rounded-2xl shadow-sm border-border bg-gray-50/50 dark:bg-muted/20 overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <Globe className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                                Moneda y Formato
                            </p>
                            <p className="text-[15px] text-muted-foreground mt-1 leading-tight">Configura tu moneda principal y la visualización de cifras</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Currency Selection */}
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-sm font-medium text-muted-foreground pl-1">Moneda actual</label>
                        <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={currencyOpen}
                                    className="h-11 rounded-xl w-full justify-between bg-background px-3 font-normal border-input hover:bg-accent hover:text-accent-foreground"
                                >
                                    {selectedCurrency ? (
                                        <span className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                                                {selectedCurrency}
                                            </span>
                                            <span className="truncate">{CURRENCIES.find((c) => c.code === selectedCurrency)?.name}</span>
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">Selecciona una moneda</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 z-[75] rounded-xl shadow-lg border-border">
                                <Command className="bg-popover text-popover-foreground rounded-xl">
                                    <CommandInput placeholder="Buscar moneda..." className="h-11" />
                                    <CommandList className="max-h-[250px]">
                                        <CommandEmpty>No se encontraron monedas.</CommandEmpty>
                                        <CommandGroup className="p-1">
                                            {sortedCurrencies.map((c) => (
                                                <CommandItem
                                                    key={c.code}
                                                    value={`${c.name} ${c.code}`}
                                                    onSelect={() => {
                                                        setSelectedCurrency(c.code);
                                                        setCurrencyOpen(false);
                                                        // Track selection in Supabase (optimistic)
                                                        const newCount = (currencyUsage[c.code] ?? 0) + 1;
                                                        void updateConfig({ currency_usage: { ...currencyUsage, [c.code]: newCount } });
                                                    }}
                                                    className="rounded-lg py-2 cursor-pointer"
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4 shrink-0 text-primary",
                                                            selectedCurrency === c.code ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <span className="flex items-center gap-2 truncate">
                                                        <span className="font-mono font-bold text-[10px] sm:text-xs bg-muted/50 px-1.5 py-0.5 rounded text-foreground shrink-0 border border-border/50">
                                                            {c.code}
                                                        </span>
                                                        <span className="truncate">{c.name}</span>
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
                                    Multiplica TODOS tus saldos y transacciones por una tasa de cambio.
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

                                    {/* Suggested TRM for 1 Jan 2026 */}
                                    {(getExchangeRate(currency || 'COP', selectedCurrency) !== null && currency !== selectedCurrency) && (
                                        <div className="flex items-center justify-between bg-primary/5 rounded-lg border border-primary/20 p-2 mt-2">
                                            <span className="text-xs text-primary font-medium">Tasa sugerida (Ene 2026):</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs font-bold text-primary hover:bg-primary/20"
                                                onClick={() => {
                                                    const rate = getExchangeRate(currency || 'COP', selectedCurrency);
                                                    if (rate) {
                                                        const formattedRate = rate > 1000 ? rate.toFixed(2) : rate.toFixed(4);
                                                        setConversionRate(formattedRate);
                                                    }
                                                }}
                                            >
                                                Usar {(() => {
                                                    const rate = getExchangeRate(currency || 'COP', selectedCurrency);
                                                    return rate ? (rate > 1000 ? rate.toFixed(2) : rate.toFixed(4)) : '';
                                                })()}
                                            </Button>
                                        </div>
                                    )}
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

                <Separator className="my-4" />

                {/* Region Settings Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            Región y Zona de Datos
                        </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-[15px] text-muted-foreground leading-tight">
                                Define la zona desde donde utilizarás la app, esto ajusta las normativas de tratamiento de tu información.
                            </p>
                            <Select value={selectedRegion} onValueChange={handleRegionChangeRequest} disabled={savingRegion}>
                                <SelectTrigger className="h-11 rounded-xl w-full">
                                    <SelectValue placeholder="Selecciona tu región" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {REGIONS.map(r => (
                                        <SelectItem key={r.id} value={r.id} className="rounded-lg">
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50">
                            <h5 className="text-sm font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <AlertTriangle className="h-4 w-4 shrink-0" /> Política actual:
                            </h5>
                            <p className="text-sm text-orange-600/90 dark:text-orange-300/80 mt-1 leading-snug">
                                {REGIONS.find(r => r.id === selectedRegion)?.policy}
                            </p>
                        </div>
                    </div>
                </div>

            </CardContent>

            <AlertDialog open={!!pendingRegion} onOpenChange={(open) => !open && setPendingRegion(null)}>
                <AlertDialogContent className="rounded-[24px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cambio de Región y Políticas</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás a punto de cambiar tu región a <strong className="text-foreground">{REGIONS.find(r => r.id === pendingRegion)?.label}</strong>.
                            <br /><br />
                            Esto modificará el tratamiento de tus datos:
                            <br />
                            <span className="italic block mt-2 text-primary border-l-2 pl-3 border-primary/50">
                                "{REGIONS.find(r => r.id === pendingRegion)?.policy}"
                            </span>
                            <br />
                            ¿Estás de acuerdo con aplicar este cambio?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRegionChange} className="rounded-xl">
                            Aceptar y Guardar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}




