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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <div className="p-3 rounded-full bg-primary/20 w-fit mx-auto mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Bienvenido a Tracker Financiero</h1>
          <p className="text-muted-foreground text-lg">Completa estos pasos para comenzar a gestionar tu dinero</p>
        </div>

        <div className="grid gap-4 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isDisabled = index > 0 && !steps[index - 1].completed;

            return (
              <Card
                key={step.id}
                className={`overflow-hidden transition-all ${step.completed ? 'bg-primary/5 border-primary/20' : ''
                  } ${isDisabled ? 'opacity-50' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${step.completed ? 'bg-primary/20' : 'bg-primary/20'
                          }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Icon className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{step.title}</CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </div>
                    {step.completed && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary">
                        Completado
                      </span>
                    )}
                  </div>
                </CardHeader>
                {/* Show action if not disabled. Even if completed, we let them change it (e.g. theme or add more categories) */}
                {(!isDisabled) && (
                  <CardContent>
                    {step.action}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dialogs */}
      <AddCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onAdd={addCategory}
        trigger={null} // Hide default trigger
      />
      <AddPaymentMethodDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onAdd={addPaymentMethod}
      />
    </div>
  );
}
