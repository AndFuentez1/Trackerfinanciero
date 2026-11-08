import logger from '../utils/logger.js';
import { supabase } from './supabase.service.js';

// Diccionario de clasificación basado en keywords
// Basado en el workflow de n8n del usuario
const CATEGORY_KEYWORDS = {
    'Alimentación': [
        'zanahoria', 'papa', 'carne', 'leche', 'pan', 'arroz', 'frijol', 'huevo',
        'pollo', 'pescado', 'verdura', 'fruta', 'queso', 'yogurt', 'cereal',
        'pasta', 'aceite', 'sal', 'azúcar', 'harina', 'tomate', 'cebolla',
        'lechuga', 'manzana', 'banano', 'naranja', 'platano', 'yuca', 'arepa',
        'huevos', 'avena', 'mantequilla', 'cafe', 'chocolate en polvo'
    ],
    'Restaurantes': [
        'domicilios', 'rappi', 'uber eats', 'didi food', 'restaurante',
        'comida', 'almuerzo', 'cena', 'desayuno', 'pizza', 'hamburguesa',
        'sushi', 'comida rapida'
    ],
    'Mecato y bebidas': [
        'gaseosa', 'coca cola', 'pepsi', 'jugo', 'agua', 'cerveza', 'vino',
        'licor', 'snack', 'papas', 'galletas', 'chocolate', 'dulce', 'caramelo',
        'chicle', 'helado', 'postre'
    ],
    'Transporte': [
        'uber', 'taxi', 'bus', 'metro', 'transmilenio', 'pasaje', 'transporte',
        'cabify', 'beat', 'indriver'
    ],
    'Gasolina': [
        'gasolina', 'combustible', 'diesel', 'ecopetrol', 'terpel', 'esso',
        'mobil', 'shell', 'petrobras'
    ],
    'Farmacia y Salud': [
        'farmacia', 'drogueria', 'medicamento', 'medicina', 'pastilla',
        'jarabe', 'crema', 'ungüento', 'vitamina', 'suplemento', 'antibiotico',
        'analgesico', 'cruz verde', 'cafam', 'colsubsidio'
    ],
    'Cuidado personal y estética': [
        'shampoo', 'jabon', 'crema', 'desodorante', 'perfume', 'maquillaje',
        'cosmetico', 'peluqueria', 'barberia', 'salon', 'spa', 'manicure',
        'pedicure', 'cepillo', 'pasta dental', 'enjuague'
    ],
    'Aseo y limpieza': [
        'detergente', 'jabon', 'cloro', 'limpiador', 'desinfectante',
        'escoba', 'trapero', 'esponja', 'papel higienico', 'servilleta',
        'toalla', 'bolsa basura'
    ],
    'Ropa, calzado y accesorios': [
        'camisa', 'pantalon', 'zapatos', 'tenis', 'ropa', 'vestido',
        'falda', 'blusa', 'chaqueta', 'abrigo', 'gorra', 'sombrero',
        'bufanda', 'guantes', 'medias', 'calcetines', 'interior', 'pijama'
    ],
    'Utilería hogar y decoración': [
        'mueble', 'silla', 'mesa', 'cama', 'sofa', 'estante', 'lampara',
        'cortina', 'alfombra', 'cuadro', 'espejo', 'florero', 'planta',
        'decoracion', 'adorno'
    ],
    'Aplicativos, libros y gadgets': [
        'netflix', 'spotify', 'amazon', 'libro', 'revista', 'periodico',
        'suscripcion', 'app', 'aplicacion', 'software', 'licencia',
        'audifono', 'cable', 'cargador', 'mouse', 'teclado', 'usb'
    ],
    'Educación': [
        'colegio', 'universidad', 'curso', 'clase', 'matricula', 'pension',
        'libro', 'cuaderno', 'lapiz', 'esfero', 'marcador', 'borrador',
        'regla', 'compas', 'calculadora', 'mochila'
    ],
    'Gym': [
        'gimnasio', 'gym', 'fitness', 'entrenamiento', 'deporte',
        'pesas', 'yoga', 'pilates', 'spinning', 'crossfit'
    ],
    'Teléfono': [
        'claro', 'movistar', 'tigo', 'wom', 'recarga', 'plan', 'datos',
        'minutos', 'telefono', 'celular', 'movil'
    ],
    'Parqueadero': [
        'parqueadero', 'parking', 'estacionamiento', 'parqueo'
    ],
    'Moto': [
        'moto', 'motocicleta', 'repuesto', 'llanta', 'aceite motor',
        'filtro', 'bujia', 'cadena', 'freno'
    ],
    'Regalos': [
        'regalo', 'obsequio', 'presente', 'detalle', 'sorpresa'
    ],
    'Documentos y papelería': [
        'notaria', 'fotocopia', 'impresion', 'papel', 'sobre',
        'carpeta', 'archivo', 'documento', 'certificado', 'tramite'
    ],
    'Impuestos y multas': [
        'impuesto', 'multa', 'comparendo', 'predial', 'vehiculo',
        'transito', 'dian', 'secretaria hacienda'
    ],
};

// Mapeo opcional de códigos de producto -> categoría (alta precisión)
// TODO: Completar con los códigos reales de cada proveedor.
// Ejemplo basado en la factura de Éxito (alimentos).
const CATEGORY_CODES = {
    'Alimentación': [
        '3568953',
        '1098',
        '3668741',
        '737089',
        '1188',
        '1279',
        '1141',
        '3750923'
    ]
};

/**
 * Normaliza texto para comparación: minúsculas, sin tildes, sin puntuación, espacios simples.
 */
export function normalizeText(text) {
    return String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // Quitar tildes
        .replace(/[^a-z0-9]+/g, ' ')     // Puntuación y símbolos → espacio
        .replace(/\s+/g, ' ')
        .trim();
}

// Tokens que no aportan al aprender una regla: cantidades, unidades y presentaciones ("1100ml", "x6", "500 g")
const UNIT_TOKEN = /^(x?\d+([.,]\d+)?(ml|l|lt|lts|g|gr|grs|kg|kgs|cc|oz|und|un|uds|pq|paq|pack|mt|m|cm)?|x\d+|ml|l|lt|g|gr|kg|cc|oz|und|un|uds|pq|paq|pack)$/;

/**
 * Patrón aprendible a partir de una descripción: normalizado y sin cantidades/unidades.
 * Devuelve null si queda demasiado corto para ser una regla útil (evita reglas que coinciden con todo).
 */
export function normalizePattern(text) {
    const tokens = normalizeText(text).split(' ').filter(t => t && !UNIT_TOKEN.test(t));
    const pattern = tokens.join(' ').slice(0, 80).trim();
    return pattern.length >= 3 ? pattern : null;
}

const tokenMatches = (token, keywordToken) =>
    token === keywordToken || token === keywordToken + 's' || token === keywordToken + 'es';

/**
 * ¿La frase (ya normalizada) aparece como palabras completas en los tokens?
 * Acepta plurales simples ("gaseosas" ↔ "gaseosa"). "pan" ya no coincide con "pantalon".
 */
export function matchesPhrase(tokens, phrase) {
    const kw = phrase.split(' ').filter(Boolean);
    if (kw.length === 0 || kw.length > tokens.length) { return false; }
    for (let i = 0; i + kw.length <= tokens.length; i++) {
        let ok = true;
        for (let j = 0; j < kw.length; j++) {
            if (!tokenMatches(tokens[i + j], kw[j])) { ok = false; break; }
        }
        if (ok) { return true; }
    }
    return false;
}

// Keywords estáticas normalizadas una sola vez
const NORMALIZED_KEYWORDS = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => ({
    category,
    keywords: [...new Set(keywords.map(normalizeText).filter(Boolean))],
}));

function findCategoryByCode(code) {
    if (!code) { return null; }
    const normalized = code.toString().trim();
    for (const [category, codes] of Object.entries(CATEGORY_CODES)) {
        if (codes.includes(normalized)) {
            return category;
        }
    }
    return null;
}

/**
 * Clasificación pura (sin BD), en orden de prioridad:
 * 1. Código de producto aprendido por el usuario  2. Código estático
 * 3. Regla de palabra aprendida (gana la más específica: más palabras/caracteres)
 * 4. Keywords estáticas por puntaje: cada coincidencia pesa por su nº de palabras;
 *    empate entre categorías → confianza baja para que decida la IA o el usuario.
 *
 * @param {{ description?: string, code?: string | number | null }} product
 * @param {{ codes?: Map<string, string>, keywords?: { pattern: string, category: string }[] }} [rules]
 */
export function classifyWithRules(product, rules = {}) {
    const description = normalizeText(product?.description || '');
    const tokens = description ? description.split(' ') : [];
    const productCode = product?.code != null ? String(product.code).trim() : '';

    if (productCode && rules.codes?.has(productCode)) {
        return { category: rules.codes.get(productCode), confidence: 100, matchedKeywords: ['db_code:' + productCode], source: 'db_code' };
    }

    const staticCodeCategory = findCategoryByCode(productCode);
    if (staticCodeCategory) {
        return { category: staticCodeCategory, confidence: 100, matchedKeywords: ['static_code:' + productCode], source: 'static_code' };
    }

    // Reglas aprendidas: la más específica gana (no la primera de la lista)
    let bestRule = null;
    for (const rule of rules.keywords || []) {
        const pattern = normalizeText(rule.pattern);
        if (!pattern || !matchesPhrase(tokens, pattern)) { continue; }
        const words = pattern.split(' ').length;
        if (!bestRule || words > bestRule.words || (words === bestRule.words && pattern.length > bestRule.pattern.length)) {
            bestRule = { pattern, words, category: rule.category };
        }
    }
    if (bestRule) {
        return { category: bestRule.category, confidence: 95, matchedKeywords: ['db_keyword:' + bestRule.pattern], source: 'db_keyword' };
    }

    // Keywords estáticas
    const scored = [];
    for (const { category, keywords } of NORMALIZED_KEYWORDS) {
        const matches = keywords.filter(k => matchesPhrase(tokens, k));
        if (matches.length === 0) { continue; }
        const score = matches.reduce((sum, k) => sum + k.split(' ').length, 0);
        const longest = Math.max(...matches.map(k => k.length));
        scored.push({ category, matches, score, longest });
    }

    if (scored.length === 0) {
        return { category: 'Otros', confidence: 0, matchedKeywords: [], source: 'rules' };
    }

    scored.sort((a, b) => (b.score - a.score) || (b.longest - a.longest));
    const [best, second] = scored;
    const tied = second && second.score === best.score && second.longest === best.longest;
    const confidence = tied ? 50 : Math.min(100, 70 + best.matches.length * 10);

    return { category: best.category, confidence, matchedKeywords: best.matches, source: 'rules' };
}

/**
 * Carga una sola vez las reglas aprendidas del usuario (antes: una consulta por producto).
 */
export async function loadUserRules(userId) {
    const rules = { codes: new Map(), keywords: [] };
    if (!userId) { return rules; }
    try {
        const { data, error } = await supabase
            .from('classifier_rules')
            .select('pattern, category, type')
            .eq('user_id', userId);
        if (error) { throw error; }
        for (const row of data || []) {
            if (!row?.pattern || !row?.category) { continue; }
            if (row.type === 'code') {
                rules.codes.set(String(row.pattern).trim(), row.category);
            } else {
                rules.keywords.push({ pattern: row.pattern, category: row.category });
            }
        }
    } catch (error) {
        logger.error('❌ Error cargando reglas del clasificador:', error);
    }
    return rules;
}

/**
 * Clasifica un producto (API previa). Si se pasan `rules`, no consulta la BD.
 */
export async function classifyProduct(product, userId = null, rules = null) {
    const effectiveRules = rules ?? (userId ? await loadUserRules(userId) : {});
    return classifyWithRules(product, effectiveRules);
}

/**
 * Aprende una nueva regla de clasificación.
 * Las palabras se guardan normalizadas y sin cantidades/unidades ("LECHE ALQUERÍA 1100ML" → "leche alqueria"),
 * así una corrección sirve para otras presentaciones del mismo producto y no se duplican reglas por mayúsculas.
 */
export async function learnRule(userId, pattern, category, type = 'keyword') {
    if (!userId || !pattern || !category) return false;
    const finalType = type === 'code' ? 'code' : 'keyword';
    const finalPattern = finalType === 'code' ? String(pattern).trim() : normalizePattern(pattern);
    const finalCategory = String(category).trim();
    if (!finalPattern || !finalCategory) return false;
    try {
        const { error } = await supabase
            .from('classifier_rules')
            .upsert({
                user_id: userId,
                pattern: finalPattern,
                category: finalCategory,
                type: finalType,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,pattern,type' });

        if (error) throw error;
        logger.info(`🧠 Regla aprendida: ${finalPattern} -> ${finalCategory} (${finalType})`);
        return true;
    } catch (error) {
        logger.error('❌ Error guardando aprendizaje:', error);
        return false;
    }
}

/**
 * Clasifica múltiples productos y determina la categoría principal
 */
export async function classifyInvoice(products, userId = null) {
    try {
        // Clasificar cada producto (ahora es async por la DB)
        const classifications = [];
        const rules = await loadUserRules(userId); // una sola consulta por factura
        for (const product of products) {
            const classification = await classifyProduct(product, userId, rules);
            classifications.push({
                ...product,
                ...classification,
            });
        }

        // Agrupar por categoría y sumar totales
        const categoryTotals = {};
        classifications.forEach(item => {
            if (!categoryTotals[item.category]) {
                categoryTotals[item.category] = {
                    total: 0,
                    count: 0,
                    confidence: 0,
                };
            }
            categoryTotals[item.category].total += Number(item.total) || 0;
            categoryTotals[item.category].count += 1;
            categoryTotals[item.category].confidence = Math.max(
                categoryTotals[item.category].confidence,
                item.confidence
            );
        });

        // Encontrar la categoría con mayor valor total
        let mainCategory = 'Otros';
        let maxTotal = 0;
        let mainConfidence = 0;

        for (const [category, data] of Object.entries(categoryTotals)) {
            if (data.total > maxTotal) {
                maxTotal = data.total;
                mainCategory = category;
                mainConfidence = data.confidence;
            }
        }

        // Determinar si necesita IA
        const needsAI = mainConfidence < 90 || mainCategory === 'Otros';

        logger.info(`🏷️  Clasificación: ${mainCategory} (confianza: ${mainConfidence}%)`);

        return {
            categoria: mainCategory,
            certeza: mainConfidence,
            necesita_ia: needsAI,
            productos_clasificados: classifications,
            razonamiento: needsAI
                ? 'Clasificación incierta, requiere revisión de IA'
                : `Clasificado como ${mainCategory} con alta confianza`,
        };
    } catch (error) {
        logger.error('❌ Error clasificando factura:', error);
        return {
            categoria: 'Otros',
            certeza: 0,
            necesita_ia: true,
            productos_clasificados: [],
            razonamiento: 'Error en clasificación automática',
        };
    }
}
