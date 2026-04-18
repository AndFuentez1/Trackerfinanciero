import { useEffect, useMemo, useState } from 'react';
import { Wallet, DollarSign, Tag, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/shared/ui/command';
import { cn } from '@/core/utils';
import { Globe, Check, ChevronsUpDown } from 'lucide-react';

import { REGIONS } from '@/features/finance/constants/regionConstants';

export function WelcomePanel() {
  const {
    currency,
    country,
    updateProfile,
    categories,
    paymentMethods,
    initializeDefaultCategories,
    currencyUsage,
    updateConfig,
  } = useFinanceData();

  const navigate = useNavigate();
  const safeCurrencyUsage = useMemo(() => currencyUsage ?? {}, [currencyUsage]);

  const [selectedCurrency, setSelectedCurrency] = useState(currency || '');
  const [selectedRegion, setSelectedRegion] = useState(country || '');
  const [isConfiguringCurrency, setIsConfiguringCurrency] = useState(false);
  const [isConfiguringRegion, setIsConfiguringRegion] = useState(false);
  const [isInitializingCategories, setIsInitializingCategories] = useState(false);
  const [categoriesLocallyCompleted, setCategoriesLocallyCompleted] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    setSelectedCurrency(currency || '');
  }, [currency]);

  useEffect(() => {
    setSelectedRegion(country || '');
  }, [country]);

  const steps = [
    {
      id: 'region',
      icon: Globe,
      title: 'Región y Datos',
      description: 'Define tu zona para políticas de privacidad',
      completed: !!country,
      action: (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecciona una región" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {REGIONS.map(reg => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={async () => {
                if (!selectedRegion || !acceptTerms) { return; }
                setIsConfiguringRegion(true);
                await updateProfile({ country: selectedRegion, data_treatment_accepted: true });
                setIsConfiguringRegion(false);
              }}
              disabled={isConfiguringRegion || !selectedRegion || !acceptTerms}
              aria-label="Confirmar región"
            >
              {isConfiguringRegion ? '...' : <CheckCircle2 className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-start space-x-2 bg-muted/30 p-3 rounded-xl border border-slate-200/60 dark:border-border">
            <Checkbox
              id="global-terms-welcome"
              checked={acceptTerms}
              onCheckedChange={(c) => setAcceptTerms(c as boolean)}
              className="mt-0.5 border-slate-300"
            />
            <Label htmlFor="global-terms-welcome" className="text-[11.5px] text-muted-foreground leading-relaxed cursor-pointer select-none">
              He leído y acepto los Términos de servicio y la Política de privacidad, y consiento el tratamiento de mis datos personales en Estados Unidos.
            </Label>
          </div>
        </div>
      ),
    },
    {
      id: 'currency',
      icon: DollarSign,
      title: 'Configurar moneda',
      description: 'Selecciona la moneda principal',
      completed: !!currency,
      action: (
        <div className="flex gap-2">
          <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={currencyOpen}
                className="flex-1 justify-between bg-background"
              >
                {selectedCurrency
                  ? CURRENCIES.find((c) => c.code === selectedCurrency)?.name
                  : "Busca una moneda..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 z-[75]">
              <Command>
                <CommandInput placeholder="Buscar moneda..." />
                <CommandList>
                  <CommandEmpty>No se encontraron monedas.</CommandEmpty>
                  <CommandGroup>
                    {CURRENCIES.map((curr) => (
                      <CommandItem
                        key={curr.code}
                        value={`${curr.name} ${curr.code}`}
                        onSelect={() => {
                          setSelectedCurrency(curr.code);
                          setCurrencyOpen(false);
                          // Track selection in Supabase (optimistic)
                          const newCount = (safeCurrencyUsage[curr.code] ?? 0) + 1;
                          void updateConfig({ currency_usage: { ...safeCurrencyUsage, [curr.code]: newCount } });
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCurrency === curr.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-semibold mr-2">{curr.code}</span>
                        {curr.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            onClick={async () => {
              if (!selectedCurrency) { return; }
              setIsConfiguringCurrency(true);
              const currConfig = CURRENCIES.find(c => c.code === selectedCurrency);
              await updateProfile({
                currency: selectedCurrency,
                decimal_places: currConfig?.decimals ?? 0
              });
              setIsConfiguringCurrency(false);
            }}
            disabled={isConfiguringCurrency || !selectedCurrency}
            aria-label="Confirmar moneda"
          >
            {isConfiguringCurrency ? '...' : <CheckCircle2 className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
    {
      id: 'categories',
      icon: Tag,
      title: 'Categorías',
      description: 'Organiza tus ingresos y gastos',
      completed: categoriesLocallyCompleted || categories.length >= 3,
      action: (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full border-dashed border-border hover:border-primary/50"
            onClick={async () => {
              setIsInitializingCategories(true);
              try {
                await initializeDefaultCategories?.();
                setCategoriesLocallyCompleted(true);
              } finally {
                setIsInitializingCategories(false);
              }
            }}
            disabled={isInitializingCategories}
          >
            {isInitializingCategories ? 'Cargando...' : (
              <>
                <span className="hidden sm:inline">Cargar sugeridas (recomendado)</span>
                <span className="sm:hidden">Cargar sugeridas</span>
              </>
            )}
          </Button>
          <Button onClick={() => navigate('/settings?highlight=categories')} variant="secondary" className="w-full">
            Configurar manualmente
          </Button>
        </div>
      ),
    },
    {
      id: 'payment-methods',
      icon: Wallet,
      title: 'Métodos de pago',
      description: 'Cuentas, tarjetas o efectivo',
      completed: paymentMethods.length > 0,
      action: (
        <Button onClick={() => navigate('/settings?highlight=payment-methods')} className="w-full">
          Ir a Configuración
        </Button>
      ),
    },
  ];

  const allStepsCompleted = steps.every(s => s.completed);

  return (
    <div className="fixed inset-0 lg:left-64 z-[60] bg-background overflow-y-auto">
      <div className="flex min-h-full items-start sm:items-center justify-center p-4">
        <div className="w-full max-w-xl lg:max-w-3xl space-y-4 sm:space-y-8 py-4 sm:py-0">
          <div className="bg-gray-50/50 dark:bg-muted/20 border border-border p-8 rounded-3xl shadow-sm space-y-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bienvenido</h1>
            <p className="text-muted-foreground">Configura lo básico para empezar</p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isPrevCompleted = index === 0 || steps[index - 1].completed;

              return (
                <Card
                  key={step.id}
                  className={cn(
                    "border-slate-200/60 transition-all duration-500 overflow-hidden rounded-[24px] group",
                    step.completed ? "bg-slate-50/50 shadow-none grayscale-[0.5]" : "bg-white shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-200/40 hover:scale-[1.01] hover:border-primary/30",
                    !isPrevCompleted && "opacity-40 grayscale pointer-events-none"
                  )}
                >
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-start gap-5">
                      <div className={cn(
                        "p-3.5 rounded-[18px] transition-all duration-500 shadow-sm",
                        step.completed ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" : "bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary group-hover:ring-1 group-hover:ring-primary/20"
                       )}>
                        {step.completed ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-black tracking-tight text-slate-800">{step.title}</CardTitle>
                        <CardDescription className="text-sm font-medium text-slate-500 mt-1">{step.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {!step.completed && (
                    <CardContent className="p-6 pt-2">
                      <div className="pl-[76px]">
                        {step.action}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {allStepsCompleted && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20"
                onClick={async () => {
                  const res = await updateProfile({ welcome_completed: true });
                  if (res?.success) {
                    // Force navigation just in case the context update is slow
                    navigate('/dashboard', { replace: true });
                  }
                }}
              >
                <span className="hidden sm:inline">¡Todo listo! Continuar</span>
                <span className="sm:hidden">Continuar</span>
                <CheckCircle2 className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
