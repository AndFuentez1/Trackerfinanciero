import { ArrowUpRight, CalendarClock, LineChart, Wallet, HandCoins, ArrowDownCircle, ArrowUpCircle, Receipt } from 'lucide-react';
import type { TourStep } from './PageTour';

export const CASHFLOW_TOUR: TourStep[] = [
  {
    title: 'Flujo de Caja',
    description:
      'Aquí ves cómo se moverá tu dinero en los próximos meses: lo que esperas recibir frente a lo que ya tienes comprometido.',
    icon: ArrowUpRight,
  },
  {
    title: 'Ingresos estimados',
    description:
      'Los ingresos futuros salen de tu presupuesto de ingresos (el del mes o, si no existe, el recurrente). Sin presupuesto, se proyectan a partir de tus ingresos reales.',
    icon: Wallet,
  },
  {
    title: 'Compromisos futuros',
    description:
      'Suscripciones y gastos programados se restan en la fecha en que vencen, para que veas qué meses quedan ajustados.',
    icon: CalendarClock,
  },
  {
    title: 'Gráfico y línea de tiempo',
    description:
      'Usa los filtros de año y periodo para recorrer la proyección. La línea de tiempo detalla cada movimiento y el saldo acumulado.',
    icon: LineChart,
  },
];

export const LOANS_TOUR: TourStep[] = [
  {
    title: 'Préstamos y Deudas',
    description: 'Lleva el control del dinero que te prestaron y del que tú prestaste, con su saldo pendiente y progreso.',
    icon: HandCoins,
  },
  {
    title: 'Me prestaron vs. Presté',
    description:
      'Un préstamo recibido es una deuda que vas pagando; uno otorgado es dinero que esperas recuperar. Puedes vincularlo a una cuenta para reflejar el desembolso.',
    icon: ArrowDownCircle,
  },
  {
    title: 'Registrar pagos',
    description:
      'Cada pago o cobro reduce el saldo pendiente y actualiza el progreso. Si defines cuotas o interés, se usan para estimar lo que falta.',
    icon: ArrowUpCircle,
  },
  {
    title: 'Conexión con tus finanzas',
    description:
      'Tus préstamos se reflejan en la proyección del Flujo de Caja, y las transferencias detectadas en tus facturas pueden enviarse aquí como préstamos.',
    icon: Receipt,
  },
];
