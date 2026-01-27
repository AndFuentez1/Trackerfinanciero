import { useState } from 'react';
import { Wallet, DollarSign, Tag, CheckCircle2, Palette } from 'lucide-react';
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
import { AddCategoryDialog } from '@/features/categories/components/AddCategoryDialog';
import { AddPaymentMethodDialog } from '@/features/payment-methods/components/AddPaymentMethodDialog';
import { cn } from '@/lib/utils';

export function WelcomePanel() {
  const {
    currency,
    updateProfile,
    categories,
    addCategory,
    paymentMethods,
    addPaymentMethod,
    baseColor,
    themeOptions,
    setAppThemePreference,
  } = useFinanceData();

  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD');
  const [isConfiguringCurrency, setIsConfiguringCurrency] = useState(false);

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const steps = [
    {
      id: 'currency',
      icon: DollarSign,
      title: 'Configurar moneda',
      description: 'Selecciona la moneda para tus transacciones',
      completed: !!currency,
      action: (
        <div className="space-y-3">
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            className="w-full"
          >
            {isConfiguringCurrency ? 'Configurando...' : 'Configurar moneda'}
          </Button>
        </div>
      ),
    },
    {
      id: 'theme',
      icon: Palette,
      title: 'Personalizar tema',
      description: 'Elige el color principal de la aplicación',
      completed: true, // Always completed as there is a default
      action: (
        <div className="flex flex-wrap gap-3 pt-2">
          {themeOptions.map((theme) => (
            <button
              key={theme.hex}
              onClick={() => setAppThemePreference(theme.hex)}
              className={cn(
                "h-8 w-8 rounded-full transition-all border-2 flex items-center justify-center",
                baseColor === theme.hex
                  ? "border-primary ring-2 ring-primary/20 scale-110"
                  : "border-transparent hover:scale-110"
              )}
              style={{ backgroundColor: theme.hex }}
              title={theme.label}
            >
              {baseColor === theme.hex && (
                <CheckCircle2 className="h-4 w-4 text-white drop-shadow-sm" />
              )}
            </button>
          ))}
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
        <Button onClick={() => setCategoryDialogOpen(true)} className="w-full">
          Crear categoría
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
        <Button onClick={() => setPaymentDialogOpen(true)} className="w-full">
          Agregar método de pago
        </Button>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl space-y-8 animate-in fade-in zoom-in-50 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/20 mb-6">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido a FinTrack</h1>
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
                  "overflow-hidden transition-all duration-300 border-l-4",
                  step.completed
                    ? "bg-card/50 border-l-primary/50 opacity-80"
                    : isActive
                      ? "bg-card border-l-primary shadow-lg ring-1 ring-primary/5" // Removed scale-[1.02]
                      : "bg-card/50 border-l-transparent opacity-50"
                )}
              >
                <CardHeader className="pb-3 px-6 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "p-2.5 rounded-xl transition-colors",
                          step.completed ? "bg-primary/10 text-primary" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                {/* Show action if not disabled */}
                {(!isDisabled) && (
                  <CardContent className="px-6 pb-5 pt-0 pl-[4.5rem]">
                    <div className="mt-2">
                      {step.action}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>Tus datos se guardan localmente en tu dispositivo</p>
        </div>
      </div>

      {/* Dialogs */}
      <AddCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onAdd={addCategory}
        trigger={null}
      />
      <AddPaymentMethodDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onAdd={addPaymentMethod}
      />
    </div>
  );
}
