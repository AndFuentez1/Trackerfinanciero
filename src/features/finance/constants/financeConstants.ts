import type { TransactionType } from './financeTypes';

// Diverse palette of 30 distinct colors - ONE representative color from each family
// Selected for maximum visual distinction and accessibility
export const MASTER_PALETTE = [
    // === PRIMARY SPECTRUM (12 distinct hues) ===
    '#EF4444', // red-500 (vibrant red)
    '#F97316', // orange-500 (bright orange)
    '#F59E0B', // amber-500 (golden amber)
    '#EAB308', // yellow-500 (sunny yellow)
    '#84CC16', // lime-500 (fresh lime)
    '#10B981', // emerald-500 (emerald green)
    '#14B8A6', // teal-500 (teal)
    '#06B6D4', // cyan-500 (cyan blue)
    '#3B82F6', // blue-500 (sky blue)
    '#8B5CF6', // violet-500 (violet)
    '#A855F7', // purple-500 (purple)
    '#EC4899', // pink-500 (hot pink)

    // === SECONDARY SPECTRUM (12 intermediate hues) ===
    '#F43F5E', // rose-500 (rose)
    '#FB923C', // orange-400 (soft orange)
    '#FBBF24', // amber-400 (light amber)
    '#A3E635', // lime-400 (bright lime)
    '#34D399', // emerald-400 (light emerald)
    '#2DD4BF', // teal-400 (light teal)
    '#22D3EE', // cyan-400 (light cyan)
    '#60A5FA', // blue-400 (light blue)
    '#A78BFA', // violet-400 (light violet)
    '#C084FC', // purple-400 (light purple)
    '#F472B6', // pink-400 (light pink)
    '#D946EF', // fuchsia-500 (fuchsia)

    // === DEEP TONES (6 rich colors) ===
    '#DC2626', // red-600 (deep red)
    '#EA580C', // orange-600 (deep orange)
    '#059669', // emerald-600 (deep emerald)
    '#0891B2', // cyan-600 (deep cyan)
    '#2563EB', // blue-600 (deep blue)
    '#7C3AED', // violet-600 (deep violet)
];

export const DEFAULT_CATEGORIES: { name: string; type: TransactionType; color: string }[] = [
    { name: 'Salario', type: 'income', color: '#10B98A' },
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
