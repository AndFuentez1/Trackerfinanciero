/**
 * Category Constants
 * 
 * Default categories for new users.
 */

import type { TransactionType } from '../types/financeTypes';

export const DEFAULT_CATEGORIES = [
    { name: 'Salario', type: 'income', color: '#3B82F6' },
    { name: 'Otros ingresos', type: 'income', color: '#6366F1' },
    { name: 'Alimentación', type: 'expense', color: '#06B6D4' },
    { name: 'Arriendo y mudanzas', type: 'expense', color: '#4F46E5' },
    { name: 'Aseo y limpieza', type: 'expense', color: '#38BDF8' },
    { name: 'Cuidado personal y estética', type: 'expense', color: '#FB7185' },
    { name: 'Teléfono', type: 'expense', color: '#60A5FA' },
    { name: 'Restaurantes', type: 'expense', color: '#2563EB' },
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
    { name: 'Gasolina', type: 'expense', color: '#EAB308' },
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
    { name: 'Ahorro', type: 'saving', color: '#0D9488' },
    { name: 'CDT', type: 'saving', color: '#7C3AED' },
    { name: 'Acciones', type: 'investment', color: '#6366F1' },
    { name: 'Transferencia', type: 'transfer_out', color: '#6B7280' },
    { name: 'Otros', type: 'other', color: '#9CA3AF' },
];
