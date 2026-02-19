import supabase from '../config/supabase.config.js';
import logger from '../utils/logger.js';
export { supabase };

/**
 * Busca el ID de una categoría por nombre (búsqueda flexible)
 */
export async function getCategoryId(categoryName: string, userId: string): Promise<string | null> {
    try {
        const nameToSearch = categoryName || 'Otros';

        // Función de normalización consistente
        const normalize = (name: string) => {
            if (!name) return '';
            return name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '')
                .replace(/[^a-z0-9]/g, '');
        };

        const normalizedSearch = normalize(nameToSearch);

        // Obtener categorías de gastos del usuario
        let query = supabase
            .from('categories')
            .select('id, name')
            .eq('type', 'expense');

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: categories, error } = await query;
        if (error) throw error;

        if (!categories || categories.length === 0) {
            logger.warn(`⚠️  Usuario ${userId} no tiene categorías de gastos.`);
            return null;
        }

        // 1. Intento de match flexible
        const match = categories.find((cat: { name: string; id: string }) => {
            const catNorm = normalize(cat.name);
            return catNorm === normalizedSearch || catNorm.includes(normalizedSearch) || normalizedSearch.includes(catNorm);
        });

        if (match) {
            logger.info(`✅ Categoría encontrada: ${nameToSearch} → ${match.id}`);
            return match.id;
        }

        // 2. Fallback a "Otros"
        const otrosMatch = categories.find((cat: { name: string; id: string }) => normalize(cat.name) === 'otros');
        if (otrosMatch) {
            logger.info(`ℹ️  Fallback 'Otros' para: ${nameToSearch} → ${otrosMatch.id}`);
            return otrosMatch.id;
        }

        // 3. Fallback final a la primera categoría disponible
        logger.warn(`⚠️  No se encontró match ni 'Otros' para '${nameToSearch}'. Usando: ${categories[0].name}`);
        return categories[0].id;
    } catch (error) {
        logger.error('❌ Error en getCategoryId:', error);
        return null;
    }
}

/**
 * Busca el ID de un método de pago por nombre (búsqueda flexible)
 */
export async function getPaymentMethodId(methodName: string, userId: string): Promise<string | null> {
    try {
        // Normalizar nombre
        const normalized = methodName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '')
            .replace(/de/g, ''); // Quitar "de" para "Tarjeta de Crédito"

        // Obtener métodos de pago del usuario
        const { data: methods, error } = await supabase
            .from('payment_methods')
            .select('id, name')
            .eq('user_id', userId);

        if (error) throw error;

        // Buscar coincidencia flexible
        const match = methods.find((method: { name: string; id: string }) => {
            const methodNormalized = method.name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '')
                .replace(/[^a-z0-9]/g, '')
                .replace(/de/g, '');

            return methodNormalized === normalized ||
                methodNormalized.includes(normalized) ||
                normalized.includes(methodNormalized);
        });

        if (match) {
            logger.info(`✅ Método de pago encontrado: ${methodName} → ${match.id}`);
            return match.id;
        }

        logger.warn(`⚠️  No se encontró método de pago para: ${methodName}`);
        return null;
    } catch (error) {
        logger.error('❌ Error buscando método de pago:', error);
        return null;
    }
}

/**
 * Verifica si un messageId ya fue procesado
 */
export async function checkDuplicate(messageId: string, userId: string): Promise<boolean> {
    try {
        const [{ data: pending, error: pendingError }, { data: statusRows, error: statusError }] = await Promise.all([
            supabase
                .from('pending_invoices')
                .select('id')
                .eq('user_id', userId)
                .eq('message_id', messageId)
                .limit(1),
            supabase
                .from('gmail_message_status')
                .select('status')
                .eq('user_id', userId)
                .eq('message_id', messageId)
                .limit(1)
        ]);

        if (pendingError) throw pendingError;
        if (statusError) throw statusError;

        const status = statusRows && statusRows[0]?.status;
        const isArchived = status === 'archived' || status === 'approved' || status === 'deleted';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isDuplicate = (pending && (pending as any[]).length > 0) || isArchived;

        if (isDuplicate) {
            logger.warn(`⚠️  Factura duplicada detectada: ${messageId}`);
        }

        return isDuplicate;
    } catch (error) {
        logger.error('❌ Error verificando duplicado:', error);
        return false; // En caso de error, permitir procesamiento
    }
}

/**
 * Inserta una factura en pending_invoices
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertPendingInvoice(invoiceData: any) {
    try {
        const { data, error } = await supabase
            .from('pending_invoices')
            .insert([invoiceData])
            .select();

        if (error) throw error;

        logger.info(`✅ Factura insertada en Supabase: ${data[0].id}`);
        return data[0];
    } catch (error) {
        logger.error('❌ Error insertando factura:', error);
        throw error;
    }
}

/**
 * Obtiene facturas pendientes de un usuario
 */
export async function getPendingInvoices(userId: string) {
    try {
        const { data, error } = await supabase
            .from('pending_invoices')
            .select('*')
            .eq('user_id', userId)
            .order('arrival_date', { ascending: false });

        if (error) throw error;

        return data;
    } catch (error) {
        logger.error('❌ Error obteniendo facturas pendientes:', error);
        throw error;
    }
}
