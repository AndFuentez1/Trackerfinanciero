import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Mail, Key, Send, CheckCircle2, XCircle, Loader2, Search, History, Trash2, CheckSquare, Archive, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { ConfigStatus } from './hooks/useUserConfigStatus';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Checkbox } from '@/shared/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
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
import { Switch } from '@/shared/ui/switch';
import { getBackendUrl } from '@/core/api/backend';
import { queryKeys } from '@/core/api/queryKeys';
import { useUserConfigStatus } from './hooks/useUserConfigStatus';
import { cn } from '@/core/utils';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { ChevronDown, Settings2 } from 'lucide-react';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const BACKEND_URL = getBackendUrl();

interface AdvancedSettingsProps {
    configStatus?: ConfigStatus;
    loading?: boolean;
    isCollapsible?: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

type GmailHistoryItem = {
    id: string;
    subject?: string;
    from?: string;
    date?: string;
    internalDate?: string;
    snippet?: string;
    status?: string;
};

type GmailApprovalGroup = {
    id: string;
    description: string;
    category: string;
    category_id?: string | null;
    amount: number;
    arrival_date: string;
    payment_method_id: string | null;
};

type GmailProduct = {
    description: string;
    quantity: number;
    price: number;
    total: number;
    totalExclTax?: number;
    taxAmount?: number;
    code?: string | null;
    category?: string;
    category_id?: string | null; // Add category_id
    payment_method_id?: string | null; // Add payment method
    confidence?: number;
    source?: string;
};

type GmailImportResult = {
    messageId: string;
    status: 'pending' | 'telegram' | 'duplicate' | 'error' | string;
    stepOfFailure?: 'rules' | 'ai' | null;
    store?: string;
    total?: number;
    date?: string;
    groups?: GmailApprovalGroup[];
    products?: GmailProduct[];
    error?: string;
};

export function AdvancedSettings({
    configStatus: configStatusProp,
    loading: loadingProp,
    isOpen,
    onOpenChange
}: AdvancedSettingsProps = {}) {
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { categories, paymentMethods, addTransactionsBulk, refreshData } = useFinanceData();

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
    const [searchRange, setSearchRange] = useState('latest');
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
    const [reviewViewByMessageId, setReviewViewByMessageId] = useState<Record<string, 'products' | 'groups'>>({});

    // Fetch config status using React Query (fallback when no prop override)
    const { data: queryConfigStatus, isLoading: queryLoading } = useUserConfigStatus(user?.id);
    const configStatus = configStatusProp ?? queryConfigStatus;
    const loading = loadingProp ?? queryLoading;
    const isSyncing = loading && !configStatus;

    // Update local state when config loads
    useEffect(() => {
        if (configStatus) {
            setNotifyRulesExceptions(configStatus.notifyRulesExceptions ?? false);
            setNotifyAiExceptions(configStatus.notifyAiExceptions ?? false);
        }
    }, [configStatus]);

    useEffect(() => {
        if (paymentMethods.length === 0) { return; }
        setImportResults(prev => {
            let changed = false;
            const updated = prev.map(result => {
                if (!result.groups || result.groups.length === 0) { return result; }
                const groups = result.groups.map(group => {
                    if (!group.payment_method_id) {
                        changed = true;
                        return { ...group, payment_method_id: paymentMethods[0].id };
                    }
                    return group;
                });
                return { ...result, groups };
            });
            return changed ? updated : prev;
        });
    }, [paymentMethods]);

    useEffect(() => {
        if (categories.length === 0) { return; }
        setImportResults(prev => {
            let changed = false;
            const updated = prev.map(result => {
                if (!result.groups || result.groups.length === 0) { return result; }
                let resultChanged = false;
                const groups = result.groups.map(group => {
                    if (!group.category_id) { return group; }
                    const match = categories.find(cat => cat.id === group.category_id);
                    if (!match || match.name === group.category) { return group; }
                    changed = true;
                    resultChanged = true;
                    return { ...group, category: match.name };
                });
                return resultChanged ? { ...result, groups } : result;
            });
            return changed ? updated : prev;
        });
    }, [categories]);

    // Listen for OAuth success message from popup
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'GMAIL_CONNECTED') {
                // Optimistic UI update
                queryClient.setQueryData(queryKeys.user.config(user?.id ?? 'unknown'), // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (old: Record<string, any> | undefined) => {
                        if (!old) { return old; }
                        return { ...old, gmailConnected: true };
                    });

                toast({
                    title: '¡Conexión Exitosa!',
                    description: 'Tu cuenta de Gmail ha sido vinculada.',
                    className: "bg-green-50 border-green-200 text-green-900"
                });
                queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user?.id) });
            } else if (event.data?.type === 'GMAIL_ERROR') {
                toast({
                    title: 'Error de Conexión',
                    description: event.data.error || 'No se pudo conectar con Gmail.',
                    variant: 'destructive'
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [user?.id, queryClient, toast]);

    useEffect(() => {
        if (!showHistoryDialog) {
            setSearchResults([]);
            setSelectedMessages([]);
            setSearchCache(null);
            setLastSearchDays(null);
            setImportResults([]);
            setImportStep('search');
            setApprovingMessageId(null);
            setReviewViewByMessageId({});
        }
    }, [showHistoryDialog]);

    const connectGmail = () => {
        if (isSyncing) { return; }
        if (!user?.id || !user?.email) {
            toast({
                title: 'Error',
                description: 'No hay sesión activa',
                variant: 'destructive'
            });
            return;
        }

        // Abrir OAuth flow en nueva ventana
        const authUrl = `${BACKEND_URL}/auth/google?userId=${user.id}&email=${encodeURIComponent(user.email)}`;
        window.open(authUrl, '_blank', 'width=600,height=700');


    };

    const disconnectGmail = async () => {
        if (isSyncing) { return; }
        if (!user?.id) { return; }

        try {
            const response = await fetch(`${BACKEND_URL}/api/user/config/gmail/disconnect`, {
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

            const response = await fetch(`${BACKEND_URL}/api/user/config/gemini`, {
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

            const response = await fetch(`${BACKEND_URL}/api/user/config/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) { throw new Error('Failed to save toggle'); }

            // Background revalidation
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });

        } catch {
            // Revert state on error (pessimistic rollback)
            toast({
                title: 'Error',
                description: 'No se pudo guardar el cambio',
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

            const response = await fetch(`${BACKEND_URL}/api/user/config/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) { throw new Error('Error guardando configuración de Telegram'); }

            toast({
                title: 'Telegram configurado',
                description: 'Credenciales guardadas correctamente'
            });

            setTelegramBotToken('');
            setTelegramChatId('');
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo guardar la configuración',
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
            const response = await fetch(`${BACKEND_URL}/api/user/config/telegram/test`, {
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
                className: "bg-green-50 border-green-200 text-green-900"
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error?.message || 'No se pudo enviar el mensaje de prueba',
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
            await fetch(`${BACKEND_URL}/api/gmail/unarchive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, messageIds })
            });
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
            await fetch(`${BACKEND_URL}/api/gmail/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, messageIds })
            });
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
            await fetch(`${BACKEND_URL}/api/gmail/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, messageIds })
            });
            updateCacheAndView(prev => prev.filter(item => !messageIds.includes(item.id)));
            setSelectedMessages(prev => prev.filter(id => !messageIds.includes(id)));
        } catch {
            toast({ title: 'Error', description: 'No se pudo eliminar la factura', variant: 'destructive' });
        }
    };

    const normalizeStatus = (status?: string) => (status === 'approved' ? 'archived' : status);
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

        // Ensure we filter archived items when searching for latest to find the next actionable one
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

    const updateImportGroup = (messageId: string, groupId: string, updates: Partial<GmailApprovalGroup>) => {
        setImportResults(prev => prev.map(result => {
            if (result.messageId !== messageId) { return result; }
            const groups = result.groups?.map(group => group.id === groupId ? { ...group, ...updates } : group);
            return { ...result, groups };
        }));
    };

    const updateImportProduct = (messageId: string, index: number, updates: Partial<GmailProduct>) => {
        setImportResults(prev => prev.map(result => {
            if (result.messageId !== messageId) { return result; }
            const products = result.products?.map((p, i) => i === index ? { ...p, ...updates } : p);
            return { ...result, products };
        }));
    };

    const handleApproveInvoice = async (messageId: string) => {
        const target = importResults.find(result => result.messageId === messageId);
        if (!target) { return; }

        // Determine source based on active view
        const activeView = getReviewView(messageId);
        const hasProducts = target.products && target.products.length > 0;
        const useProducts = activeView === 'products' && hasProducts;

        if (!useProducts && (!target.groups || target.groups.length === 0)) { return; }

        if (!user?.id) {
            toast({ title: 'Error', description: 'No hay sesión activa', variant: 'destructive' });
            return;
        }

        setApprovingMessageId(messageId);
        try {
            const categoryCache = new Map<string, string>();

            const ensureCategoryId = async (name: string) => {
                const normalized = name.toLowerCase().trim();
                if (!normalized) { return null; }
                if (categoryCache.has(normalized)) { return categoryCache.get(normalized)!; }

                const existing = categories.find(c => c.name.toLowerCase().trim() === normalized);
                if (existing) {
                    categoryCache.set(normalized, existing.id);
                    return existing.id;
                }

                const { data: newCategory, error } = await supabase
                    .from('categories')
                    .insert({
                        name: name.trim(),
                        type: 'expense',
                        user_id: user.id,
                        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
                    })
                    .select()
                    .single();

                if (error) { throw error; }
                if (newCategory?.id) {
                    categoryCache.set(normalized, newCategory.id);
                    return newCategory.id;
                }
                return null;
            };

            const pendingInvoices = [];

            if (useProducts) {
                // Generate from Products
                for (const product of target.products!) {
                    const amount = Number(product.total);
                    if (!amount || Number.isNaN(amount)) { continue; } // Skip invalid amounts

                    if (!product.payment_method_id) {
                        toast({ title: 'Error', description: 'Selecciona un método de pago para todos los productos', variant: 'destructive' });
                        return;
                    }

                    const categoryName = product.category?.trim() || '';
                    const categoryId = product.category_id || (categoryName ? await ensureCategoryId(categoryName) : null);

                    pendingInvoices.push({
                        user_id: user.id,
                        amount,
                        description: product.description,
                        category: categoryName || null,
                        category_id: categoryId,
                        type: 'expense',
                        payment_method_id: product.payment_method_id,
                        arrival_date: target.date || new Date().toISOString(),
                        status: 'pending',
                        source: 'gmail',
                        source_id: messageId // Track origin
                    });
                }
            } else {
                // Generate from Groups
                for (const group of target.groups!) {
                    const amount = Number(group.amount);
                    if (!amount || Number.isNaN(amount)) {
                        toast({ title: 'Error', description: 'Hay montos inválidos en la factura', variant: 'destructive' });
                        return;
                    }
                    if (!group.payment_method_id) {
                        toast({ title: 'Error', description: 'Selecciona un método de pago', variant: 'destructive' });
                        return;
                    }

                    const categoryName = group.category?.trim() || '';
                    const categoryId = group.category_id || (categoryName ? await ensureCategoryId(categoryName) : null);

                    pendingInvoices.push({
                        user_id: user.id,
                        amount,
                        description: group.description,
                        category: categoryName || null,
                        category_id: categoryId,
                        type: 'expense',
                        payment_method_id: group.payment_method_id,
                        arrival_date: group.arrival_date,
                        status: 'pending',
                        source: 'gmail',
                        source_id: messageId
                    });
                }
            }

            if (pendingInvoices.length === 0) {
                toast({ title: 'Error', description: 'No hay items válidos para importar', variant: 'destructive' });
                return;
            }

            // Insert into pending_invoices
            const { error: insertError } = await supabase
                .from('pending_invoices')
                .insert(pendingInvoices);

            if (insertError) { throw insertError; }

            // Clean up old pending invoices if this was a re-import of an existing UUID (logic from original code preserved/adapted if needed, 
            // but here we are creating NEW pending invoices. If logic existed to clear old ones, it might be safer to keep it or just rely on manual review).
            // For now, simple insert is safer as we are moving to "Pending" panel.

            // Auto-archive message in Gmail
            await archiveMessages([messageId]);

            toast({ title: 'Enviado a Pendientes', description: 'La factura ha sido enviada para revisión final.' });
            setImportResults(prev => prev.filter(result => result.messageId !== messageId));

            // Optionally refresh pending count if we had a hook for it
            refreshData();
        } catch (error: any) {
            console.error('[AdvancedSettings] Approval failed', error);
            toast({ title: 'Error', description: 'No se pudo procesar la factura', variant: 'destructive' });
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
    const lookupHistoryItem = (id: string) =>
        searchCache?.results.find(item => item.id === id) ||
        searchResults.find(item => item.id === id);
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
        const raw = value.toString().trim();
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
            normalized = raw.replace(/,/g, '.');
        }
        const parsed = Number.parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    };
    const resolveDateIso = (...candidates: Array<string | undefined | null>) => {
        for (const candidate of candidates) {
            const parsed = parseDateValue(candidate);
            if (parsed) { return parsed.toISOString(); }
        }
        return new Date().toISOString();
    };
    const safeFormatDate = (value?: string | null) => {
        const parsed = parseDateValue(value);
        return parsed ? format(parsed, 'dd MMM yyyy', { locale: es }) : 'N/A';
    };
    const resolveCategoryLabel = (category?: string | null, categoryId?: string | null) => {
        if (categoryId) {
            const match = categories.find(cat => cat.id === categoryId);
            if (match) { return match.name; }
        }
        return category || 'Otros';
    };
    const getReviewView = (messageId: string) =>
        reviewViewByMessageId[messageId] ?? 'products';
    const buildFallbackGroup = (messageId: string, meta?: GmailHistoryItem, index: number = 0): GmailApprovalGroup => ({
        id: `manual-${messageId}-${index}`,
        description: meta?.subject || meta?.snippet || 'Factura Gmail',
        category: 'Otros',
        amount: 0,
        arrival_date: resolveDateIso(meta?.date, meta?.internalDate),
        payment_method_id: paymentMethods[0]?.id ?? null,
    });
    const normalizeProducts = (products?: GmailProduct[]) => {
        if (!products || products.length === 0) { return []; }
        return products.map((product, index) => ({
            ...product,
            description: product.description || `Producto ${index + 1}`,
            quantity: parseNumberValue(product.quantity),
            price: parseNumberValue(product.price),
            total: parseNumberValue(product.total),
            totalExclTax: Number.isFinite(parseNumberValue(product.totalExclTax)) ? parseNumberValue(product.totalExclTax) : undefined,
            taxAmount: Number.isFinite(parseNumberValue(product.taxAmount)) ? parseNumberValue(product.taxAmount) : undefined,
            // Initialize payment method
            payment_method_id: paymentMethods.length > 0 ? paymentMethods[0].id : null,
        }));
    };
    const normalizeImportResults = (
        results: GmailImportResult[],
        selectedIds: string[],
        errorMessage?: string
    ) => {
        const normalized = results.map(result => {
            const meta = lookupHistoryItem(result.messageId);
            const hasGroups = Boolean(result.groups && result.groups.length > 0);
            const products = normalizeProducts(result.products);
            const groups = hasGroups
                ? result.groups!.map((group, index) => ({
                    ...group,
                    id: group.id || `manual-${result.messageId}-${index}`,
                    description: group.description || meta?.subject || meta?.snippet || 'Factura Gmail',
                    category: resolveCategoryLabel(group.category, group.category_id),
                    amount: Number.isFinite(Number(group.amount)) ? Number(group.amount) : 0,
                    arrival_date: resolveDateIso(group.arrival_date, meta?.date, meta?.internalDate),
                }))
                : (result.status === 'telegram' ? [] : [buildFallbackGroup(result.messageId, meta)]);

            return {
                ...result,
                date: result.date ?? meta?.date ?? meta?.internalDate,
                error: result.error,
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

    const cardContent = (
        <CardContent className="space-y-8 pt-6">
            {/* Gmail OAuth */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        Gmail
                    </Label>
                    {isSyncing ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sincronizando
                        </div>
                    ) : configStatus?.gmailConnected ? (
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowHistoryDialog(true)}
                                className="h-8 px-2 text-muted-foreground hover:text-primary gap-2"
                                title="Buscar en historial"
                            >
                                <History className="h-4 w-4" />
                                <span className="text-xs">Buscar facturas</span>
                            </Button>
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Conectado
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            No conectado
                        </div>
                    )}
                </div>
                <p className="text-base text-muted-foreground">
                    Conecta tu cuenta de Gmail para procesar facturas automáticamente
                </p>
                <div className="flex justify-end">
                    {configStatus?.gmailConnected ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={disconnectGmail}
                            disabled={isSyncing}
                            className="w-40 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            Desconectar
                        </Button>
                    ) : (
                        <Button size="sm" onClick={connectGmail} disabled={isSyncing} className="w-40">
                            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar Gmail'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="border-t" />

            {/* Gemini API Key */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-2">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        Gemini AI (Opcional)
                    </Label>
                    {isSyncing ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sincronizando
                        </div>
                    ) : configStatus?.geminiConfigured ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Configurado
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            No configurado
                        </div>
                    )}
                </div>
                <p className="text-base text-muted-foreground">
                    Agrega tu API Key de Google Gemini para categorización inteligente.
                </p>
                <div className="space-y-2">
                    <div className="space-y-1">
                        <Label htmlFor="gemini-key" className="text-xs text-muted-foreground">API Key</Label>
                        <div className="flex gap-3">
                            <Input
                                id="gemini-key"
                                type="password"
                                placeholder={configStatus?.geminiConfigured ? "••••••••••••••••••••••••" : "AIzaSy..."}
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSaveGeminiClick}
                                disabled={savingGemini || !geminiKey.trim() || isSyncing}
                                size="sm"
                                className="w-40"
                            >
                                {savingGemini ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Guardar Key'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Obtén tu API Key en{' '}
                    <a
                        href="https://makersuite.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Google AI Studio
                    </a>
                </p>
            </div>

            <div className="border-t" />

            {/* Telegram (Opcional) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-2">
                        <Send className="h-5 w-5 text-muted-foreground" />
                        Telegram (Opcional)
                    </Label>
                    {isSyncing ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sincronizando
                        </div>
                    ) : configStatus?.telegramVerified ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Verificado
                        </div>
                    ) : configStatus?.telegramConfigured ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Configurado (sin prueba)
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            No configurado
                        </div>
                    )}
                </div>
                <p className="text-base text-muted-foreground">
                    Configura para validar manualmente facturas que el sistema no pudo clasificar.
                </p>

                <div className="space-y-4">
                    <div className="space-y-4 rounded-lg border p-4 bg-card/50">
                        <h4 className="font-medium text-sm">Credenciales del Bot</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="telegram-bot-token" className="text-xs text-muted-foreground">
                                    Bot Token
                                </Label>
                                <Input
                                    id="telegram-bot-token"
                                    type="password"
                                    placeholder={configStatus?.telegramConfigured ? "Guardado (oculto)" : "Ej: 123456:ABC-DEF..."}
                                    value={telegramBotToken}
                                    onChange={(e) => setTelegramBotToken(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telegram-chat-id" className="text-xs text-muted-foreground">
                                    Chat ID
                                </Label>
                                <Input
                                    id="telegram-chat-id"
                                    type="text"
                                    placeholder={configStatus?.telegramConfigured ? "Guardado (oculto)" : "Ej: 987654321"}
                                    value={telegramChatId}
                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                    pattern="[0-9]*"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-4 bg-card/50">
                        <h4 className="font-medium text-sm">Reglas de Notificación</h4>
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex flex-1 items-start justify-between space-x-2">
                                <Label htmlFor="notify-rules" className="flex flex-col space-y-1 cursor-pointer">
                                    <span>Revisar Excepciones (Reglas)</span>
                                    <span className="font-normal text-xs text-muted-foreground">
                                        Notificar si las reglas fallan (Categoría: "Otros"). Solo si NO usas AI.
                                    </span>
                                </Label>
                                <Switch
                                    id="notify-rules"
                                    checked={notifyRulesExceptions}
                                    onCheckedChange={(checked) => handleToggleChange('rules', checked)}
                                    disabled={isSyncing}
                                />
                            </div>
                            <div className="flex flex-1 items-start justify-between space-x-2">
                                <Label htmlFor="notify-ai" className="flex flex-col space-y-1 cursor-pointer">
                                    <span>Revisar Excepciones (IA)</span>
                                    <span className="font-normal text-xs text-muted-foreground">
                                        Notificar si el Agente IA falla o es incierto.
                                    </span>
                                </Label>
                                <Switch
                                    id="notify-ai"
                                    checked={notifyAiExceptions}
                                    onCheckedChange={(checked) => handleToggleChange('ai', checked)}
                                    disabled={isSyncing}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2 gap-2">
                    <Button
                        variant="outline"
                        onClick={handleTestTelegramClick}
                        disabled={testingTelegram || isSyncing || !configStatus?.telegramConfigured}
                        size="sm"
                        className="w-40"
                        title={!configStatus?.telegramConfigured ? 'Primero guarda las credenciales' : 'Enviar mensaje de prueba'}
                    >
                        {testingTelegram ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Probar Telegram'
                        )}
                    </Button>
                    <Button
                        onClick={handleSaveTelegramClick}
                        disabled={
                            savingTelegram ||
                            isSyncing ||
                            (!telegramBotToken.trim() || !telegramChatId.trim())
                        }
                        size="sm"
                        className="w-40"
                    >
                        {savingTelegram ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Guardar Credenciales'
                        )}
                    </Button>
                </div>
            </div>
        </CardContent>
    );

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden transition-all duration-300">
            <Collapsible open={isOpen} onOpenChange={onOpenChange}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-4">
                        <div className="flex items-center justify-between w-full">
                            <div className="space-y-1 text-left">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                                    <Settings2 className="h-5 w-5 text-primary" />
                                    Configuraciones Avanzadas
                                </CardTitle>
                                <CardDescription className="text-base">
                                    Configura integraciones opcionales para procesamiento automático de facturas
                                </CardDescription>
                                {isSyncing && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Sincronizando estado...
                                    </div>
                                )}
                            </div>
                            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
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

            <AlertDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <AlertDialogContent className="max-w-4xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4"
                        onClick={() => setShowHistoryDialog(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            {isReviewing ? 'Revisión de Facturas' : 'Buscar Historial de Facturas'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isReviewing
                                ? 'Revisa la información detectada y aprueba cada factura.'
                                : 'Busca facturas pasadas en tu Gmail para importarlas. Selecciona el rango de tiempo.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className={cn(!isReviewing && "hidden", "flex flex-col flex-1 min-h-0")}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-semibold">Revisión de Facturas</p>
                                <p className="text-xs text-muted-foreground">Edita y aprueba cada factura antes de registrarla.</p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 min-h-0 border rounded-md p-4">
                            {reviewItems.length > 0 ? (
                                <div className="space-y-4">
                                    {reviewItems.map(item => {
                                        const meta = item.meta as GmailHistoryItem | undefined;
                                        const isTelegram = item.status === 'telegram';
                                        const hasGroups = Boolean(item.groups && item.groups.length > 0);
                                        const statusLabel = isTelegram
                                            ? 'Enviado a Telegram'
                                            : item.status === 'pending'
                                                ? 'Pendiente aprobación'
                                                : item.status === 'duplicate'
                                                    ? 'Duplicada'
                                                    : 'Error';
                                        const total = item.groups?.reduce((sum, g) => sum + parseNumberValue(g.amount), 0) ?? 0;
                                        const hasProducts = Boolean(item.products && item.products.length > 0);
                                        const productsTotal = item.products?.reduce((sum, product) => sum + parseNumberValue(product.total), 0) ?? 0;
                                        const reviewView = getReviewView(item.messageId);

                                        return (
                                            <div key={item.messageId} className="rounded-lg border p-4 space-y-3 bg-card/50">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate">{meta?.subject || item.store || 'Factura'}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{meta?.from || item.store || 'Remitente desconocido'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                                                            {safeFormatDate(item.date || meta?.date || meta?.internalDate)}
                                                        </Badge>
                                                        <Badge variant={isTelegram ? 'secondary' : 'outline'} className="text-[10px] whitespace-nowrap">
                                                            {statusLabel}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {item.status === 'error' && item.error && (
                                                    <div className="text-xs text-destructive">
                                                        {item.error}
                                                    </div>
                                                )}

                                                {isTelegram && !hasGroups ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        Enviado a Telegram para revisión manual. No se creó pendiente en la app.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {isTelegram && (
                                                            <div className="text-xs text-muted-foreground">
                                                                También se envió a Telegram para revisión manual.
                                                            </div>
                                                        )}
                                                        {hasProducts && reviewView === 'products' ? (
                                                            <div className="rounded-md border bg-muted/30">
                                                                <div className="flex items-center justify-between px-3 py-2 border-b">
                                                                    <span className="text-xs font-semibold">Productos detectados</span>
                                                                    <span className="text-[11px] text-muted-foreground">
                                                                        Total (IVA incl.): ${productsTotal.toLocaleString('es-CO')}
                                                                    </span>
                                                                </div>
                                                                <div className="max-h-60 overflow-auto">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Producto</TableHead>
                                                                                <TableHead className="w-[180px]">Categoría</TableHead>
                                                                                <TableHead className="w-[180px]">Método</TableHead>
                                                                                <TableHead className="w-[120px] text-right">Valor (IVA incl.)</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {item.products?.map((product, idx) => {
                                                                                const resolvedCategory = resolveCategoryLabel(product.category, product.category_id);
                                                                                const categoryExists = categories.some(cat => cat.name === resolvedCategory);

                                                                                return (
                                                                                    <TableRow key={`${item.messageId}-product-${idx}`}>
                                                                                        <TableCell className="text-xs">
                                                                                            {product.description}
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Select
                                                                                                value={resolvedCategory || undefined}
                                                                                                onValueChange={(value) => {
                                                                                                    const match = categories.find(cat => cat.name === value);
                                                                                                    updateImportProduct(item.messageId, idx, {
                                                                                                        category: value,
                                                                                                        category_id: match?.id ?? null
                                                                                                    });
                                                                                                }}
                                                                                            >
                                                                                                <SelectTrigger className="h-7 text-xs">
                                                                                                    <SelectValue placeholder="Categoría" />
                                                                                                </SelectTrigger>
                                                                                                <SelectContent>
                                                                                                    {!categoryExists && resolvedCategory && (
                                                                                                        <SelectItem value={resolvedCategory}>{resolvedCategory}</SelectItem>
                                                                                                    )}
                                                                                                    {categories.map(cat => (
                                                                                                        <SelectItem key={cat.id} value={cat.name}>
                                                                                                            {cat.name}
                                                                                                        </SelectItem>
                                                                                                    ))}
                                                                                                </SelectContent>
                                                                                            </Select>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Select
                                                                                                value={product.payment_method_id || undefined}
                                                                                                onValueChange={(value) => updateImportProduct(item.messageId, idx, { payment_method_id: value })}
                                                                                            >
                                                                                                <SelectTrigger className="h-7 text-xs">
                                                                                                    <SelectValue placeholder="Método" />
                                                                                                </SelectTrigger>
                                                                                                <SelectContent>
                                                                                                    {paymentMethods.map(method => (
                                                                                                        <SelectItem key={method.id} value={method.id}>
                                                                                                            {method.name}
                                                                                                        </SelectItem>
                                                                                                    ))}
                                                                                                </SelectContent>
                                                                                            </Select>
                                                                                        </TableCell>
                                                                                        <TableCell className="text-xs text-right font-medium">
                                                                                            ${Number(product.total || 0).toLocaleString('es-CO')}
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                )
                                                                            })}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                                <div className="flex items-center justify-end px-3 py-2 border-t">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        onClick={() => setReviewViewByMessageId(prev => ({
                                                                            ...prev,
                                                                            [item.messageId]: 'groups'
                                                                        }))}
                                                                        disabled={!hasGroups}
                                                                    >
                                                                        Ir a agrupación
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : hasProducts ? null : (
                                                            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-3">
                                                                <span>No se detectaron productos en el XML de esta factura.</span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => setReviewViewByMessageId(prev => ({
                                                                        ...prev,
                                                                        [item.messageId]: 'groups'
                                                                    }))}
                                                                    disabled={!hasGroups}
                                                                >
                                                                    Ir a agrupación
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {hasGroups && reviewView === 'groups' ? (
                                                            <>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead className="w-[110px]">Fecha</TableHead>
                                                                            <TableHead>Descripción</TableHead>
                                                                            <TableHead className="w-[200px]">Categoría</TableHead>
                                                                            <TableHead className="w-[120px] text-right">Valor</TableHead>
                                                                            <TableHead className="w-[180px]">Método</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {item.groups?.map(group => {
                                                                            const resolvedCategory = resolveCategoryLabel(group.category, group.category_id);
                                                                            const categoryExists = categories.some(cat => cat.name === resolvedCategory);
                                                                            return (
                                                                                <TableRow key={group.id}>
                                                                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                        {safeFormatDate(group.arrival_date)}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Input
                                                                                            value={group.description}
                                                                                            onChange={(e) => updateImportGroup(item.messageId, group.id, { description: e.target.value })}
                                                                                            className="h-8"
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Select
                                                                                            value={resolvedCategory || undefined}
                                                                                            onValueChange={(value) => {
                                                                                                const match = categories.find(cat => cat.name === value);
                                                                                                updateImportGroup(item.messageId, group.id, {
                                                                                                    category: value,
                                                                                                    category_id: match?.id ?? null
                                                                                                });
                                                                                            }}
                                                                                        >
                                                                                            <SelectTrigger className="h-8">
                                                                                                <SelectValue placeholder="Categoría" />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                {!categoryExists && resolvedCategory && (
                                                                                                    <SelectItem value={resolvedCategory}>{resolvedCategory}</SelectItem>
                                                                                                )}
                                                                                                {categories.map(cat => (
                                                                                                    <SelectItem key={cat.id} value={cat.name}>
                                                                                                        {cat.name}
                                                                                                    </SelectItem>
                                                                                                ))}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        <Input
                                                                                            type="number"
                                                                                            value={group.amount}
                                                                                            onChange={(e) => updateImportGroup(item.messageId, group.id, { amount: Number(e.target.value) })}
                                                                                            className="h-8 text-right"
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Select
                                                                                            value={group.payment_method_id || undefined}
                                                                                            onValueChange={(value) => updateImportGroup(item.messageId, group.id, { payment_method_id: value })}
                                                                                        >
                                                                                            <SelectTrigger className="h-8">
                                                                                                <SelectValue placeholder="Método" />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                {paymentMethods.map(method => (
                                                                                                    <SelectItem key={method.id} value={method.id}>
                                                                                                        {method.name}
                                                                                                    </SelectItem>
                                                                                                ))}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                                <div className="flex items-center justify-between">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => setReviewViewByMessageId(prev => ({
                                                                            ...prev,
                                                                            [item.messageId]: 'products'
                                                                        }))}
                                                                    >
                                                                        Volver a productos
                                                                    </Button>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-sm text-muted-foreground">Total: ${total.toLocaleString('es-CO')}</span>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleApproveInvoice(item.messageId)}
                                                                            disabled={approvingMessageId === item.messageId || paymentMethods.length === 0}
                                                                        >
                                                                            {approvingMessageId === item.messageId ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                'Enviar a Pendientes'
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : hasGroups ? null : (
                                                            <div className="text-xs text-muted-foreground">
                                                                No se pudo generar el detalle de esta factura.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                                    <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                                    <p className="text-sm">No hay facturas pendientes por aprobar.</p>
                                </div>
                            )}
                        </ScrollArea>


                    </div>

                    <div className={cn(isReviewing && "hidden", "flex flex-col flex-1 min-h-0")}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 mb-4">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Rango de tiempo</Label>
                                <Select value={searchRange} onValueChange={setSearchRange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona rango" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="latest">Último registro</SelectItem>
                                        <SelectItem value="15">Últimos 15 días</SelectItem>
                                        <SelectItem value="30">Último mes</SelectItem>
                                        <SelectItem value="180">Último semestre</SelectItem>
                                        <SelectItem value="365">Último año</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2 pb-1">
                                <Label className="text-xs text-muted-foreground">Ocultar archivadas</Label>
                                <Switch checked={hideApproved} onCheckedChange={setHideApproved} />
                            </div>
                            <Button
                                onClick={async () => {
                                    if (!user?.id) { return; }
                                    const isLatestRange = searchRange === 'latest';
                                    const requestedDays = isLatestRange ? 60 : Number(searchRange);
                                    setSearching(true);
                                    try {
                                        if (searchCache && requestedDays <= searchCache.days) {
                                            const sortedResults = getFilteredSearchResults(searchCache.results, requestedDays, isLatestRange);
                                            applySearchResults(sortedResults, requestedDays);
                                            const foundCount = sortedResults.length;
                                            toast({
                                                title: 'Búsqueda completada',
                                                description: isLatestRange
                                                    ? (foundCount > 0 ? 'Se encontró el registro más reciente.' : 'No se encontraron registros en el historial.')
                                                    : `Se encontraron ${foundCount} posibles facturas.`
                                            });
                                            return;
                                        }

                                        const isLatest = searchRange === 'latest';
                                        const daysToSearch = isLatest ? '60' : searchRange;
                                        const res = await fetch(`${BACKEND_URL}/api/gmail/search?userId=${user?.id}&days=${daysToSearch}&markRead=1`);
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            const message = data?.error || data?.details || 'No se pudo buscar en el historial';
                                            throw new Error(message);
                                        }
                                        let rawResults = (data.results || []) as GmailHistoryItem[];

                                        setSearchCache({ days: requestedDays, results: (data.results || []) });
                                        const finalResults = getFilteredSearchResults(data.results || [], requestedDays, isLatestRange);
                                        applySearchResults(finalResults, requestedDays);

                                        toast({
                                            title: 'Búsqueda completada',
                                            description: isLatestRange
                                                ? (finalResults.length > 0 ? 'Se encontró el registro más reciente.' : 'No se encontraron registros en los últimos 60 días.')
                                                : `Se encontraron ${data.count || finalResults.length} posibles facturas.`
                                        });
                                    } catch (err: any) {
                                        const message = err?.message || 'No se pudo buscar en el historial';
                                        toast({ title: 'Error', description: message, variant: 'destructive' });
                                    } finally {
                                        setSearching(false);
                                    }
                                }}
                                disabled={searching}
                            >
                                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                                Buscar
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 min-h-0 border rounded-md p-4">
                            {visibleResults.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b">
                                        <span className="text-sm font-medium">{visibleResults.length} Resultados</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs px-2"
                                            onClick={() => {
                                                if (selectedMessages.length === selectableResults.length) { setSelectedMessages([]); }
                                                else { setSelectedMessages(selectableResults.map(r => r.id)); }
                                            }}
                                        >
                                            {selectedMessages.length === selectableResults.length ? 'Desmarcar todos' : 'Marcar todos'}
                                        </Button>
                                    </div>
                                    {visibleResults.map((res) => {
                                        const normalizedStatus = normalizeStatus(res.status);
                                        const isArchived = normalizedStatus === 'archived';
                                        const statusLabel = isArchived ? 'Archivada' : normalizedStatus === 'read' ? 'Leída' : 'Nueva';
                                        return (
                                            <div
                                                key={res.id}
                                                className={cn(
                                                    "flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card",
                                                    isArchived && "opacity-60 text-muted-foreground"
                                                )}
                                            >
                                                <Checkbox
                                                    id={res.id}
                                                    checked={selectedMessages.includes(res.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (isArchived) { return; }
                                                        if (checked) { setSelectedMessages(prev => [...prev, res.id]); }
                                                        else { setSelectedMessages(prev => prev.filter(id => id !== res.id)); }
                                                    }}
                                                    disabled={isArchived}
                                                />
                                                <div className="flex-1 space-y-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor={res.id} className="font-semibold text-sm truncate cursor-pointer block">
                                                            {res.subject}
                                                        </Label>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                                                                {res.date ? format(new Date(res.date), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                                                            </Badge>
                                                            <Badge
                                                                variant={isArchived ? 'secondary' : 'outline'}
                                                                className={cn(
                                                                    "text-[10px] whitespace-nowrap",
                                                                    isArchived && "bg-muted/70 text-muted-foreground"
                                                                )}
                                                            >
                                                                {statusLabel}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{res.from}</p>
                                                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic">"{res.snippet}"</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isArchived ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => unarchiveMessages([res.id])}
                                                            title="Desarchivar"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => archiveMessages([res.id])}
                                                            title="Archivar"
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => deleteMessages([res.id])}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                                    <Search className="h-10 w-10 mb-2 opacity-20" />
                                    <p className="text-sm">
                                        {hasOnlyArchivedHidden
                                            ? 'Todas las facturas ya están registradas.'
                                            : 'Inicia una búsqueda para ver resultados'}
                                    </p>
                                </div>
                            )}
                        </ScrollArea>

                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel onClick={() => {
                                setShowHistoryDialog(false);
                                setSearchResults([]);
                                setSelectedMessages([]);
                                setSearchCache(null);
                                setLastSearchDays(null);
                            }}>
                                Cancelar
                            </AlertDialogCancel>
                            <Button
                                disabled={selectedMessages.length === 0 || importing}
                                onClick={async () => {
                                    const selectedSnapshot = [...selectedMessages];
                                    setImporting(true);
                                    try {
                                        const res = await fetch(`${BACKEND_URL}/api/gmail/import-batch`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId: user?.id, messageIds: selectedMessages })
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            throw new Error(data?.error || data?.details || 'No se pudo completar la importación');
                                        }
                                        const results = (data.results || []) as GmailImportResult[];
                                        const normalizedResults = normalizeImportResults(results, selectedSnapshot);
                                        toast({
                                            title: 'Importación finalizada',
                                            description: `Procesadas: ${data.processed ?? results.length}, Duplicadas: ${data.skipped ?? 0}, Errores: ${data.errors ?? 0}`
                                        });
                                        setImportResults(normalizedResults);
                                        setImportStep('review');
                                        setSelectedMessages([]);
                                        updateCacheAndView(prev => prev.map(item => (
                                            selectedSnapshot.includes(item.id) ? { ...item, status: 'archived' } : item
                                        )));
                                        queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user?.id) });
                                    } catch (error: any) {
                                        const message = error?.message || 'No se pudo completar la importación';
                                        const fallbackResults = normalizeImportResults([], selectedSnapshot, message);
                                        if (fallbackResults.length > 0) {
                                            setImportResults(fallbackResults);
                                            setImportStep('review');
                                            setSelectedMessages([]);
                                        }
                                        toast({ title: 'Error', description: message, variant: 'destructive' });
                                    } finally {
                                        setImporting(false);
                                    }
                                }}
                            >
                                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                                Importar Seleccionadas ({selectedMessages.length})
                            </Button>
                        </AlertDialogFooter>
                    </div>
                </AlertDialogContent>
            </AlertDialog >
        </Card>
    );
}
