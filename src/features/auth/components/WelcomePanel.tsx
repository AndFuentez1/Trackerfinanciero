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
import { useNavigate } from 'react-router-dom';
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
    initializeDefaultCategories, // Need to add this to hook
  } = useFinanceData();

  const navigate = useNavigate();

  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD');
  const [isConfiguringCurrency, setIsConfiguringCurrency] = useState(false);
  const [isInitializingCategories, setIsInitializingCategories] = useState(false);

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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
      completed: categories.length > 0,
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
          <Button onClick={() => navigate('/configuracion?highlight=categories')} variant="secondary" className="w-full">
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
        <Button onClick={() => navigate('/configuracion?highlight=payment-methods')} className="w-full">
          Ir a Configuración
        </Button>
      ),
    },
  ];

  const allStepsCompleted = steps.every(s => s.completed);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
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
                  "border-border/50 transition-all overflow-hidden",
                  step.completed ? "bg-muted/30" : "bg-card",
                  !isPrevCompleted && "opacity-50 grayscale pointer-events-none"
                )}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2.5 rounded-xl transition-colors",
                      step.completed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {step.completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{step.title}</CardTitle>
                      <CardDescription className="text-xs">{step.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {!step.completed && (
                  <CardContent className="p-4 pt-0">
                    {step.action}
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
