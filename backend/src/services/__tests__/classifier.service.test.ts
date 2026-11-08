import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase.service.js', () => ({ supabase: {} }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const { classifyWithRules, normalizePattern, matchesPhrase, normalizeText } = await import('../classifier.service.js');

const cat = (description: string, rules = {}) => classifyWithRules({ description }, rules).category;

describe('classifier: coincidencia por palabras completas', () => {
    it('no confunde subcadenas', () => {
        expect(cat('PANTALON JEAN AZUL')).toBe('Ropa, calzado y accesorios'); // antes: Alimentación ("pan")
        expect(cat('AGUACATE HASS')).not.toBe('Mecato y bebidas');           // antes: "agua"
        expect(cat('SALCHICHA RANCHERA')).not.toBe('Alimentación');          // antes: "sal"
        expect(cat('PAN TAJADO BIMBO')).toBe('Alimentación');
    });

    it('acepta plurales simples y quita tildes/puntuación', () => {
        expect(cat('Gaseosas Postobón x6')).toBe('Mecato y bebidas');
        expect(matchesPhrase(normalizeText('Medicamentos, genéricos').split(' '), 'medicamento')).toBe(true);
    });

    it('la frase más específica gana ("aceite motor" → Moto)', () => {
        expect(cat('ACEITE MOTOR 20W50')).toBe('Moto');
        expect(cat('ACEITE GIRASOL 1000ML')).toBe('Alimentación');
    });

    it('empate entre categorías → confianza baja', () => {
        const r = classifyWithRules({ description: 'JABON' }); // Cuidado personal y Aseo
        expect(r.confidence).toBeLessThan(90);
    });

    it('sin coincidencias → Otros con confianza 0', () => {
        expect(classifyWithRules({ description: 'XYZ 123' })).toMatchObject({ category: 'Otros', confidence: 0 });
    });
});

describe('classifier: reglas aprendidas', () => {
    const rules = {
        codes: new Map([['7702001', 'Mascotas']]),
        keywords: [
            { pattern: 'leche', category: 'Lácteos' },
            { pattern: 'leche alqueria deslactosada', category: 'Mercado' },
        ],
    };

    it('priorizan sobre las estáticas y gana la más específica', () => {
        expect(cat('LECHE ALQUERIA DESLACTOSADA 1100ML', rules)).toBe('Mercado');
        expect(cat('LECHE COLANTA', rules)).toBe('Lácteos');
    });

    it('el código aprendido tiene la máxima prioridad', () => {
        expect(classifyWithRules({ description: 'LECHE', code: '7702001' }, rules).category).toBe('Mascotas');
    });

    it('normalizePattern quita cantidades/unidades y rechaza patrones cortos', () => {
        expect(normalizePattern('LECHE ALQUERÍA 1100ML')).toBe('leche alqueria');
        expect(normalizePattern('Gaseosa x6 400 ml')).toBe('gaseosa');
        expect(normalizePattern('A 1')).toBeNull();
    });
});
