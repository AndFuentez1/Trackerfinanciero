import { useState } from 'react';
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

interface WelcomePanelProps {
  onConfigureCurrency: (currencyCode: string) => Promise<void>;
  onAddPaymentMethod: () => void;
  onAddCategory: () => void;
  currencyConfigured: boolean;
  hasPaymentMethods: boolean;
  hasCategories: boolean;
  currentCurrency?: string;
}

const CURRENCIES = [
  { code: 'USD', name: 'Dólar estadounidense ($)', symbol: '$' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'COP', name: 'Peso colombiano (COP)', symbol: '$' },
  { code: 'MXN', name: 'Peso mexicano (Mex$)', symbol: '$' },
  { code: 'ARS', name: 'Peso argentino (ARS)', symbol: '$' },
  { code: 'BRL', name: 'Real brasileño (R$)', symbol: 'R$' },
  { code: 'CLP', name: 'Peso chileno (CLP)', symbol: '$' },
  { code: 'PEN', name: 'Sol peruano (S/)', symbol: 'S/' },
];

export function WelcomePanel({
  onConfigureCurrency,
  onAddPaymentMethod,
  onAddCategory,
  currencyConfigured,
  hasPaymentMethods,
  hasCategories,
  currentCurrency,
}: WelcomePanelProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency || 'USD');
  const [isConfiguringCurrency, setIsConfiguringCurrency] = useState(false);

  const steps = [
    {
      id: 'currency',
      icon: DollarSign,
      title: 'Configurar moneda',
      description: 'Selecciona la moneda para tus transacciones',
      completed: currencyConfigured,
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
              await onConfigureCurrency(selectedCurrency);
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
      id: 'categories',
      icon: Tag,
      title: 'Crear categorías',
      description: 'Define categorías para organizar tus transacciones',
      completed: hasCategories,
      action: (
        <Button onClick={onAddCategory} className="w-full">
          Crear categoría
        </Button>
      ),
    },
    {
      id: 'payment-methods',
      icon: Wallet,
      title: 'Agregar métodos de pago',
      description: 'Configura tarjetas, cuentas bancarias o efectivo',
      completed: hasPaymentMethods,
      action: (
        <Button onClick={onAddPaymentMethod} className="w-full">
          Agregar método de pago
        </Button>
      ),
    },
  ];

  const allCompleted = currencyConfigured && hasPaymentMethods && hasCategories;

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
                className={`overflow-hidden transition-all ${
                  step.completed ? 'bg-success/5 border-success/20' : ''
                } ${isDisabled ? 'opacity-50' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          step.completed ? 'bg-success/20' : 'bg-primary/20'
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
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
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/20 text-success">
                        Completado
                      </span>
                    )}
                  </div>
                </CardHeader>
                {!step.completed && !isDisabled && (
                  <CardContent>{step.action}</CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {allCompleted && (
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="font-medium text-success">¡Listo para comenzar!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tu cuenta está configurada. Presiona F5 para recargar y ver tu dashboard.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
