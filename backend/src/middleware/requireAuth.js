import { timingSafeEqual } from 'node:crypto';

/**
 * Middleware de autenticación por JWT de Supabase.
 *
 * - Exige `Authorization: Bearer <access_token>` y lo verifica con Supabase.
 * - La identidad se toma SIEMPRE del token: si el cliente envía un `userId`
 *   (body o query) distinto al del token, responde 403.
 * - Normaliza `req.body.userId` / `req.query.userId` (y `email` en el body) con los valores
 *   verificados para que los controladores nunca confíen en datos del cliente.
 *
 * Se expone como fábrica para poder inyectar `getUser` en tests sin credenciales reales.
 *
 * @param {(token: string) => Promise<{ data?: { user?: { id: string, email?: string | null } | null }, error?: unknown }>} getUser
 * @param {{ error: (...args: unknown[]) => void }} [log]
 */
export function createRequireAuth(getUser, log = console) {
    return async function requireAuth(req, res, next) {
        const header = req.headers?.authorization || '';
        const [scheme, token] = header.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        let user = null;
        try {
            const result = await getUser(token);
            user = result?.data?.user ?? null;
            if (result?.error || !user?.id) {
                return res.status(401).json({ error: 'Sesión inválida o expirada' });
            }
        } catch (error) {
            log.error('Error verificando token de sesión:', error);
            return res.status(401).json({ error: 'No se pudo verificar la sesión' });
        }

        const claimedUserId = req.body?.userId ?? req.query?.userId;
        if (claimedUserId && String(claimedUserId) !== user.id) {
            return res.status(403).json({ error: 'No autorizado para este usuario' });
        }

        req.authUser = { id: user.id, email: user.email ?? null };

        if (req.body && typeof req.body === 'object') {
            req.body.userId = user.id;
            if (user.email) {
                req.body.email = user.email;
            }
        }
        if (req.query && typeof req.query === 'object') {
            req.query.userId = user.id;
        }

        return next();
    };
}

/**
 * Para tareas servidor-a-servidor (p. ej. n8n llamando a /api/check-gmail):
 * acepta `x-cron-secret` igual a `secret` y entonces confía en el `userId` de la query/body.
 * Sin cabecera de secreto, exige sesión normal (`requireAuth`).
 * Si `secret` no está configurado, solo se acepta sesión.
 *
 * @param {(req: any, res: any, next: () => void) => unknown} requireAuth
 * @param {string | undefined} secret
 */
export function createRequireAuthOrSecret(requireAuth, secret) {
    return function requireAuthOrSecret(req, res, next) {
        const provided = req.headers?.['x-cron-secret'];
        if (provided === undefined) {
            return requireAuth(req, res, next);
        }
        if (!secret || typeof provided !== 'string' || !safeEqual(provided, secret)) {
            return res.status(401).json({ error: 'Secreto inválido' });
        }
        return next();
    };
}

function safeEqual(a, b) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
}
