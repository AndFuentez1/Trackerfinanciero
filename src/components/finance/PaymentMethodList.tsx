import { PaymentMethod } from '@/hooks/useFinanceData';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  variant?: 'dashboard' | 'settings';
  onEdit?: (pm: PaymentMethod) => void;
  onDelete?: (pm: PaymentMethod) => void;
  onAdd?: () => void;
  highlighted?: boolean;
}

// Color scheme based on account type
const getTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#000000' : '#ffffff';
};

const getAccountType = (type: string, isSavings: boolean): string => {
  if (isSavings) return 'AHORRO';
  switch (type) {
    case 'debit':
      return 'DÉBITO';
    case 'credit':
      return 'CRÉDITO';
    case 'cash':
      return 'EFECTIVO';
    default:
      return 'DIGITAL';
  }
};

const getInitial = (name: string): string => {
  return name.charAt(0).toUpperCase();
};

export function PaymentMethodList({ paymentMethods, variant = 'dashboard', onEdit, onDelete, onAdd, highlighted }: PaymentMethodListProps) {
  const decimalPlaces = useDecimalPlaces();
  const { formatCurrencySmall, currency } = useFormatCurrency();
  const { currency: ctxCurrency } = useFinance();

  const formatCurrencyDisplay = (value: number) => formatCurrencySmall(value);

  const formatCurrencyPayment = (value: number) => {
    const currCode = ctxCurrency || currency || 'COP';
    const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;

    let formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currCode,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      currencyDisplay: 'code',
    }).format(value).replace(currCode, symbol);

    if (decimalPlaces === 0) {
      // Sin decimales: mostrar símbolo en línea 1, número en línea 2
      return (
        <div className="flex flex-col">
          <span style={{ fontSize: '0.7em' }}>{symbol}</span>
          <span>{formatted.replace(symbol, '').trim()}</span>
        </div>
      );
    }

    const parts = formatted.split(',');
    if (parts.length === 1) {
      // Sin decimales encontrados
      return (
        <div className="flex flex-col">
          <span style={{ fontSize: '0.7em' }}>{symbol}</span>
          <span>{formatted.replace(symbol, '').trim()}</span>
        </div>
      );
    }

    const integerPart = parts[0].replace(symbol, '').trim();
    const decimalPart = parts[1];

    return (
      <div className="flex flex-col">
        <span style={{ fontSize: '0.7em' }}>{symbol}</span>
        <span>
          {integerPart}
          <span className="opacity-85" style={{ fontSize: '0.7em' }}>,{decimalPart}</span>
        </span>
      </div>
    );
  };

  if (paymentMethods.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 min-h-[200px] hover:bg-slate-100 hover:border-slate-400 transition-all cursor-pointer" onClick={onAdd} role={onAdd ? 'button' : undefined}>
          <div className="text-4xl font-light text-slate-400 mb-2">+</div>
          <p className="text-sm text-slate-600 text-center">Agrega un método de pago</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {paymentMethods.map((pm, idx) => {
        // Strict color usage
        const bgColor = pm.color || '#64748b';
        const textColor = getTextColor(bgColor);
        const accountType = getAccountType(pm.type, pm.is_savings_account || false);

        // Función para generar números pseudo-aleatorios reproducibles basados en el ID
        const seededRandom = (seed: number, index: number): number => {
          const x = Math.sin(seed + index) * 10000;
          return x - Math.floor(x);
        };

        // Usar el hash del ID como semilla
        const seed = pm.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        // Generate 3 fixed geometric shapes based on payment method ID
        const randomShapes = Array.from({ length: 3 }, (_, i) => {
          const shapeType = i % 3;
          const posX = seededRandom(seed, i * 3) * 70;
          const posY = seededRandom(seed, i * 3 + 1) * 70;
          const size = 30 + seededRandom(seed, i * 3 + 2) * 40;
          const rotation = seededRandom(seed, i * 3 + 3) * 45;

          if (shapeType === 0) {
            // Circle
            return (
              <circle
                key={`shape-${i}`}
                cx={posX}
                cy={posY}
                r={size / 2}
                fill="black"
                style={{ opacity: 0.07 }}
              />
            );
          } else if (shapeType === 1) {
            // Rectangle
            return (
              <rect
                key={`shape-${i}`}
                x={posX}
                y={posY}
                width={size}
                height={size / 1.5}
                fill="black"
                style={{ opacity: 0.07 }}
                transform={`rotate(${rotation} ${posX + size / 2} ${posY + size / 3})`}
              />
            );
          } else {
            // Triangle (polygon)
            const points = `${posX},${posY} ${posX + size},${posY} ${posX + size / 2},${posY + size}`;
            return (
              <polygon
                key={`shape-${i}`}
                points={points}
                fill="black"
                style={{ opacity: 0.07 }}
              />
            );
          }
        });

        return (
          <div
            key={pm.id}
            className="relative h-48 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            style={{ backgroundColor: bgColor }}
          >
            {/* Geometric texture patterns in background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {randomShapes}
            </svg>

            {/* Top Level: Name (Left) + Account Type (Right) */}
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: textColor }}>{pm.name}</p>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: textColor }}>{accountType}</span>
            </div>

            {/* Middle Level: Balance (Prominent, Centered) */}
            <div className="relative z-10 flex flex-col items-start">
              <p className="text-xs font-normal mb-2 opacity-90" style={{ color: textColor }}>
                {pm.type === 'credit' ? '' : 'Balance'}
              </p>
              <div className="text-3xl font-semibold" style={{ color: textColor }}>
                {pm.is_savings_account || pm.type === 'debit' || pm.type === 'cash'
                  ? formatCurrencyPayment(pm.balance)
                  : pm.type === 'credit'
                    ? formatCurrencyPayment(pm.credit_limit ? pm.credit_limit - pm.balance : pm.balance)
                    : formatCurrencyPayment(pm.balance)}
              </div>
            </div>

            {/* Bottom Level: Secondary Info + Action Icons */}
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-xs opacity-75" style={{ color: textColor }}>Principal</p>
              {(onEdit || onDelete) && (
                <div className="flex gap-2">
                  {onEdit && (
                    <button
                      title="Editar"
                      onClick={() => onEdit(pm)}
                      className="h-7 w-7 rounded-sm border border-primary/80 flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      title="Eliminar"
                      onClick={() => onDelete(pm)}
                      className="h-7 w-7 rounded-sm border border-primary/80 flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add Payment Method Card */}
      <Button
        variant="default"
        onClick={onAdd}
        className={cn(
          "h-48 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 flex flex-col items-center justify-center gap-2 text-slate-600 transition-all duration-500",
          highlighted && [
            "scale-[1.08] ring-4 ring-primary ring-offset-4 ring-offset-background",
            "shadow-[0_0_30px_0_hsl(var(--primary)/0.8)]",
            "bg-white text-primary border-primary font-bold z-10"
          ]
        )}
      >
        <Plus className={cn("h-6 w-6", highlighted && "animate-pulse")} />
        <span className="text-sm font-medium">Agregar método</span>
      </Button>
    </div>
  );
}

