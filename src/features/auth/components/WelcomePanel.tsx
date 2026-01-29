import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, DollarSign, Tag, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from '@/hooks/currencyConstants';
import { useFinanceData } from '@/hooks/useFinanceData';
import { cn } from '@/lib/utils';

export function WelcomePanel() {
  const navigate = useNavigate();
  const {
    currency,
    updateProfile,
    categories,
    paymentMethods,
  } = useFinanceData();

  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'COP');
  const [isConfiguringCurrency, setIsConfiguringCurrency] = useState(false);

  const steps = [
    {
      id: 'currency',
      icon: DollarSign,
      title: 'Configurar moneda',
      description: 'Selecciona la moneda para tus transacciones',
      completed: !!currency,
      action: (
        <div className="space-y-3">
          <Select
            value={selectedCurrency}
            onValueChange={setSelectedCurrency}
            disabled={!!currency}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
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
            disabled={isConfiguringCurrency || !!currency}
            className={cn(
              "w-full h-11 rounded-xl transition-all duration-200",
              !!currency && "opacity-50 cursor-not-allowed"
            )}
          >
            {isConfiguringCurrency ? 'Configurando...' : currency ? 'Moneda configurada' : 'Configurar moneda'}
          </Button>
        </div>
      ),
    },
    {
      id: 'categories',
      icon: Tag,
      title: 'Crear categorías',
      description: 'Define categorías para organizar tus transacciones',
      completed: categories.length > 0,
      action: (
        <Button
          onClick={() => navigate('/configuracion?section=categories')}
          disabled={categories.length > 0}
          className={cn(
            "w-full h-11 rounded-xl transition-all duration-200",
            categories.length > 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          {categories.length > 0 ? 'Categorías configuradas' : 'Ir a Configuración'}
        </Button>
      ),
    },
    {
      id: 'payment-methods',
      icon: Wallet,
      title: 'Agregar métodos de pago',
      description: 'Configura tarjetas, cuentas bancarias o efectivo',
      completed: paymentMethods.length > 0,
      action: (
        <Button
          onClick={() => navigate('/configuracion?section=payment-methods')}
          disabled={paymentMethods.length > 0}
          className={cn(
            "w-full h-11 rounded-xl transition-all duration-200",
            paymentMethods.length > 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          {paymentMethods.length > 0 ? 'Métodos configurados' : 'Ir a Configuración'}
        </Button>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl space-y-8 animate-in fade-in zoom-in-50 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/20 mb-6 transition-transform hover:scale-105 duration-300">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido a Trackfinance</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Configuremos los aspectos básicos de tu cuenta para comenzar a organizar tus finanzas.
          </p>
        </div>

        <div className="grid gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isDisabled = index > 0 && !steps[index - 1].completed;
            const isActive = !step.completed && !isDisabled;

            return (
              <Card
                key={step.id}
                className={cn(
                  "overflow-hidden transition-all duration-300 border rounded-xl shadow-sm bg-card hover:border-primary/30 hover:shadow-md",
                  step.completed && "opacity-80 grayscale-[0.2]",
                  isDisabled && "opacity-50 pointer-events-none"
                )}
              >
                <CardHeader className="pb-3 px-6 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl transition-colors",
                          step.completed
                            ? "bg-primary/10 text-primary"
                            : isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{step.title}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{step.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <div className="ml-[3.5rem]">
                    {step.action}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4 pb-8">
          <p>Tus datos se guardan de forma segura en la nube</p>
        </div>
      </div>
    </div>
  );
}
