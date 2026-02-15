/**
 * useFinanceUI Hook
 * 
 * Manages all UI-related state for the finance feature.
 * Includes pagination, filters, onboarding, and import progress.
 */

import { useState, useEffect } from 'react';
import type { Transaction } from '../types/financeTypes';

export function useFinanceUI() {
    // Pagination state
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Filter state
    const [dateFilter, setDateFilter] = useState<{
        from: string | null;
        to: string | null;
        period: string;
    }>({
        from: null,
        to: null,
        period: 'all'
    });

    // Sort state
    const [sortConfig, setSortConfig] = useState<{
        column: 'date' | 'amount';
        ascending: boolean;
    }>({ column: 'date', ascending: false });

    // Onboarding state
    const [onboardingDecision, setOnboardingDecision] = useState<'pending' | 'from_scratch' | 'imported' | null>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('onboarding_decision');
            return (stored === 'pending' || stored === 'from_scratch' || stored === 'imported') ? stored : null;
        }
        return null;
    });
    const [hasPendingImport, setHasPendingImport] = useState(false);

    const [welcomeCompleted, setWelcomeCompleted] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('welcome_completed') === 'true';
        }
        return false;
    });

    const [highlightedCard, setHighlightedCard] = useState<'categories' | 'payment-methods' | null>(null);

    // Sync state to localStorage
    useEffect(() => {
        if (welcomeCompleted) {
            localStorage.setItem('welcome_completed', 'true');
        } else {
            // Optional: remove if falsy, but careful with initial load which might be false before profile loads.
            // Actually, if it starts false, we want it false. If starts true from storage, it stays true.
            // If profile says true, it stays true.
            // If profile says false (new user), we might want to clear it?
            // But usually it goes false -> true.
            // Let's stick to setting it true.
            localStorage.removeItem('welcome_completed');
        }
    }, [welcomeCompleted]);

    useEffect(() => {
        if (onboardingDecision) {
            localStorage.setItem('onboarding_decision', onboardingDecision);
        } else {
            localStorage.removeItem('onboarding_decision');
        }
    }, [onboardingDecision]);

    // Import/Export state
    const [importProgress, setImportProgress] = useState<{
        status: 'idle' | 'loading' | 'completed' | 'failed' | 'cancelled';
        progress: number;
        message: string;
        recordsProcessed?: number;
        error?: string;
    }>({
        status: 'idle',
        progress: 0,
        message: '',
    });

    const [pendingImportData, setPendingImportData] = useState<Omit<Transaction, 'id'>[]>([]);

    // Loading states
    const [manualLoading, setManualLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Last updated timestamp
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const startImport = () => {
        setImportProgress({
            status: 'loading',
            progress: 0,
            message: 'Analizando archivo...'
        });
    };

    const cancelImport = () => {
        setImportProgress({ status: 'idle', progress: 0, message: '' });
        setPendingImportData([]);
        setHasPendingImport(false);
    };

    const updateFilter = (period: string, from?: string | null, to?: string | null) => {
        setPage(0);
        if (period === 'custom' && from && to) {
            setDateFilter({ from, to, period });
        } else {
            const now = new Date();
            let fromDate: Date | null = null;
            let toDate: Date | null = new Date();

            switch (period) {
                case 'week': {
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                    fromDate = new Date(now.setDate(diff));
                    break;
                }
                case 'month':
                    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'year':
                    fromDate = new Date(now.getFullYear(), 0, 1);
                    toDate = new Date(now.getFullYear(), 11, 31);
                    break;
                case 'all':
                    fromDate = null;
                    toDate = null;
                    break;
            }

            setDateFilter({
                from: fromDate ? fromDate.toISOString().split('T')[0] : null,
                to: toDate ? toDate.toISOString().split('T')[0] : null,
                period
            });
        }
    };

    return {
        // Pagination
        page,
        setPage,
        hasMore,
        setHasMore,

        // Filters
        dateFilter,
        setDateFilter,
        sortConfig,
        setSortConfig,

        // Onboarding
        onboardingDecision,
        setOnboardingDecision,
        hasPendingImport,
        setHasPendingImport,
        welcomeCompleted,
        setWelcomeCompleted,
        highlightedCard,
        setHighlightedCard,

        // Import/Export
        importProgress,
        setImportProgress,
        pendingImportData,
        setPendingImportData,
        startImport,
        cancelImport,

        // Loading
        manualLoading,
        setManualLoading,
        actionLoading,
        setActionLoading,
        loading: manualLoading, // Alias for backward compatibility
        setLoading: setManualLoading, // Alias for backward compatibility

        // Metadata
        lastUpdated,
        setLastUpdated,
        updateFilter,
    };
}
