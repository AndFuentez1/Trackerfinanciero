import express from 'express';
import {
    processGmailInvoices,
    handleGmailWebhook,
    listPendingInvoices,
    searchGmailHistory,
    importGmailBatch,
    archiveGmailMessages,
    deleteGmailMessages,
    unarchiveGmailMessages
} from '../controllers/invoice.controller.ts';
import supabase from '../config/supabase.config.js';
import { createRequireAuth, createRequireAuthOrSecret } from '../middleware/requireAuth.js';

// El userId sale del JWT (requireAuth lo fija en body/query); el cliente ya no puede elegirlo.
const requireAuth = createRequireAuth((token: string) => supabase.auth.getUser(token));
// check-gmail también admite tareas programadas (n8n) con la cabecera x-cron-secret = CHECK_GMAIL_SECRET
const requireAuthOrCron = createRequireAuthOrSecret(requireAuth, process.env.CHECK_GMAIL_SECRET);

const router = express.Router();

// Procesar facturas manualmente
router.post('/check-gmail', requireAuthOrCron, processGmailInvoices);

// Buscar en historial de Gmail
router.get('/gmail/search', requireAuth, searchGmailHistory);

// Importar lote de mensajes
router.post('/gmail/import-batch', requireAuth, importGmailBatch);

// Archivar mensajes en historial (revisados)
router.post('/gmail/archive', requireAuth, archiveGmailMessages);

// Eliminar mensajes del historial
router.post('/gmail/delete', requireAuth, deleteGmailMessages);

// Desarchivar mensajes del historial
router.post('/gmail/unarchive', requireAuth, unarchiveGmailMessages);

// Webhook para Gmail Pub/Sub (futuro). Público: lo llama Google y hoy solo confirma recepción.
router.post('/gmail-webhook', handleGmailWebhook);

// Listar facturas pendientes
router.get('/invoices/pending', requireAuth, listPendingInvoices);

export default router;
