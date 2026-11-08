import express from 'express';
import { learnRule, normalizePattern } from '../services/classifier.service.js';
import logger from '../utils/logger.js';
import supabase from '../config/supabase.config.js';
import { createRequireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// El userId sale del JWT, no del cliente
router.use(createRequireAuth((token) => supabase.auth.getUser(token)));

/**
 * Aprende una nueva regla (Keyword o Código)
 */
router.post('/learn', async (req, res) => {
    try {
        const { userId, pattern, category, type } = req.body;

        if (!userId || !pattern || !category) {
            return res.status(400).json({ error: 'pattern y category requeridos' });
        }

        if ((type || 'keyword') === 'keyword' && !normalizePattern(pattern)) {
            return res.status(400).json({ error: 'El patrón es demasiado corto para aprender una regla' });
        }

        const success = await learnRule(userId, pattern, category, type || 'keyword');

        if (success) {
            res.json({ success: true, message: 'Aprendizaje registrado exitosamente' });
        } else {
            res.status(500).json({ error: 'No se pudo registrar el aprendizaje' });
        }
    } catch (error) {
        logger.error('❌ Error en endpoint /learn:', error);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
});

export default router;
