import { PaymentMethod } from '@/hooks/useFinanceData';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  variant?: 'dashboard' | 'settings';
  onEdit?: (pm: PaymentMethod) => void;
  onDelete?: (pm: PaymentMethod) => void;
  onAdd?: () => void;
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

export function PaymentMethodList({ paymentMethods, variant = 'dashboard', onEdit, onDelete, onAdd }: PaymentMethodListProps) {
  const decimalPlaces = useDecimalPlaces();
  
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);

    if (decimalPlaces === 0) return formatted;

    const parts = formatted.split(',');
    if (parts.length === 1) return formatted;

    const integerPart = parts[0];
    const decimalPart = parts[1];

    return (
      <>
        {integerPart}
        <span className="opacity-60" style={{ fontSize: '0.6em' }}>,{decimalPart}</span>
      </>
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

        // Generate 3 random geometric shapes with ultra-low opacity (0.07)
        const randomShapes = Array.from({ length: 3 }, (_, i) => {
          const shapeType = i % 3;
          const posX = Math.random() * 70;
          const posY = Math.random() * 70;
          const size = 30 + Math.random() * 40;

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
                transform={`rotate(${Math.random() * 45} ${posX + size / 2} ${posY + size / 3})`}
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
              <p className="text-3xl font-semibold" style={{ color: textColor }}>
                {pm.is_savings_account || pm.type === 'debit' || pm.type === 'cash'
                  ? formatCurrency(pm.balance)
                  : pm.type === 'credit'
                    ? formatCurrency(pm.credit_limit ? pm.credit_limit - pm.balance : pm.balance)
                    : formatCurrency(pm.balance)}
              </p>
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
                      className="h-7 w-7 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors"
                      style={{ color: textColor }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      title="Eliminar"
                      onClick={() => onDelete(pm)}
                      className="h-7 w-7 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors"
                      style={{ color: textColor }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
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
        variant="outline"
        onClick={onAdd}
        className="h-48 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 flex flex-col items-center justify-center gap-2 text-slate-600 transition-all"
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-medium">Agregar método</span>
      </Button>
    </div>
  );
}

