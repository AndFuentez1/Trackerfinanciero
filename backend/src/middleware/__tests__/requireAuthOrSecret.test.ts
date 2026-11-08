import { describe, it, expect, vi } from 'vitest';
import { createRequireAuthOrSecret } from '../requireAuth.js';

function mockRes() {
    const res = {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) { res.statusCode = code; return res; },
        json(payload: unknown) { res.body = payload; return res; },
    };
    return res;
}

describe('requireAuthOrSecret', () => {
    it('usa requireAuth cuando no hay cabecera x-cron-secret', () => {
        const requireAuth = vi.fn();
        const mw = createRequireAuthOrSecret(requireAuth, 'secreto-largo');
        const req = { headers: {}, query: { userId: 'u1' } };
        const res = mockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(requireAuth).toHaveBeenCalledWith(req, res, next);
        expect(next).not.toHaveBeenCalled();
    });

    it('deja pasar con el secreto correcto', () => {
        const requireAuth = vi.fn();
        const next = vi.fn();
        createRequireAuthOrSecret(requireAuth, 'secreto-largo')({ headers: { 'x-cron-secret': 'secreto-largo' } }, mockRes(), next);
        expect(next).toHaveBeenCalled();
        expect(requireAuth).not.toHaveBeenCalled();
    });

    it('responde 401 con secreto incorrecto o si no hay secreto configurado', () => {
        const next = vi.fn();
        const res1 = mockRes();
        createRequireAuthOrSecret(vi.fn(), 'secreto-largo')({ headers: { 'x-cron-secret': 'otro' } }, res1, next);
        expect(res1.statusCode).toBe(401);

        const res2 = mockRes();
        createRequireAuthOrSecret(vi.fn(), undefined)({ headers: { 'x-cron-secret': 'lo-que-sea' } }, res2, next);
        expect(res2.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });
});
