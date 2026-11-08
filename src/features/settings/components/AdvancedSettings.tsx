import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConfigStatus } from './hooks/useUserConfigStatus';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { getBackendUrl, backendFetch } from '@/core/api/backend';
import { queryKeys } from '@/core/api/queryKeys';
import { useUserConfigStatus } from './hooks/useUserConfigStatus';
import { History, RefreshCw, Mail, CheckCircle2, ChevronDown, CheckSquare, Search, Sparkles, Inbox, AlertCircle } from 'lucide-react';
import { useBackendReady, type BackendStatus } from './hooks/useBackendReady';
import { cn } from '@/core/utils';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Settings2 } from 'lucide-react';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';

// Importing sub-components
import { GmailConfigSection, type GmailSyncPhase } from './AdvancedSettings/GmailConfigSection';
import { GeminiConfigSection } from './AdvancedSettings/GeminiConfigSection';
import { TelegramConfigSection } from './AdvancedSettings/TelegramConfigSection';
import { GmailHistoryDialog, type GmailHistoryItem, type GmailApprovalGroup, type GmailProduct, type GmailImportResult } from './AdvancedSettings/GmailHistoryDialog';
import { groupInvoiceItems, toTransactionDate, type InvoiceApprovalItem, type InvoiceTransactionGroup } from '@/features/finance/utils/invoiceGrouping';

const BACKEND_URL = getBackendUrl();

interface AdvancedSettingsProps {
    configStatus?: ConfigStatus;
    loading?: boolean;
    isCollapsible?: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AdvancedSettings({
    configStatus: configStatusProp,
    loading: loadingProp,
    isOpen,
    onOpenChange
}: AdvancedSettingsProps = {}) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { addTransaction } = useFinanceData();
    const queryClient = useQueryClient();
    const { categories, paymentMethods, refreshData } = useFinanceData();
    const gmailStatsQueryKey = ['gmail', 'processingStats', user?.id] as const;

    const { data: gmailProcessingStats = { manual: 0, automatic: 0, ai: 0 } } = useQuery({
        queryKey: gmailStatsQueryKey,
        queryFn: async () => {
            if (!user?.id) { return { manual: 0, automatic: 0, ai: 0 }; }
            const [manualRes, automaticRes, aiRes] = await Promise.all([
                supabase
                    .from('gmail_message_status')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('status', 'archived'),
                supabase
                    .from('pending_invoices')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('status', 'pending')
                    .eq('source', 'gmail'),
                supabase
                    .from('pending_invoices')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('status', 'pending')
                    .eq('source', 'ai'),
            ]);
            if (manualRes.error) { throw manualRes.error; }
            if (automaticRes.error) { throw automaticRes.error; }
            if (aiRes.error) { throw aiRes.error; }
            return {
                manual: manualRes.count ?? 0,
                automatic: automaticRes.count ?? 0,
                ai: aiRes.count ?? 0,
            };
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Gemini API Key
    const [geminiKey, setGeminiKey] = useState('');
    const [savingGemini, setSavingGemini] = useState(false);

    // Telegram
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [notifyRulesExceptions, setNotifyRulesExceptions] = useState(false);
    const [notifyAiExceptions, setNotifyAiExceptions] = useState(false);
    const [savingTelegram, setSavingTelegram] = useState(false);
    const [testingTelegram, setTestingTelegram] = useState(false);

    // Confirmation Dialog
    const [pendingAction, setPendingAction] = useState<'gemini' | 'telegram' | null>(null);
    const [showEmailConfirm, setShowEmailConfirm] = useState(false);

    // Gmail History Search
    const [searchRange, setSearchRange] = useState('');
    const [searchLimit, setSearchLimit] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [searchResults, setSearchResults] = useState<GmailHistoryItem[]>([]);
    const [searchCache, setSearchCache] = useState<{ days: number; results: GmailHistoryItem[] } | null>(null);
    const [lastSearchDays, setLastSearchDays] = useState<number | null>(null);
    const [searching, setSearching] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [hideApproved, setHideApproved] = useState(true);
    const [importResults, setImportResults] = useState<GmailImportResult[]>([]);
    const [importStep, setImportStep] = useState<'search' | 'review'>('search');
    const [approvingMessageId, setApprovingMessageId] = useState<string | null>(null);

    // Gmail Connection State
    const [gmailPhase, setGmailPhase] = useState<GmailSyncPhase>('idle');
    // Ventana de OAuth abierta y su vigilante: si se cierra sin avisar, el botón no puede quedar bloqueado
    const oauthPopupRef = useRef<Window | null>(null);
    const oauthWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isConnectingGmail = gmailPhase !== 'idle';

    // Fetch config status using React Query (fallback when no prop override)
    const { data: queryConfigStatus, isLoading: queryLoading, isError: queryError } = useUserConfigStatus(user?.id);
    const configStatus = configStatusProp ?? queryConfigStatus;
    const loading = loadingProp ?? queryLoading;

    // Distinguish initial load from actively waiting for connection
    const isLoadingConfig = loading && !configStatus && !queryError;

    // Poll backend readiness so the connect button shows live status
    const { status: backendStatus, retry: retryBackend } = useBackendReady(
        !configStatus?.gmailConnected  // only poll when not connected — avoids noise
    );

    // Actively syncing happens if both conditions are met:
    const isPerformingSync = isConnectingGmail && backendStatus === 'ready';

    // Update local state when config loads
    useEffect(() => {
        if (configStatus) {
            setNotifyRulesExceptions(configStatus.notifyRulesExceptions ?? false);
            setNotifyAiExceptions(configStatus.notifyAiExceptions ?? false);
        }
    }, [configStatus]);

    // Auto-assign first payment method to products and groups missing one
    useEffect(() => {
        if (paymentMethods.length === 0) { return; }
        setImportResults(prev => {
            let changed = false;
            const updated = prev.map(result => {
                // Fix groups
                const groups = result.groups?.map(group => {
                    if (!group.payment_method_id) {
                        changed = true;
                        return { ...group, payment_method_id: paymentMethods[0].id };
                    }
                    return group;
                });
                // Fix products
                const products = result.products?.map(product => {
                    if (!product.payment_method_id) {
                        changed = true;
                        return { ...product, payment_method_id: paymentMethods[0].id };
                    }
                    return product;
                });
                return { ...result, groups, products };
            });
            return changed ? updated : prev;
        });
    }, [paymentMethods]);

    // Auto-resolve category name from category_id for products and groups
    useEffect(() => {
        if (categories.length === 0) { return; }
        setImportResults(prev => {
            let changed = false;
            const updated = prev.map(result => {
                let resultChanged = false;

                // Fix groups
                const groups = result.groups?.map(group => {
                    if (!group.category_id) { return group; }
                    const match = categories.find(cat => cat.id === group.category_id);
                    if (!match || match.name === group.category) { return group; }
                    changed = true;
                    resultChanged = true;
                    return { ...group, category: match.name };
                });

                // Fix products
                const products = result.products?.map(product => {
                    if (!product.category_id) { return product; }
                    const match = categories.find(cat => cat.id === product.category_id);
                    if (!match || match.name === product.category) { return product; }
                    changed = true;
                    resultChanged = true;
                    return { ...product, category: match.name };
                });

                return resultChanged ? { ...result, groups, products } : result;
            });
            return changed ? updated : prev;
        });
    }, [categories]);

    const stopOAuthWatch = useCallback(() => {
        if (oauthWatchRef.current) {
            clearInterval(oauthWatchRef.current);
            oauthWatchRef.current = null;
        }
        oauthPopupRef.current = null;
    }, []);

    // Limpieza al desmontar
    useEffect(() => stopOAuthWatch, [stopOAuthWatch]);

    // Listen for OAuth success message from popup
    useEffect(() => {
        // Solo se aceptan mensajes del backend (página de callback) o de la propia app
        const allowedOrigins = new Set<string>([window.location.origin]);
        try { allowedOrigins.add(new URL(BACKEND_URL || window.location.origin, window.location.href).origin); } catch { /* URL inválida */ }

        const handleMessage = (event: MessageEvent) => {
            if (!allowedOrigins.has(event.origin)) { return; }
            if (['GMAIL_CONNECTED', 'GMAIL_ERROR', 'GMAIL_CLOSED'].includes(event.data?.type)) {
                stopOAuthWatch();
            }
            if (event.data?.type === 'GMAIL_CONNECTED') {
                // Optimistic UI update; luego se verifica el estado real con el backend
                setGmailPhase('verifying');
                queryClient.setQueryData(queryKeys.user.config(user?.id ?? 'unknown'), // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (old: Record<string, any> | undefined) => {
                        if (!old) { return old; }
                        return { ...old, gmailConnected: true };
                    });

                toast({
                    title: '✅ Conexión exitosa',
                    description: 'Tu cuenta de Gmail ha sido vinculada correctamente.'
                });
                queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user?.id) })
                    .finally(() => setGmailPhase('idle'));
            } else if (event.data?.type === 'GMAIL_ERROR') {
                setGmailPhase('idle');
                toast({
                    title: 'Error de Conexión',
                    description: event.data.error || 'No se pudo conectar con Gmail.',
                    variant: 'destructive'
                });
            } else if (event.data?.type === 'GMAIL_CLOSED') {
                // If the user closed the OAuth window manually
                setGmailPhase('idle');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user?.id, queryClient, toast, stopOAuthWatch]);

    useEffect(() => {
        if (!showHistoryDialog) {
            setSearchResults([]);
            setSelectedMessages([]);
            setSearchCache(null);
            setLastSearchDays(null);
            setImportResults([]);
            setImportStep('search');
            setApprovingMessageId(null);
        }
    }, [showHistoryDialog]);

    const connectGmail = async () => {
        if (!user?.id || !user?.email) {
            toast({
                title: 'Error',
                description: 'No hay sesión activa',
                variant: 'destructive'
            });
            return;
        }

        if (backendStatus !== 'ready') {
            toast({
                title: 'Servidor no disponible',
                description: 'Por favor, espera a que el servidor esté activo para conectar.',
                variant: 'destructive'
            });
            return;
        }

        setGmailPhase('requesting');
        // La ventana se abre de forma síncrona (evita el bloqueo de popups) y luego se redirige
        const popup = window.open('', '_blank', 'width=600,height=700');
        if (!popup) {
            setGmailPhase('idle');
            toast({
                title: 'Ventana bloqueada',
                description: 'Permite las ventanas emergentes para conectar tu cuenta de Gmail.',
                variant: 'destructive'
            });
            return;
        }

        try {
            // El backend emite un state firmado para el usuario autenticado (JWT)
            const response = await backendFetch(`${BACKEND_URL}/auth/google/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: window.location.origin })
            });
            const data = await response.json().catch(() => ({})) as { state?: string; error?: string };
            if (!response.ok || !data.state) {
                throw new Error(data.error || 'No se pudo iniciar la conexión con Google');
            }
            popup.location.href = `${BACKEND_URL}/auth/google?state=${encodeURIComponent(data.state)}`;
            setGmailPhase('authorizing');

            // Si la ventana se cierra sin enviar mensaje (error en Google, cierre con X), liberar el botón
            // y revalidar el estado real. Límite de 5 minutos por si la ventana queda abandonada.
            stopOAuthWatch();
            oauthPopupRef.current = popup;
            const startedAt = Date.now();
            oauthWatchRef.current = setInterval(() => {
                const win = oauthPopupRef.current;
                const timedOut = Date.now() - startedAt > 5 * 60 * 1000;
                if (win && !win.closed && !timedOut) { return; }
                if (win && !win.closed) { win.close(); }
                stopOAuthWatch();
                setGmailPhase(phase => (phase === 'authorizing' || phase === 'requesting' ? 'idle' : phase));
                queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
            }, 800);
        } catch (error) {
            popup.close();
            stopOAuthWatch();
            setGmailPhase('idle');
            toast({
                title: 'Error de Conexión',
                description: error instanceof Error ? error.message : 'No se pudo conectar con Gmail.',
                variant: 'destructive'
            });
        }
    };

    // Cancelar una conexión en curso (el usuario nunca queda bloqueado esperando a Google)
    const cancelConnectGmail = () => {
        const win = oauthPopupRef.current;
        if (win && !win.closed) { win.close(); }
        stopOAuthWatch();
        setGmailPhase('idle');
    };

    const disconnectGmail = async () => {
        if (isPerformingSync) { return; }
        if (!user?.id) { return; }

        setGmailPhase('disconnecting');
        try {
            const response = await backendFetch(`${BACKEND_URL}/api/user/config/gmail/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) { throw new Error('Error desconectando Gmail'); }

            // Optimistic update
            queryClient.setQueryData(queryKeys.user.config(user.id), // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (old: Record<string, any> | undefined) => {
                    if (!old) { return old; }
                    return { ...old, gmailConnected: false };
                });

            toast({
                title: 'Gmail desconectado',
                description: 'Tu cuenta de Gmail ha sido desconectada'
            });

            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo desconectar Gmail',
                variant: 'destructive'
            });
        } finally {
            setGmailPhase('idle');
        }
    };

    const performSaveGemini = async (includeEmail: boolean = false) => {
        if (!user?.id || !geminiKey.trim()) { return; }

        try {
            setSavingGemini(true);

            const body: { userId: string; geminiApiKey: string; email?: string } = {
                userId: user.id,
                geminiApiKey: geminiKey
            };
            if ((includeEmail || !configStatus?.hasEmail) && user.email) {
                body.email = user.email;
            }

            const response = await backendFetch(`${BACKEND_URL}/api/user/config/gemini`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(responseData?.error || 'Error guardando Gemini API Key');
            }

            toast({
                title: 'Gemini configurado',
                description: 'Tu API Key ha sido guardada de forma segura'
            });

            setGeminiKey('');
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo guardar la API Key',
                variant: 'destructive'
            });
        } finally {
            setSavingGemini(false);
            setPendingAction(null);
            setShowEmailConfirm(false);
        }
    };

    const handleSaveGeminiClick = () => {
        if (!user?.id || !geminiKey.trim()) {
            toast({
                title: 'Error',
                description: 'Ingresa una API Key válida',
                variant: 'destructive'
            });
            return;
        }

        if (!configStatus?.hasEmail && user.email) {
            setPendingAction('gemini');
            setShowEmailConfirm(true);
        } else {
            performSaveGemini();
        }
    };

    // Optimistic Toggle Handler
    const handleToggleChange = async (type: 'rules' | 'ai', value: boolean) => {
        if (!user?.id) { return; }

        // Optimistic update
        if (type === 'rules') {
            setNotifyRulesExceptions(value);
            if (value) { setNotifyAiExceptions(false); } // Mutually exclusive logic
        } else {
            setNotifyAiExceptions(value);
            if (value) { setNotifyRulesExceptions(false); }
        }

        try {
            const body: { userId: string; notifyRulesExceptions: boolean; notifyAiExceptions: boolean; email?: string } = {
                userId: user.id,
                // Partial update: don't send botToken/chatId unless we are saving them
                notifyRulesExceptions: type === 'rules' ? value : (value ? false : notifyRulesExceptions),
                notifyAiExceptions: type === 'ai' ? value : (value ? false : notifyAiExceptions)
            };

            // If user has no email in DB, we MUST attach it to this save too to ensure record exists
            if (!configStatus?.hasEmail && user.email) {
                body.email = user.email;
            }

            const response = await backendFetch(`${BACKEND_URL}/api/user/config/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) { throw new Error(responseData?.error || 'Failed to save toggle'); }

            // Background revalidation
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar el cambio';
            // Revert state on error (pessimistic rollback)
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
        }
    };


    const performSaveTelegram = async (includeEmail: boolean = false) => {
        if (!user?.id) { return; }

        try {
            setSavingTelegram(true);

            const body: { userId: string; botToken?: string; chatId?: string; notifyRulesExceptions: boolean; notifyAiExceptions: boolean; email?: string } = {
                userId: user.id,
                botToken: telegramBotToken.trim() || undefined, // undefined to trigger partial update logic in backend
                chatId: telegramChatId.trim() || undefined,
                notifyRulesExceptions, // Send current state
                notifyAiExceptions
            };
            if (includeEmail && user.email) {
                body.email = user.email;
            }

            const response = await backendFetch(`${BACKEND_URL}/api/user/config/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(responseData?.error || 'Error guardando configuración de Telegram');
            }

            toast({
                title: 'Telegram configurado',
                description: 'Credenciales guardadas correctamente'
            });

            setTelegramBotToken('');
            setTelegramChatId('');
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar la configuración';
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            });
        } finally {
            setSavingTelegram(false);
            setPendingAction(null);
            setShowEmailConfirm(false);
        }
    };

    const handleSaveTelegramClick = () => {
        if (!user?.id) { return; }

        if (!configStatus?.hasEmail && user.email) {
            setPendingAction('telegram');
            setShowEmailConfirm(true);
        } else {
            performSaveTelegram();
        }
    };

    const handleTestTelegramClick = async () => {
        if (!user?.id) { return; }
        setTestingTelegram(true);
        try {
            const response = await backendFetch(`${BACKEND_URL}/api/user/config/telegram/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo enviar el mensaje de prueba');
            }
            toast({
                title: 'Telegram verificado',
                description: 'Mensaje de prueba enviado correctamente.',
                className: "bg-success/10 border-success/30 text-foreground"
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
        } catch (error: unknown) {
            toast({
                title: 'Error',
                description: (error instanceof Error && error.message) || 'No se pudo enviar el mensaje de prueba',
                variant: 'destructive'
            });
        } finally {
            setTestingTelegram(false);
        }
    };

    const onConfirmEmail = () => {
        if (pendingAction === 'gemini') {
            performSaveGemini(true);
        } else if (pendingAction === 'telegram') {
            performSaveTelegram(true);
        }
    };

    const updateCacheAndView = (updater: (items: GmailHistoryItem[]) => GmailHistoryItem[]) => {
        setSearchCache(prev => {
            if (!prev) { return prev; }
            const updatedResults = updater(prev.results);
            if (lastSearchDays !== null) {
                const isLatest = lastSearchDays === 60 && searchRange === 'latest';
                const sortedResults = getFilteredSearchResults(updatedResults, lastSearchDays, isLatest);
                applySearchResults(sortedResults, lastSearchDays);
            } else {
                setSearchResults(sortResults(updatedResults));
            }
            return { ...prev, results: updatedResults };
        });
    };

    const unarchiveMessages = async (messageIds: string[]) => {
        if (!user?.id || messageIds.length === 0) { return; }
        try {
            const res = await backendFetch(`${BACKEND_URL}/api/gmail/unarchive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds })
            });
            if (!res.ok) { throw new Error('No se pudo desarchivar'); }
            updateCacheAndView(prev => prev.map(item => (
                messageIds.includes(item.id) ? { ...item, status: 'unread' } : item
            )));
            toast({ title: 'Factura desarchivada', description: 'La factura ya puede ser importada nuevamente.' });
        } catch {
            toast({ title: 'Error', description: 'No se pudo desarchivar la factura', variant: 'destructive' });
        }
    };

    const archiveMessages = async (messageIds: string[]) => {
        if (!user?.id || messageIds.length === 0) { return; }
        try {
            const res = await backendFetch(`${BACKEND_URL}/api/gmail/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds })
            });
            if (!res.ok) { throw new Error('No se pudo archivar'); }
            updateCacheAndView(prev => prev.map(item => (
                messageIds.includes(item.id) ? { ...item, status: 'archived' } : item
            )));
        } catch {
            toast({ title: 'Error', description: 'No se pudo archivar la factura', variant: 'destructive' });
        }
    };

    const deleteMessages = async (messageIds: string[]) => {
        if (!user?.id || messageIds.length === 0) { return; }
        try {
            const res = await backendFetch(`${BACKEND_URL}/api/gmail/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds })
            });
            if (!res.ok) { throw new Error('No se pudo eliminar'); }
            updateCacheAndView(prev => prev.filter(item => !messageIds.includes(item.id)));
            setSelectedMessages(prev => prev.filter(id => !messageIds.includes(id)));
        } catch {
            toast({ title: 'Error', description: 'No se pudo eliminar la factura', variant: 'destructive' });
        }
    };

    const normalizeStatus = (status?: string) => (
        status === 'approved' || status === 'loan_queued' ? 'archived' : status
    );
    const getDateMs = (item: GmailHistoryItem) => {
        const internal = item.internalDate ? Number(item.internalDate) : NaN;
        if (!Number.isNaN(internal) && internal > 0) { return internal; }
        if (item.date) {
            const parsed = Date.parse(item.date);
            if (!Number.isNaN(parsed)) { return parsed; }
        }
        return 0;
    };
    const filterByDays = (items: GmailHistoryItem[], days: number) => {
        if (!days || days <= 0) { return items; }
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return items.filter(item => {
            const ts = getDateMs(item);
            return ts === 0 ? true : ts >= cutoff;
        });
    };
    const sortResults = (items: GmailHistoryItem[]) => {
        const rank = (status?: string) => {
            const normalized = normalizeStatus(status);
            if (normalized === 'archived') { return 2; }
            if (normalized === 'read') { return 1; }
            return 0;
        };
        return [...items].sort((a, b) => {
            const rankDiff = rank(a.status) - rank(b.status);
            if (rankDiff !== 0) { return rankDiff; }
            return getDateMs(b) - getDateMs(a);
        });
    };
    const getFilteredSearchResults = (items: GmailHistoryItem[], days: number, isLatest: boolean = false) => {
        const normalized = items
            .map(item => ({ ...item, status: normalizeStatus(item.status) }))
            .filter(item => item.status !== 'deleted');

        let filtered = isLatest
            ? normalized.filter(item => item.status !== 'archived')
            : filterByDays(normalized, days);

        if (isLatest && filtered.length > 0) {
            filtered = [filtered.sort((a, b) => getDateMs(b) - getDateMs(a))[0]];
        }

        return sortResults(filtered);
    };

    const applySearchResults = (sorted: GmailHistoryItem[], days: number) => {
        setSearchResults(sorted);
        setSelectedMessages(sorted.filter(r => r.status !== 'archived').map(r => r.id));
        setLastSearchDays(days);
    };

    const updateImportProduct = (messageId: string, index: number, updates: Partial<GmailProduct>) => {
        setImportResults(prev => prev.map(result => {
            if (result.messageId !== messageId) { return result; }
            const products = result.products?.map((p, i) => {
                if (i !== index) { return p; }
                const next = { ...p, ...updates };
                // Cambio manual de categoría → se aprenderá al aprobar
                if (updates.category_id !== undefined || updates.category !== undefined) {
                    next.manualCategory = true;
                }
                // Cantidad/precio editados → recalcular total
                if (updates.quantity !== undefined || updates.price !== undefined) {
                    next.total = Math.round(parseNumberValue(next.quantity) * parseNumberValue(next.price) * 100) / 100;
                }
                return next;
            });
            return { ...result, products };
        }));
    };

    const removeImportProduct = (messageId: string, index: number) => {
        setImportResults(prev => prev.map(result => (
            result.messageId === messageId
                ? { ...result, products: result.products?.filter((_, i) => i !== index) }
                : result
        )));
    };

    // Enseña al clasificador las categorías corregidas a mano (no bloquea la aprobación)
    const learnManualCategories = (products: GmailProduct[]) => {
        products
            .filter(p => p.manualCategory && p.category && p.description)
            .forEach(p => {
                const send = (pattern: string, type: 'keyword' | 'code') => backendFetch(`${BACKEND_URL}/api/classifier/learn`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pattern, category: p.category, type }),
                }).catch(() => undefined);
                void send(p.description.split('(')[0].trim(), 'keyword');
                if (p.code) { void send(String(p.code), 'code'); }
            });
    };

    const handleApproveInvoice = async (messageId: string) => {
        const target = importResults.find(result => result.messageId === messageId);
        if (!target) { return; }

        if (target.status === 'loan_queued') {
            toast({ title: 'Aviso', description: 'Esta transferencia ya fue enviada a préstamos.' });
            return;
        }

        if (target.status === 'pending') {
            toast({ title: 'Aviso', description: 'Esta factura ya ha sido importada a la zona de reclasificación.' });
            return;
        }

        // Facturas sin productos pero con grupos (p. ej. total sin detalle): los grupos se aprueban como productos
        const products: GmailProduct[] = target.products && target.products.length > 0
            ? target.products
            : (target.groups ?? []).map(g => ({
                description: g.description,
                quantity: 1,
                price: g.amount,
                total: g.amount,
                category: g.category,
                category_id: g.category_id,
                payment_method_id: g.payment_method_id,
            }));
        if (products.length === 0) {
            toast({ title: 'Error', description: 'La factura no tiene productos válidos.', variant: 'destructive' });
            return;
        }

        if (!user?.id) {
            toast({ title: 'Error', description: 'No hay sesión activa', variant: 'destructive' });
            return;
        }

        // 1. Validar antes de escribir nada
        for (const product of products) {
            const amount = parseNumberValue(product.total);
            if (!amount || amount <= 0) {
                toast({ title: 'Aviso', description: `"${product.description}" tiene costo cero. Corrígelo o quítalo antes de importar.`, variant: 'destructive' });
                return;
            }
            if (!product.payment_method_id) {
                toast({ title: 'Error', description: 'Selecciona un método de pago para todos los productos', variant: 'destructive' });
                return;
            }
            if (!product.category_id && !product.category?.trim()) {
                toast({ title: 'Error', description: 'Selecciona una categoría para todos los productos', variant: 'destructive' });
                return;
            }
        }

        setApprovingMessageId(messageId);
        try {
            // 2. Resolver categorías (solo de gasto; se crean si no existen)
            const categoryCache = new Map<string, string>();
            const ensureExpenseCategoryId = async (name: string) => {
                const normalized = name.toLowerCase().trim();
                if (!normalized) { return null; }
                const cached = categoryCache.get(normalized);
                if (cached) { return cached; }

                const existing = categories.find(c => c.type === 'expense' && c.name.toLowerCase().trim() === normalized);
                if (existing) {
                    categoryCache.set(normalized, existing.id);
                    return existing.id;
                }

                const color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
                const { data: newCategory, error } = await supabase
                    .from('categories')
                    .insert({ name: name.trim(), type: 'expense', user_id: user.id, color })
                    .select()
                    .single();
                if (error) { throw error; }
                categoryCache.set(normalized, newCategory.id);
                return newCategory.id as string;
            };

            const items: InvoiceApprovalItem[] = [];
            for (const product of products) {
                const categoryName = resolveCategoryLabel(product.category, product.category_id);
                const categoryId = product.category_id || await ensureExpenseCategoryId(categoryName);
                items.push({
                    description: product.description,
                    total: parseNumberValue(product.total),
                    category_id: categoryId,
                    category: categoryName,
                    payment_method_id: product.payment_method_id as string,
                });
            }

            // 3. Una transacción por (categoría, método de pago), en serie: los saldos se actualizan
            //    con lectura+escritura y en paralelo se pisaban.
            const groups = groupInvoiceItems(items, target.store);
            const date = toTransactionDate(target.date);
            const done: InvoiceTransactionGroup[] = [];
            for (const group of groups) {
                const result = await addTransaction({
                    amount: group.amount,
                    description: group.description,
                    category: group.category,
                    category_id: group.category_id,
                    type: 'expense',
                    payment_method_id: group.payment_method_id,
                    date,
                });
                if (result && 'error' in result && result.error) {
                    // Quitar de la factura lo ya registrado para que reintentar no duplique
                    const doneDescriptions = new Set(done.flatMap(g => g.items.map(i => i.description)));
                    setImportResults(prev => prev.map(r => r.messageId !== messageId ? r : {
                        ...r,
                        products: r.products?.filter(p => !doneDescriptions.has(p.description)),
                    }));
                    toast({
                        title: 'Importación incompleta',
                        description: `Se registraron ${done.length} de ${groups.length} grupos. Revisa y vuelve a aprobar el resto.`,
                        variant: 'destructive',
                    });
                    return;
                }
                done.push(group);
            }

            learnManualCategories(products);
            await archiveMessages([messageId]);

            toast({
                title: 'Importación exitosa',
                description: groups.length === 1
                    ? 'La compra se registró en tu balance.'
                    : `La compra se registró en ${groups.length} categorías.`,
            });
            setImportResults(prev => prev.filter(result => result.messageId !== messageId));
            refreshData();
        } catch (error: unknown) {
            console.error('[AdvancedSettings] Approval failed', error);
            toast({ title: 'Error', description: 'No se pudo procesar la factura', variant: 'destructive' });
        } finally {
            setApprovingMessageId(null);
        }
    };

    // Aprobar todas en serie (en paralelo se pisaban los saldos de un mismo método de pago)
    const handleApproveAll = async (messageIds: string[]) => {
        for (const id of messageIds) {
            await handleApproveInvoice(id);
        }
    };

    // Transferencia → préstamo en borrador (antes dependía de un setTimeout y del estado ya actualizado)
    const handleSendToLoans = async (messageId: string) => {
        const target = importResults.find(result => result.messageId === messageId);
        if (!target || !user?.id) { return; }
        setApprovingMessageId(messageId);
        try {
            const totalAmount = target.products?.reduce((acc, p) => acc + parseNumberValue(p.total), 0)
                || target.groups?.reduce((acc, g) => acc + parseNumberValue(g.amount), 0)
                || parseNumberValue(target.total)
                || 0;
            const description = target.subject || target.store || 'Préstamo desde Gmail';
            const paymentMethodId = target.products?.[0]?.payment_method_id || target.groups?.[0]?.payment_method_id || null;

            const { error: loanError } = await supabase
                .from('loans')
                .insert({
                    name: description.substring(0, 100),
                    total_amount: totalAmount,
                    paid_amount: 0,
                    type: 'borrowed',
                    user_id: user.id,
                    payment_method_id: paymentMethodId,
                    is_disbursed: false,
                    updated_at: new Date().toISOString(),
                });
            if (loanError) { throw loanError; }

            await archiveMessages([messageId]);
            toast({ title: 'Enviado a Préstamos', description: 'El registro se creó como pendiente en la sección de Préstamos.' });
            setImportResults(prev => prev.filter(result => result.messageId !== messageId));
            refreshData();
        } catch (error: unknown) {
            console.error('[AdvancedSettings] Send to loans failed', error);
            toast({ title: 'Error', description: 'No se pudo enviar a préstamos', variant: 'destructive' });
        } finally {
            setApprovingMessageId(null);
        }
    };

    const visibleResults = hideApproved
        ? searchResults.filter(r => r.status !== 'archived')
        : searchResults;
    const selectableResults = visibleResults.filter(r => r.status !== 'archived');
    const hasOnlyArchivedHidden = hideApproved && searchResults.length > 0 && visibleResults.length === 0;
    const isReviewing = importStep === 'review';

    // Internal utils that need to be passed down
    const parseDateValue = (value?: string | null) => {
        if (!value) { return null; }
        const trimmed = value.toString().trim();
        const numeric = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
        const date = new Date(numeric ?? trimmed);
        if (Number.isNaN(date.getTime())) { return null; }
        return date;
    };
    const parseNumberValue = (value?: string | number | null) => {
        if (value === null || value === undefined) { return 0; }
        if (typeof value === 'number') { return Number.isFinite(value) ? value : 0; }
        const raw = value.toString().trim().replace(/[^0-9,.]/g, ''); // Remove non-numeric except , and .
        if (!raw) { return 0; }
        let normalized = raw;
        const hasComma = raw.includes(',');
        const hasDot = raw.includes('.');
        if (hasComma && hasDot) {
            if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
                normalized = raw.replace(/\./g, '').replace(/,/g, '.');
            } else {
                normalized = raw.replace(/,/g, '');
            }
        } else if (hasComma && !hasDot) {
            // Check if it's thousands separator or decimal
            const parts = raw.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                normalized = raw.replace(/,/g, '.');
            } else {
                normalized = raw.replace(/,/g, '');
            }
        }

        const parsed = Number.parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const lookupHistoryItem = (id: string) =>
        searchCache?.results.find(item => item.id === id) ||
        searchResults.find(item => item.id === id);

    const resolveDateIso = (...candidates: Array<string | undefined | null>) => {
        for (const candidate of candidates) {
            const parsed = parseDateValue(candidate);
            if (parsed) { return parsed.toISOString(); }
        }
        return new Date().toISOString();
    };

    const resolveCategoryLabel = (category?: string | null, categoryId?: string | null) => {
        if (categoryId) {
            const match = categories.find(cat => cat.id === categoryId);
            if (match) { return match.name; }
        }
        return category || 'Otros';
    };

    const buildFallbackGroup = (messageId: string, meta?: GmailHistoryItem, index: number = 0, defaultAmount: number = 0, defaultTitle?: string): GmailApprovalGroup => ({
        id: `manual-${messageId}-${index}`,
        description: defaultTitle || meta?.subject || meta?.snippet || 'Factura Gmail',
        category: 'Otros',
        amount: defaultAmount,
        arrival_date: resolveDateIso(meta?.date, meta?.internalDate),
        payment_method_id: paymentMethods[0]?.id ?? null,
    });
    const normalizeProducts = (products?: GmailProduct[], metaOrTitle?: GmailHistoryItem | string, amount: number = 0) => {
        if (!products || products.length === 0) {
            // Guarantee at least one fallback product so the UI can be approved
            const title = typeof metaOrTitle === 'string' ? metaOrTitle : metaOrTitle?.subject;
            const safeSubj = title && title.length > 3 ? title.substring(0, 30) : 'Factura';
            return [{
                description: `Manual - ${safeSubj}`,
                quantity: 1,
                price: amount,
                total: amount,
                category: 'Otros',
                payment_method_id: paymentMethods.length > 0 ? paymentMethods[0].id : null,
            }];
        }
        return products.map((product, index) => {
            let catId = product.category_id;
            if (!catId && product.category) {
                const match = categories.find(c =>
                    c.name.toLowerCase().trim() === product.category?.toLowerCase().trim()
                );
                catId = match?.id || null;
            }
            return {
                ...product,
                description: product.description || `Producto ${index + 1}`,
                quantity: parseNumberValue(product.quantity),
                price: parseNumberValue(product.price),
                total: parseNumberValue(product.total),
                category_id: catId,
                totalExclTax: Number.isFinite(parseNumberValue(product.totalExclTax)) ? parseNumberValue(product.totalExclTax) : undefined,
                taxAmount: Number.isFinite(parseNumberValue(product.taxAmount)) ? parseNumberValue(product.taxAmount) : undefined,
                payment_method_id: paymentMethods.length > 0 ? paymentMethods[0].id : null,
            };
        });
    };
    const normalizeImportResults = (
        results: GmailImportResult[],
        selectedIds: string[],
        errorMessage?: string
    ) => {
        const normalized = results.map(result => {
            const meta = lookupHistoryItem(result.messageId);
            const hasGroups = Boolean(result.groups && result.groups.length > 0);
            const isLoanQueued = result.status === 'loan_queued';
            const totalVal = result.total || 0;
            const fallbackTitle = result.subject || result.store;

            const products = isLoanQueued ? [] : normalizeProducts(result.products, meta || fallbackTitle, totalVal);
            const groups = isLoanQueued
                ? []
                : hasGroups
                    ? result.groups!.map((group, index) => ({
                        ...group,
                        id: group.id || `manual-${result.messageId}-${index}`,
                        description: group.description || result.subject || meta?.subject || meta?.snippet || 'Factura Gmail',
                        category: resolveCategoryLabel(group.category, group.category_id),
                        amount: Number.isFinite(Number(group.amount)) ? Number(group.amount) : 0,
                        arrival_date: resolveDateIso(group.arrival_date, meta?.date, meta?.internalDate),
                    }))
                    : (result.status === 'telegram' ? [] : [buildFallbackGroup(result.messageId, meta, 0, totalVal, fallbackTitle)]);

            return {
                ...result,
                date: result.date ?? meta?.date ?? meta?.internalDate,
                error: result.error,
                status: result.status || (result.error ? 'error' : 'pending'),
                groups,
                products
            };
        });

        const existing = new Set(normalized.map(r => r.messageId));
        const fallback = selectedIds
            .filter(id => !existing.has(id))
            .map(id => {
                const meta = lookupHistoryItem(id);
                return {
                    messageId: id,
                    status: 'error',
                    store: meta?.subject || meta?.from || 'Factura Gmail',
                    total: 0,
                    date: meta?.date ?? meta?.internalDate,
                    groups: [buildFallbackGroup(id, meta)],
                    products: [],
                    error: errorMessage
                } as GmailImportResult;
            });
        return [...normalized, ...fallback];
    };

    const getImportDateMs = (item: GmailImportResult & { meta?: GmailHistoryItem | undefined }) => {
        const candidates = [
            item.date,
            item.meta?.date,
            item.meta?.internalDate,
            item.groups?.[0]?.arrival_date
        ];
        for (const candidate of candidates) {
            const parsed = parseDateValue(candidate);
            if (parsed) { return parsed.getTime(); }
        }
        return 0;
    };
    const reviewItems = [...importResults]
        .map(result => ({
            ...result,
            meta: lookupHistoryItem(result.messageId)
        }))
        .sort((a, b) => getImportDateMs(b) - getImportDateMs(a));

    const handleSearchClick = async () => {
        if (!user?.id) { return; }

        const daysParam = searchRange ? `&days=${searchRange}` : '';
        const limitParam = searchLimit ? `&maxResults=${searchLimit}` : '';
        const typeParam = searchType !== 'all' ? `&type=${searchType}` : '';

        setSearching(true);
        try {
            // El backend identifica al usuario por el JWT (backendFetch); la búsqueda puede tardar
            const res = await backendFetch(`${BACKEND_URL}/api/gmail/search?markRead=1${daysParam}${limitParam}${typeParam}`, {}, 120000);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message = data?.error || data?.details || 'No se pudo buscar en el historial';
                throw new Error(message);
            }

            // The backend now handles the 'days' and 'maxResults' filtering.
            // We pass a large number to getFilteredSearchResults to effectively disable client-side day filtering,
            // as the backend has already applied the relevant date range.
            const limitedResults = getFilteredSearchResults(data.results || [], 3650, false);
            applySearchResults(limitedResults, Number(searchRange || '0'));
            const foundCount = limitedResults.length;

            if (foundCount === 1) {
                // Auto-import if only 1 result is found
                toast({
                    title: 'Búsqueda completada',
                    description: `Se encontró 1 posible factura. Importando automáticamente...`
                });
                await handleImportSelectedClick([limitedResults[0].id]);
                return;
            }

            toast({
                title: 'Búsqueda completada',
                description: `Se encontraron ${data.count || foundCount} posibles facturas.`
            });
        } catch (err: unknown) {
            const message = (err instanceof Error && err.message) || 'No se pudo buscar en el historial';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setSearching(false);
        }
    };

    const handleImportSelectedClick = async (overrideIds?: string[]) => {
        const idsToImport = Array.isArray(overrideIds) ? overrideIds : (selectedMessages ?? []);
        const selectedSnapshot = [...idsToImport];
        setImporting(true);
        try {
            const res = await backendFetch(`${BACKEND_URL}/api/gmail/import-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: idsToImport })
            }, 300000);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || data?.details || 'No se pudo completar la importación');
            }
            const results = (data.results || []) as GmailImportResult[];
            const normalizedResults = normalizeImportResults(results, selectedSnapshot);

            if (!overrideIds) {
                toast({
                    title: '✅ Importación finalizada',
                    description: `Procesadas: ${data.processed ?? results.length}, Duplicadas: ${data.skipped ?? 0}, Errores: ${data.errors ?? 0}`
                });
            } else {
                toast({
                    title: '✅ Factura lista para revisión',
                    description: `Procesada 1 factura correctamente.`
                });
            }

            setImportResults(normalizedResults);
            setImportStep('review');
            if (!overrideIds) {
                setSelectedMessages([]);
            }
            updateCacheAndView(prev => prev.map(item => (
                selectedSnapshot.includes(item.id) ? { ...item, status: 'archived' } : item
            )));
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user?.id) });
        } catch (error: unknown) {
            const message = (error instanceof Error && error.message) || 'No se pudo completar la importación';
            const fallbackResults = normalizeImportResults([], selectedSnapshot, message);
            if (fallbackResults.length > 0) {
                setImportResults(fallbackResults);
                setImportStep('review');
                if (!overrideIds) {
                    setSelectedMessages([]);
                }
            }
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setImporting(false);
        }
    };

    const cardContent = (
        <CardContent className="space-y-8 pt-6">
            <GmailConfigSection
                configStatus={configStatus}
                isPerformingSync={isPerformingSync}
                syncPhase={gmailPhase}
                isSearching={searching}
                isImporting={importing}
                backendStatus={backendStatus}
                onConnect={connectGmail}
                onCancelConnect={cancelConnectGmail}
                onDisconnect={disconnectGmail}
                onRetryBackend={retryBackend}
                onShowHistory={() => setShowHistoryDialog(true)}
                manualProcessedCount={gmailProcessingStats.manual}
                automaticProcessedCount={gmailProcessingStats.automatic}
                aiProcessedCount={gmailProcessingStats.ai}
            />

            <div className="border-t" />

            <GeminiConfigSection
                configStatus={configStatus}
                isSyncing={isPerformingSync || isLoadingConfig}
                geminiKey={geminiKey}
                savingGemini={savingGemini}
                onGeminiKeyChange={setGeminiKey}
                onSaveGeminiClick={handleSaveGeminiClick}
            />

            <div className="border-t" />

            <TelegramConfigSection
                configStatus={configStatus}
                isSyncing={isPerformingSync || isLoadingConfig}
                telegramBotToken={telegramBotToken}
                telegramChatId={telegramChatId}
                notifyRulesExceptions={notifyRulesExceptions}
                notifyAiExceptions={notifyAiExceptions}
                savingTelegram={savingTelegram}
                testingTelegram={testingTelegram}
                onBotTokenChange={setTelegramBotToken}
                onChatIdChange={setTelegramChatId}
                onToggleRules={(checked) => handleToggleChange('rules', checked)}
                onToggleAi={(checked) => handleToggleChange('ai', checked)}
                onSaveTelegramClick={handleSaveTelegramClick}
                onTestTelegramClick={handleTestTelegramClick}
            />
        </CardContent>
    );

    return (
        <Card className="rounded-2xl shadow-sm border-border bg-gray-50/50 dark:bg-muted/20 overflow-hidden transition-all duration-300">
            <Collapsible open={isOpen} onOpenChange={onOpenChange}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="flex shrink-0 items-center justify-center p-1">
                                    <Settings2 className="h-5 w-5 text-primary" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col min-w-0 text-left">
                                    <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                                        Preferencias Avanzadas
                                    </p>
                                    <p className="text-[15px] text-muted-foreground mt-1 leading-tight">
                                        Automatizaciones y vinculación con servicios externos
                                    </p>
                                </div>
                            </div>
                            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200 mt-1", isOpen && "rotate-180")} />
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-in slide-in-from-top-2 duration-200">
                    <div className="border-t" />
                    {cardContent}
                </CollapsibleContent>
            </Collapsible>

            <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Vincular Correo Electrónico</AlertDialogTitle>
                        <AlertDialogDescription>
                            Para guardar esta configuración, necesitamos vincular tu correo electrónico actual ({user?.email}) a tu perfil de configuración.
                            <br /><br />
                            ¿Deseas continuar usando <strong>{user?.email}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowEmailConfirm(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmEmail}>Sí, vincular y guardar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <GmailHistoryDialog
                open={showHistoryDialog}
                onOpenChange={setShowHistoryDialog}
                isReviewing={isReviewing}
                importStep={importStep}
                setImportStep={setImportStep}

                searchRange={searchRange}
                setSearchRange={setSearchRange}
                searchLimit={searchLimit}
                setSearchLimit={setSearchLimit}
                searchType={searchType}
                setSearchType={setSearchType}
                hideApproved={hideApproved}
                setHideApproved={setHideApproved}
                searching={searching}
                handleSearch={handleSearchClick}

                visibleResults={visibleResults}
                selectableResults={selectableResults}
                selectedMessages={selectedMessages}
                setSelectedMessages={setSelectedMessages}
                hasOnlyArchivedHidden={hasOnlyArchivedHidden}

                unarchiveMessages={unarchiveMessages}
                archiveMessages={archiveMessages}
                deleteMessages={deleteMessages}

                importing={importing}
                handleImportSelected={handleImportSelectedClick}

                reviewItems={reviewItems}
                approvingMessageId={approvingMessageId}
                paymentMethods={paymentMethods}
                categories={categories}

                updateImportProduct={updateImportProduct}
                removeImportProduct={removeImportProduct}
                handleApproveInvoice={handleApproveInvoice}
                handleApproveAll={handleApproveAll}
                handleSendToLoans={handleSendToLoans}
                archivedCount={searchResults.filter(r => r.status === 'archived').length}
                setImportResults={setImportResults}

                normalizeStatus={normalizeStatus}
                safeFormatDate={(val) => {
                    const parsed = parseDateValue(val);
                    return parsed ? format(parsed, 'dd MMM yyyy', { locale: es }) : 'N/A';
                }}
                parseNumberValue={parseNumberValue}
                resolveCategoryLabel={resolveCategoryLabel}

                onCancel={() => {
                    setShowHistoryDialog(false);
                    setSearchResults([]);
                    setSelectedMessages([]);
                    setSearchCache(null);
                    setLastSearchDays(null);
                }}
            />
        </Card>
    );
}
