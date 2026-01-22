import { TransactionType } from './financeTypes';

// Palette of distinct colors for consistent assignment
export const MASTER_PALETTE = [
    '#10B981', // emerald-500
    '#F97316', // orange-500
    '#3B82F6', // blue-500
    '#EF4444', // red-500
    '#A855F7', // purple-500
    '#EC4899', // pink-500
    '#EAB308', // yellow-500
    '#06B6D4', // cyan-500
    '#8B5CF6', // violet-500
    '#14B8A6', // teal-500
    '#F43F5E', // rose-500
    '#6366F1', // indigo-500
    '#84CC16', // lime-500
    '#D946EF', // fuchsia-500
    '#0EA5E9', // sky-500
    '#F59E0B', // amber-500
    '#64748B', // slate-500
    '#78716C', // stone-500
    '#71717A', // zinc-500
    '#737373', // neutral-500
    '#1E293B', // slate-800
    '#991B1B', // red-800
    '#065F46', // emerald-800
    '#1E40AF', // blue-800
    '#6B21A8', // purple-800
    '#9F1239', // rose-800
    '#92400E', // amber-800
    '#155E75', // cyan-800
    '#3730A3', // indigo-800
    '#86198F', // fuchsia-800
];

export const DEFAULT_CATEGORIES: { name: string; type: TransactionType; color: string }[] = [
    { name: 'Salario', type: 'income', color: '#10B981' },
    { name: 'Otros ingresos', type: 'income', color: '#34D399' },
    { name: 'Alimentación', type: 'expense', color: '#F97316' },
    { name: 'Arriendo y mudanzas', type: 'expense', color: '#B45309' },
    { name: 'Aseo y limpieza', type: 'expense', color: '#38BDF8' },
    { name: 'Cuidado personal y estética', type: 'expense', color: '#FB7185' },
    { name: 'Teléfono', type: 'expense', color: '#60A5FA' },
    { name: 'Restaurantes', type: 'expense', color: '#FB923C' },
    { name: 'Mecato y bebidas', type: 'expense', color: '#EC4899' },
    { name: 'Educación', type: 'expense', color: '#4F46E5' },
    { name: 'Gym', type: 'expense', color: '#EF4444' },
    { name: 'Oficina y trabajo', type: 'expense', color: '#64748B' },
    { name: 'Salidas, hospedajes y ocio', type: 'expense', color: '#06B6D4' },
    { name: 'Aplicativos, libros y gadgets', type: 'expense', color: '#8B5CF6' },
    { name: 'Ropa, calzado y accesorios', type: 'expense', color: '#D946EF' },
    { name: 'Farmacia y Salud', type: 'expense', color: '#F87171' },
    { name: 'Salud y pensión', type: 'expense', color: '#F43F5E' },
    { name: 'Seguro de vida', type: 'expense', color: '#DC2626' },
    { name: 'Seguro moto', type: 'expense', color: '#2563EB' },
    { name: 'Civica', type: 'expense', color: '#1E40AF' },
    { name: 'Transporte', type: 'expense', color: '#3B82F6' },
    { name: 'Gasolina', type: 'expense', color: '#EAB308' }, // Corrected from yellow-600 which is more like amber
    { name: 'Parqueadero', type: 'expense', color: '#94A3B8' },
    { name: 'Moto', type: 'expense', color: '#404040' },
    { name: 'Regalos', type: 'expense', color: '#F472B6' },
    { name: 'Utilería hogar y decoración', type: 'expense', color: '#9A3412' },
    { name: 'Utilería oficina', type: 'expense', color: '#475569' },
    { name: 'Documentos y papelería', type: 'expense', color: '#A1A1AA' },
    { name: 'Grandes activos', type: 'expense', color: '#312E81' },
    { name: 'Reparaciones', type: 'expense', color: '#7C2D12' },
    { name: 'Préstamos', type: 'expense', color: '#B91C1C' },
    { name: 'Impuestos y multas', type: 'expense', color: '#57534E' },
    { name: 'Ahorro', type: 'saving', color: '#059669' },
    { name: 'CDT', type: 'saving', color: '#7C3AED' },
    { name: 'Acciones', type: 'investment', color: '#6366F1' },
    { name: 'Transferencia', type: 'transfer_out', color: '#6B7280' },
    { name: 'Otros', type: 'other', color: '#9CA3AF' },
];
