import React from 'react';
import { cn } from '@/core/utils';

interface SkeletonLoaderProps {
    loading?: boolean;
    tab?: 'dashboard' | 'transactions' | 'config' | 'savings' | 'loans' | 'budgets' | 'default' | 'cashflow' | 'auth' | 'onboarding';
    message?: string;
    rows?: number;
    fullPage?: boolean;
    withLayoutWrapper?: boolean; // New prop: Is this skeleton rendered INSIDE the Sidebar layout?
    showLoadingIndicator?: boolean;
}

const NEUTRAL_SKELETON_FILL = 'rgba(100, 116, 139, 0.12)';
const NEUTRAL_SKELETON_BORDER = '1px solid rgba(148, 163, 184, 0.24)';

// ---------------------------------------------------------------------
// Modular Base Skeletons (High Fidelity)
// ---------------------------------------------------------------------

export const PulseBlock: React.FC<{
    width?: string | number;
    height?: string | number;
    className?: string;
    borderRadius?: string;
    isPrimary?: boolean;
}> = ({ width = '100%', height = '1rem', className = '', borderRadius = '0.5rem', isPrimary = false }) => (
    <div
        className={cn('skeleton-pulse', className)}
        style={{
            width,
            height,
            borderRadius,
            backgroundColor: NEUTRAL_SKELETON_FILL,
            border: NEUTRAL_SKELETON_BORDER,
            transition: 'opacity 0.2s ease',
        }}
    />
);

export const CardSkeleton: React.FC<{
    className?: string;
    height?: string;
    width?: string;
    maxWidth?: string;
    children?: React.ReactNode;
    padding?: string;
    style?: React.CSSProperties;
}> = ({ className, height, width, maxWidth, children, padding = '1.5rem', style }) => (
    <div
        className={cn("rounded-xl shadow-sm bg-card", className)}
        style={{
            border: '1px solid hsl(var(--border, 214 32% 91%))',
            height,
            width,
            maxWidth,
            padding,
            transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
            ...style
        }}
    >
        {children}
    </div>
);

const StatCardSkeleton = () => (
    <CardSkeleton className="relative flex flex-col justify-between" height="120px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <PulseBlock height="0.65rem" width="40%" />
                <PulseBlock height="1.5rem" width="70%" />
                <PulseBlock height="0.5rem" width="30%" />
            </div>
            <div style={{ flexShrink: 0, marginLeft: '1rem' }}>
                <PulseBlock height="1.25rem" width="1.25rem" borderRadius="9999px" />
            </div>
        </div>
    </CardSkeleton>
);

export const PageHeaderSkeleton = () => (
    <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10 w-full mb-8">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                <div className="flex flex-col">
                    <PulseBlock height="1.75rem" width="150px" className="leading-none" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <PulseBlock height="2.25rem" width="120px" />
                <PulseBlock height="2.25rem" width="120px" />
                <PulseBlock height="2.25rem" width="40px" />
            </div>
        </div>
    </div>
);

export const SidebarSkeleton = () => (
    <div
        className="hidden lg:flex flex-col w-64 border-r h-screen p-6 sticky top-0 flex-shrink-0"
        style={{
            backgroundColor: 'hsl(var(--container, 210 40% 98%))',
            borderRight: '1px solid hsl(var(--border, 214 32% 91%))',
            boxShadow: '1px 0 0 hsl(var(--border, 214 32% 91%))',
        }}
    >
        <div className="flex items-center gap-3 mb-10 px-2 flex-shrink-0">
            <PulseBlock height="2.5rem" width="2.5rem" borderRadius="0.75rem" />
            <div className="flex flex-col gap-1.5">
                <PulseBlock height="1.25rem" width="100px" />
                <PulseBlock height="0.65rem" width="80px" />
            </div>
        </div>

        <nav className="space-y-3 flex-1 overflow-hidden">
            {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <PulseBlock height="1.25rem" width="1.25rem" />
                    <PulseBlock height="1rem" width="65%" />
                </div>
            ))}
        </nav>

        <div className="mt-auto pt-6 flex-shrink-0">
            <PulseBlock height="3rem" width="100%" borderRadius="0.75rem" />
        </div>
    </div>
);

export const MobileNavSkeleton = () => (
    <div
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t px-6 py-2 flex items-center justify-between z-50 bg-background/80 backdrop-blur-md"
    >
        {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
                <PulseBlock height="1.25rem" width="1.25rem" />
                <PulseBlock height="0.5rem" width="20px" />
            </div>
        ))}
    </div>
);

export const StandardHeaderSkeleton = () => (
    <div className="border-b border-border pb-8 w-full animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex items-start gap-4 w-full md:w-auto">
                <PulseBlock height="3rem" width="3rem" borderRadius="1rem" />
                <div className="flex flex-col gap-1.5">
                    <PulseBlock height="1.75rem" width="180px" className="leading-none" />
                    <PulseBlock height="0.85rem" width="260px" />
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto justify-start md:justify-end">
                <PulseBlock height="2.5rem" width="100px" />
                <PulseBlock height="2.5rem" width="100px" />
            </div>
        </div>
    </div>
);

// ---------------------------------------------------------------------
// Tab Layouts
// ---------------------------------------------------------------------

export const DashboardSkeleton = () => (
    <div className="space-y-8">
        <StandardHeaderSkeleton />

        {/* Mis Cuentas Section (Payment Methods) */}
        <div className="space-y-4">
            <PulseBlock height="1.5rem" width="150px" /> {/* Title */}
            <AccountsListSkeleton count={2} />
        </div>

        {/* Disponibilidad y Ahorro (4 Stats Cards) */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <PulseBlock height="1.5rem" width="220px" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
        </div>

        {/* Resumen del Mes (3 Stats Cards) */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <PulseBlock height="1.5rem" width="180px" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
        </div>

        {/* Charts Grid */}
        <div className="space-y-4">
            <PulseBlock height="1.5rem" width="200px" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CardSkeleton height="400px">
                        <div className="flex justify-between items-center mb-6">
                            <PulseBlock height="1.5rem" width="120px" />
                            <div className="flex gap-2">
                                <PulseBlock height="2rem" width="80px" />
                                <PulseBlock height="2rem" width="80px" />
                            </div>
                        </div>
                        <PulseBlock height="280px" width="100%" />
                    </CardSkeleton>
                </div>
                <CardSkeleton height="400px">
                    <PulseBlock height="1.5rem" width="150px" className="mb-8" />
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        <PulseBlock height="180px" width="180px" borderRadius="9999px" />
                        <div className="w-full space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <PulseBlock height="0.75rem" width="40%" />
                                    <PulseBlock height="0.75rem" width="20%" />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardSkeleton>
            </div>
        </div>
    </div>
);

export const HistorySkeleton = () => (
    <div className="space-y-8">
        <StandardHeaderSkeleton />
        {/* Status Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-border bg-muted/20">
            <div className="flex items-center gap-3">
                <PulseBlock height="1.5rem" width="1.5rem" borderRadius="9999px" />
                <PulseBlock height="1rem" width="260px" />
            </div>
            <PulseBlock height="2rem" width="100px" />
        </div>

        {/* Filters */}
        <div className="bg-card/30 p-4 rounded-xl border border-border/50 space-y-3">
            <div className="flex items-center gap-2 mb-3">
                <PulseBlock height="1.25rem" width="1.25rem" />
                <PulseBlock height="1.25rem" width="80px" />
            </div>

            {/* Row 1: Search + Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3">
                <PulseBlock height="2.5rem" width="100%" className="flex-1" /> {/* Search */}
                <div className="flex gap-2 w-full sm:w-auto">
                    <PulseBlock height="2.5rem" width="100px" />
                    <PulseBlock height="2.5rem" width="130px" />
                    <PulseBlock height="2.5rem" width="130px" />
                </div>
            </div>

            {/* Row 2: Dates + Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end items-center">
                <div className="flex gap-2 w-full sm:w-auto">
                    <PulseBlock height="2.5rem" width="100px" />
                    <PulseBlock height="2.5rem" width="100px" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <PulseBlock height="2.5rem" width="80px" />
                    <PulseBlock height="2.5rem" width="80px" />
                    <PulseBlock height="2.5rem" width="80px" />
                    <PulseBlock height="2.5rem" width="40px" />
                </div>
            </div>
        </div>

        {/* List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="bg-muted/30 p-4 border-b border-border">
                <div className="flex justify-between gap-4">
                    <PulseBlock height="0.75rem" width="120px" />
                    <PulseBlock height="0.75rem" width="80px" />
                </div>
            </div>
            {[...Array(8)].map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between border-b border-border last:border-0 hover:bg-muted/5">
                    <div className="flex items-center gap-4 flex-1">
                        <PulseBlock height="2.5rem" width="2.5rem" borderRadius="9999px" />
                        <div className="space-y-2 flex-1 max-w-[200px]">
                            <PulseBlock height="0.9rem" width="90%" />
                            <PulseBlock height="0.65rem" width="60%" />
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <PulseBlock height="1rem" width="100px" className="ml-auto" />
                        <PulseBlock height="0.65rem" width="60px" className="ml-auto" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const BudgetsSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <StandardHeaderSkeleton />

        {/* Top Cards: Total + Income */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <CardSkeleton height="auto" padding="1.5rem">
                <PulseBlock height="1rem" width="120px" className="mb-4" />
                <PulseBlock height="2.5rem" width="60%" className="mb-4" />
                <PulseBlock height="0.5rem" width="100%" borderRadius="9999px" />
            </CardSkeleton>
            <CardSkeleton height="auto" padding="1.5rem">
                <PulseBlock height="1rem" width="120px" className="mb-4" />
                <PulseBlock height="2.5rem" width="60%" className="mb-4" />
                <PulseBlock height="0.5rem" width="100%" borderRadius="9999px" />
            </CardSkeleton>
        </div>

        <PulseBlock height="1px" width="100%" className="opacity-40" />

        {/* Budgets by Category Grid */}
        <div>
            <div className="flex justify-between items-center mb-6">
                <PulseBlock height="1.5rem" width="250px" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <CardSkeleton key={i} height="auto" padding="1.5rem">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <PulseBlock height="2.5rem" width="2.5rem" borderRadius="0.5rem" />
                                <div className="space-y-1">
                                    <PulseBlock height="1rem" width="100px" />
                                    <PulseBlock height="0.75rem" width="60px" />
                                </div>
                            </div>
                            <PulseBlock height="1.5rem" width="1.5rem" borderRadius="9999px" />
                        </div>
                        <PulseBlock height="0.5rem" width="100%" borderRadius="9999px" className="mb-3" />
                        <div className="flex justify-between">
                            <PulseBlock height="0.75rem" width="30%" />
                            <PulseBlock height="0.75rem" width="30%" />
                        </div>
                    </CardSkeleton>
                ))}
            </div>
        </div>

        <PulseBlock height="1px" width="100%" className="opacity-40" />

        {/* Future Expenses Skeleton */}
        <div>
            <PulseBlock height="1.5rem" width="250px" className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <CardSkeleton key={i} height="120px" padding="1rem" />)}
            </div>
        </div>
    </div>
);

export const LoansSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <StandardHeaderSkeleton />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CardSkeleton height="120px" padding="1.5rem" className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                    <PulseBlock height="1rem" width="1rem" borderRadius="9999px" />
                    <PulseBlock height="0.85rem" width="120px" />
                </div>
                <PulseBlock height="2rem" width="160px" />
                <PulseBlock height="0.65rem" width="140px" className="mt-2" />
            </CardSkeleton>
            <CardSkeleton height="120px" padding="1.5rem" className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                    <PulseBlock height="1rem" width="1rem" borderRadius="9999px" />
                    <PulseBlock height="0.85rem" width="120px" />
                </div>
                <PulseBlock height="2rem" width="160px" />
                <PulseBlock height="0.65rem" width="140px" className="mt-2" />
            </CardSkeleton>
        </div>

        {/* List of Loans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PulseBlock height="1.5rem" width="280px" className="mb-2" />
            {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} padding="1.5rem" className="border-l-4 border-l-border">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <PulseBlock height="1.25rem" width="150px" />
                                <PulseBlock height="1rem" width="80px" borderRadius="1rem" />
                            </div>
                            <div className="flex gap-3">
                                <PulseBlock height="0.8rem" width="100px" />
                                <PulseBlock height="0.8rem" width="80px" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                            <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                        </div>
                    </div>
                    <PulseBlock height="0.5rem" width="100%" borderRadius="9999px" />
                </CardSkeleton>
            ))}
        </div>
    </div>
);

export const SavingsSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <StandardHeaderSkeleton />

        {/* Total Balance Card */}
        <CardSkeleton height="100px" padding="1.5rem" className="flex items-start justify-between">
            <div className="flex flex-col">
                <PulseBlock height="0.8rem" width="100px" className="mb-2" />
                <PulseBlock height="2rem" width="150px" className="leading-none" />
                <PulseBlock height="0.8rem" width="80px" className="mt-2" />
            </div>
            <PulseBlock height="3rem" width="3rem" borderRadius="9999px" />
        </CardSkeleton>

        {/* Actions Row */}
        <div className="flex gap-2">
            <PulseBlock height="2.5rem" width="140px" />
            <PulseBlock height="2.5rem" width="140px" />
            <PulseBlock height="2.5rem" width="140px" />
        </div>

        {/* Savings Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
                <CardSkeleton key={i} height="auto" padding="1.5rem">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <PulseBlock height="1.25rem" width="120px" />
                            <PulseBlock height="1.75rem" width="100px" className="mt-1" />
                        </div>
                        <div className="flex gap-1">
                            <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                            <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <PulseBlock height="60px" borderRadius="0.5rem" />
                        <PulseBlock height="60px" borderRadius="0.5rem" />
                        <PulseBlock height="60px" borderRadius="0.5rem" />
                    </div>
                </CardSkeleton>
            ))}
        </div>
    </div>
);

export const ConfigSkeleton = () => (
    <div className="space-y-8">
        {/* Header Section */}
        <StandardHeaderSkeleton />

        <div className="space-y-8">
            <section className="space-y-8">
                {/* Theme Section */}
                <CardSkeleton height="auto" padding="1.5rem">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                            <div>
                                <PulseBlock height="1.2rem" width="120px" className="mb-1" />
                                <PulseBlock height="0.8rem" width="180px" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {[...Array(6)].map((_, i) => <PulseBlock key={i} height="80px" borderRadius="1rem" />)}
                    </div>
                </CardSkeleton>

                {/* Currency Section */}
                <CardSkeleton height="auto" padding="1.5rem">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                            <div>
                                <PulseBlock height="1.2rem" width="120px" className="mb-1" />
                                <PulseBlock height="0.8rem" width="200px" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => <PulseBlock key={i} height="60px" borderRadius="0.75rem" />)}
                    </div>
                </CardSkeleton>

                {/* Categories & Methods */}
                <div className="flex flex-col gap-10">
                    {/* Categories */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <PulseBlock height="1.5rem" width="1.5rem" />
                                <PulseBlock height="1.5rem" width="150px" />
                            </div>
                            <PulseBlock height="2rem" width="100px" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/5 h-16">
                                    <PulseBlock height="1.25rem" width="1.25rem" borderRadius="4px" />
                                    <div className="flex flex-col gap-2 flex-1">
                                        <PulseBlock height="0.85rem" width="60%" />
                                        <PulseBlock height="0.65rem" width="30%" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <PulseBlock height="1.5rem" width="1.5rem" />
                                <PulseBlock height="1.5rem" width="180px" />
                            </div>
                            <PulseBlock height="2rem" width="140px" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <CardSkeleton key={i} height="140px" padding="1.5rem">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <PulseBlock height="2.5rem" width="2.5rem" borderRadius="0.5rem" />
                                            <div className="space-y-1">
                                                <PulseBlock height="1rem" width="100px" />
                                                <PulseBlock height="0.75rem" width="60px" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between mt-auto pt-4 border-t border-border/50">
                                        <PulseBlock height="1rem" width="40%" />
                                        <PulseBlock height="1.5rem" width="30%" />
                                    </div>
                                </CardSkeleton>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <PulseBlock height="1px" width="100%" className="opacity-50" />

            <section className="space-y-8">
                {/* Advanced, Security & Danger */}
                <CardSkeleton height="200px" />
                <CardSkeleton height="200px" />
            </section>
        </div>
    </div>
);

export const CategoriesGridSkeleton = ({ count = 9 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/5 h-16">
                <PulseBlock height="1.25rem" width="1.25rem" borderRadius="4px" />
                <div className="flex flex-col gap-2 flex-1">
                    <PulseBlock height="0.85rem" width="60%" />
                    <PulseBlock height="0.65rem" width="30%" />
                </div>
            </div>
        ))}
    </div>
);

export const AccountsListSkeleton = ({ count = 3 }) => (
    <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <PulseBlock height="2.5rem" width="2.5rem" borderRadius="9999px" />
                    <div className="space-y-2">
                        <PulseBlock height="1rem" width="120px" />
                        <PulseBlock height="0.75rem" width="80px" />
                    </div>
                </div>
                <PulseBlock height="1.25rem" width="100px" borderRadius="9999px" />
            </div>
        ))}
    </div>
);

export const CashFlowSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
        <StandardHeaderSkeleton />

        {/* Filters Skeleton - Matching CashFlowFilters.tsx */}
        <CardSkeleton padding="1rem" className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
                <PulseBlock height="2.25rem" width="140px" borderRadius="9999px" />
                <PulseBlock height="2.25rem" width="140px" borderRadius="9999px" />
            </div>
            <div className="flex gap-4 items-center w-full sm:w-auto justify-end ml-auto">
                <div className="flex items-center gap-2 mr-2">
                    <PulseBlock height="0.75rem" width="80px" />
                    <PulseBlock height="1.5rem" width="2.5rem" borderRadius="9999px" />
                </div>
                <PulseBlock height="2.25rem" width="80px" borderRadius="9999px" />
            </div>
        </CardSkeleton>

        {/* Summary Cards - Matching CashFlow.tsx grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <CardSkeleton key={i} height="100px" padding="1.25rem" className="flex flex-col justify-center bg-slate-50/50">
                    <PulseBlock height="0.85rem" width="60%" className="mb-3" />
                    <PulseBlock height="1.75rem" width="80%" />
                </CardSkeleton>
            ))}
        </div>

        {/* Chart Skeleton */}
        <CardSkeleton height="420px" padding="1.5rem">
            <div className="flex justify-between items-center mb-8">
                <PulseBlock height="1.5rem" width="220px" />
                <div className="flex gap-2">
                    <PulseBlock height="2rem" width="100px" borderRadius="9999px" />
                </div>
            </div>
            <PulseBlock height="300px" width="100%" />
        </CardSkeleton>

        {/* Monthly Breakdown Table Skeleton */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <PulseBlock height="1.5rem" width="180px" />
                <PulseBlock height="2rem" width="200px" borderRadius="0.5rem" />
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="bg-muted/30 p-4 border-b border-border">
                    <div className="grid grid-cols-6 gap-4">
                        {[...Array(6)].map((_, i) => <PulseBlock key={i} height="0.7rem" />)}
                    </div>
                </div>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-border last:border-0 grid grid-cols-6 gap-4 items-center">
                        <PulseBlock height="1rem" width="80%" />
                        <PulseBlock height="1rem" width="90%" />
                        <PulseBlock height="1rem" width="90%" />
                        <PulseBlock height="1rem" width="90%" />
                        <PulseBlock height="1rem" width="90%" />
                        <PulseBlock height="1.5rem" width="100%" borderRadius="0.5rem" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const OnboardingSkeleton = () => (
    <div className="w-full max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
            <PulseBlock height="1.75rem" width="180px" className="mx-auto" />
            <PulseBlock height="0.9rem" width="260px" className="mx-auto" />
        </div>
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} padding="1rem">
                    <div className="flex items-center gap-4">
                        <PulseBlock height="2.5rem" width="2.5rem" borderRadius="0.75rem" />
                        <div className="space-y-2 flex-1">
                            <PulseBlock height="0.9rem" width="45%" />
                            <PulseBlock height="0.65rem" width="60%" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <PulseBlock height="2.5rem" width="100%" borderRadius="0.75rem" />
                    </div>
                </CardSkeleton>
            ))}
        </div>
    </div>
);

// ---------------------------------------------------------------------
// Auth Skeleton (High Fidelity Login Structure)
// ---------------------------------------------------------------------
const AuthSkeleton = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 animate-in fade-in duration-500">
        <div className="w-full max-w-[440px] flex flex-col items-center">
            {/* Logo placeholder */}
            <div className="mb-8 flex flex-col items-center gap-3">
                <PulseBlock height="48px" width="48px" borderRadius="12px" />
                <PulseBlock height="24px" width="180px" />
            </div>

            <CardSkeleton height="auto" width="100%" padding="1.5rem" className="flex flex-col space-y-6">
                {/* Tabs placeholder */}
                <div className="flex p-1 bg-muted/50 rounded-lg w-full">
                    <PulseBlock height="36px" width="50%" borderRadius="6px" />
                    <PulseBlock height="36px" width="50%" borderRadius="6px" />
                </div>

                {/* Form fields */}
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <PulseBlock height="14px" width="80px" />
                        <PulseBlock height="40px" width="100%" borderRadius="8px" />
                    </div>
                    <div className="space-y-2">
                        <PulseBlock height="14px" width="100px" />
                        <PulseBlock height="40px" width="100%" borderRadius="8px" />
                    </div>
                </div>

                {/* Action button */}
                <PulseBlock height="44px" width="100%" borderRadius="8px" />

                {/* Social login separator */}
                <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-border flex-1" />
                    <PulseBlock height="12px" width="120px" />
                    <div className="h-px bg-border flex-1" />
                </div>

                {/* Social buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <PulseBlock height="40px" width="100%" borderRadius="8px" />
                    <PulseBlock height="40px" width="100%" borderRadius="8px" />
                </div>
            </CardSkeleton>
        </div>
    </div>
);

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    loading = true,
    tab = 'dashboard',
    message = '',
    fullPage = true, // Default to showing global structure
    withLayoutWrapper = false, // Default to assuming we need to provide the layout structure (padding)
    showLoadingIndicator = true
}) => {
    if (!loading) { return null; }

    const renderTabSkeleton = () => {
        switch (tab) {
            case 'dashboard': return <DashboardSkeleton />;
            case 'transactions': return <HistorySkeleton />;
            case 'budgets': return <BudgetsSkeleton />;
            case 'loans': return <LoansSkeleton />;
            case 'savings': return <SavingsSkeleton />;
            case 'config': return <ConfigSkeleton />;
            case 'cashflow': return <CashFlowSkeleton />;
            case 'auth': return <AuthSkeleton />;
            case 'onboarding': return <OnboardingSkeleton />;
            default: return <DashboardSkeleton />;
        }
    };

    const loadingText = message || "Cargando...";
    const isAuth = tab === 'auth';
    const shouldShowIndicator = showLoadingIndicator && tab !== 'onboarding';
    const loadingIndicatorPositionClass = "absolute inset-x-0 top-1/3 z-[100] flex justify-center pointer-events-none";

    const contentPaddingClass = "py-8";
    const fullPageContentClass = cn(
        "w-full mx-auto max-w-6xl px-4",
        contentPaddingClass,
        isAuth ? "flex justify-center items-center h-full" : ""
    );


    // Embedded Mode (Inside MainLayout)
    if (!fullPage) {
        return (
            <div className="relative w-full" data-testid={`skeleton-${tab}`}>
                <style>
                    {`
                    @keyframes skeleton-shimmer {
                        0% { background-color: rgba(148, 163, 184, 0.12); }
                        50% { background-color: rgba(148, 163, 184, 0.18); }
                        100% { background-color: rgba(148, 163, 184, 0.12); }
                    }
                    @keyframes text-breathe {
                        0% { color: hsl(var(--foreground)); }
                        50% { color: hsl(var(--muted-foreground)); }
                        100% { color: hsl(var(--foreground)); }
                    }
                    @keyframes loader-button-tint {
                        0%, 20% {
                            background-color: var(--loader-idle-bg);
                            border-color: var(--loader-idle-border);
                            box-shadow: none;
                        }
                        33%, 53% {
                            background-color: var(--loader-active-bg);
                            border-color: var(--loader-active-border);
                            box-shadow: 0 0 0 1px var(--loader-active-border);
                        }
                        66%, 100% {
                            background-color: var(--loader-idle-bg);
                            border-color: var(--loader-idle-border);
                            box-shadow: none;
                        }
                    }
                    .skeleton-pulse {
                        animation: skeleton-shimmer 2s ease-in-out infinite;
                    }
                    .text-breathe {
                        animation: text-breathe 2s ease-in-out infinite;
                    }
                    .animate-loader-button {
                        animation: loader-button-tint 1.5s ease-in-out infinite;
                    }

                    `}
                </style>

                {/* Loading Indicator for embedded view */}
                {shouldShowIndicator && (
                    <div className={loadingIndicatorPositionClass}>
                        <div className="w-max bg-card/95 backdrop-blur-md px-6 py-2.5 rounded-full border border-border shadow-lg flex items-center gap-3">
                            <div
                                className="h-[5px] w-[10px] rounded-full border animate-loader-button"
                                style={{ ['--loader-idle-bg' as '--loader-idle-bg']: 'rgba(148, 163, 184, 0.20)', ['--loader-idle-border' as '--loader-idle-border']: 'rgba(148, 163, 184, 0.28)', ['--loader-active-bg' as '--loader-active-bg']: 'rgba(100, 116, 139, 0.78)', ['--loader-active-border' as '--loader-active-border']: 'rgba(100, 116, 139, 0.84)', animationDelay: '0s' }}
                            />
                            <div
                                className="h-[5px] w-[10px] rounded-full border animate-loader-button"
                                style={{ ['--loader-idle-bg' as '--loader-idle-bg']: 'rgba(203, 213, 225, 0.26)', ['--loader-idle-border' as '--loader-idle-border']: 'rgba(203, 213, 225, 0.34)', ['--loader-active-bg' as '--loader-active-bg']: 'rgba(148, 163, 184, 0.82)', ['--loader-active-border' as '--loader-active-border']: 'rgba(148, 163, 184, 0.88)', animationDelay: '0.4s' }}
                            />
                            <div
                                className="h-[5px] w-[10px] rounded-full border animate-loader-button"
                                style={{ ['--loader-idle-bg' as '--loader-idle-bg']: 'rgba(226, 232, 240, 0.34)', ['--loader-idle-border' as '--loader-idle-border']: 'rgba(203, 213, 225, 0.42)', ['--loader-active-bg' as '--loader-active-bg']: 'rgba(148, 163, 184, 0.72)', ['--loader-active-border' as '--loader-active-border']: 'rgba(148, 163, 184, 0.8)', animationDelay: '0.8s' }}
                            />
                            <span className="text-[13px] font-bold tracking-tight ml-1 text-foreground whitespace-nowrap text-breathe">{loadingText}</span>
                        </div>
                    </div>
                )}

                {renderTabSkeleton()}
            </div>
        );
    }

    // Full Page Mode (App.tsx / MainLayout fallback) — min-h reserva espacio y evita layout shift
    return (
        <div
            className={cn(
                "h-screen min-h-screen min-h-[100dvh] w-full overflow-hidden font-sans antialiased bg-background flex"
            )}
        >
            <style>
                {`
                @keyframes skeleton-shimmer {
                    0% { background-color: rgba(148, 163, 184, 0.12); }
                    50% { background-color: rgba(148, 163, 184, 0.18); }
                    100% { background-color: rgba(148, 163, 184, 0.12); }
                }
                @keyframes text-breathe {
                    0% { color: hsl(var(--foreground)); }
                    50% { color: hsl(var(--muted-foreground)); }
                    100% { color: hsl(var(--foreground)); }
                }
                @keyframes loader-button-tint {
                    0%, 20% {
                        background-color: var(--loader-idle-bg);
                        border-color: var(--loader-idle-border);
                        box-shadow: none;
                    }
                    33%, 53% {
                        background-color: var(--loader-active-bg);
                        border-color: var(--loader-active-border);
                        box-shadow: 0 0 0 1px var(--loader-active-border);
                    }
                    66%, 100% {
                        background-color: var(--loader-idle-bg);
                        border-color: var(--loader-idle-border);
                        box-shadow: none;
                    }
                }
                .skeleton-pulse {
                    animation: skeleton-shimmer 2s ease-in-out infinite;
                }
                .text-breathe {
                    animation: text-breathe 2s ease-in-out infinite;
                }
                .animate-loader-button {
                    animation: loader-button-tint 1.5s ease-in-out infinite;
                }

                `}
            </style>

            {/* Sidebar Skeleton - Only show if NOT auth */}
            {!isAuth && <SidebarSkeleton />}
            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 min-h-0 pb-20 lg:pb-0 overflow-y-auto overflow-x-hidden h-screen relative scrollbar-stable",
                    "transition-colors duration-300",
                    isAuth ? "bg-background flex items-center justify-center" : ""
                )}
            >
                {shouldShowIndicator && (
                    <div className={loadingIndicatorPositionClass}>
                        <div className="w-max bg-card/95 backdrop-blur-md px-6 py-2.5 rounded-full border border-border shadow-lg flex items-center gap-3">
                            <div
                                className="h-[5px] w-[10px] rounded-full border animate-loader-button"
                                style={{ ['--loader-idle-bg' as '--loader-idle-bg']: 'rgba(148, 163, 184, 0.20)', ['--loader-idle-border' as '--loader-idle-border']: 'rgba(148, 163, 184, 0.28)', ['--loader-active-bg' as '--loader-active-bg']: 'rgba(100, 116, 139, 0.78)', ['--loader-active-border' as '--loader-active-border']: 'rgba(100, 116, 139, 0.84)', animationDelay: '0s' }}
                            />
                            <div
                                className="h-[5px] w-[10px] rounded-full border animate-loader-button"
                                style={{ ['--loader-idle-bg' as '--loader-idle-bg']: 'rgba(203, 213, 225, 0.26)', ['--loader-idle-border' as '--loader-idle-border']: 'rgba(203, 213, 225, 0.34)', ['--loader-active-bg' as '--loader-active-bg']: 'rgba(148, 163, 184, 0.82)', ['--loader-active-border' as '--loader-active-border']: 'rgba(148, 163, 184, 0.88)', animationDelay: '0.4s' }}
                            />
                            <div
                                className="h-[5px] w-[10px] rounded-full border animate-loader-button"
                                style={{ ['--loader-idle-bg' as '--loader-idle-bg']: 'rgba(226, 232, 240, 0.34)', ['--loader-idle-border' as '--loader-idle-border']: 'rgba(203, 213, 225, 0.42)', ['--loader-active-bg' as '--loader-active-bg']: 'rgba(148, 163, 184, 0.72)', ['--loader-active-border' as '--loader-active-border']: 'rgba(148, 163, 184, 0.8)', animationDelay: '0.8s' }}
                            />
                            <span className="text-[13px] font-bold tracking-tight ml-1 text-foreground whitespace-nowrap text-breathe">{loadingText}</span>
                        </div>
                    </div>
                )}

                {/* Content Container */}
                <div className={fullPageContentClass}>
                    {renderTabSkeleton()}
                </div>
            </main>

            {!withLayoutWrapper && !isAuth && <MobileNavSkeleton />}
        </div>
    );
};
