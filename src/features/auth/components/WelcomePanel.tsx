import { useState } from 'react';
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
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/core/utils';

export function WelcomePanel() {
  const {
    currency,
    updateProfile,
    categories,
    paymentMethods,
    initializeDefaultCategories, // Need to add this to hook
  } = useFinanceData();

  const navigate = useNavigate();

  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD');
  const [isConfiguringCurrency, setIsConfiguringCurrency] = useState(false);
  const [isInitializingCategories, setIsInitializingCategories] = useState(false);

  const steps = [
    {
      id: 'currency',
      icon: DollarSign,
      title: 'Configurar moneda',
      description: 'Selecciona la moneda principal',
      completed: !!currency,
      action: (
        <div className="flex gap-2">
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecciona una moneda" />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              {CURRENCIES.map(curr => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={async () => {
              setIsConfiguringCurrency(true);
              const currConfig = CURRENCIES.find(c => c.code === selectedCurrency);
              await updateProfile({
                currency: selectedCurrency,
                decimal_places: currConfig?.decimals ?? 0
              });
              setIsConfiguringCurrency(false);
            }}
            disabled={isConfiguringCurrency}
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
      completed: categories.length >= 3,
      action: (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full border-dashed border-border hover:border-primary/50"
            onClick={async () => {
              setIsInitializingCategories(true);
              await initializeDefaultCategories?.();
              setIsInitializingCategories(false);
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
            Ir a Configuración
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
                onClick={() => updateProfile({ welcome_completed: true })}
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



