import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
    loading?: boolean;
    tab?: 'dashboard' | 'transactions' | 'config' | 'savings' | 'loans' | 'budgets' | 'default' | 'cashflow';
    message?: string;
    rows?: number;
    fullPage?: boolean;
    withLayoutWrapper?: boolean; // New prop: Is this skeleton rendered INSIDE the Sidebar layout?
}

// ---------------------------------------------------------------------
// Modular Base Skeletons (High Fidelity)
// ---------------------------------------------------------------------

const PulseBlock: React.FC<{
    width?: string | number;
    height?: string | number;
    className?: string;
    borderRadius?: string;
}> = ({ width = '100%', height = '1rem', className = '', borderRadius = '0.5rem' }) => (
    <div
        className={cn('skeleton-pulse', className)}
        style={{
            width,
            height,
            borderRadius,
            backgroundColor: 'rgba(100, 116, 139, 0.25)',
            border: '1px solid var(--color-border)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
    />
);

const CardSkeleton: React.FC<{
    className?: string;
    height?: string;
    children?: React.ReactNode;
    padding?: string;
    style?: React.CSSProperties;
}> = ({ className, height, children, padding = '1.5rem', style }) => (
    <div
        className={cn("rounded-xl shadow-sm", className)}
        style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--color-border)',
            height,
            padding,
            transition: 'all 0.3s ease',
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

const PageHeaderSkeleton = ({ label }: { label?: string }) => (
    <div className="mb-8">
        <CardSkeleton className="border border-border/60 bg-card shadow-sm">
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start md:items-center gap-4 flex-1">
                    <PulseBlock height="3rem" width="3rem" borderRadius="0.75rem" className="bg-primary/10 ring-1 ring-primary/20" />
                    <div className="space-y-2 flex-1">
                        <PulseBlock height="1.75rem" width="180px" />
                        <PulseBlock height="0.75rem" width="280px" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <PulseBlock height="2.25rem" width="100px" />
                    <PulseBlock height="2.25rem" width="100px" />
                </div>
            </div>
        </CardSkeleton>
    </div>
);

const SidebarSkeleton = () => (
    <div
        className="hidden lg:flex flex-col border-r h-screen p-6 fixed top-0 left-0 bottom-0 z-0"
        style={{
            width: '18rem', // w-72 (18rem)
            backgroundColor: 'hsl(var(--container))',
            borderRight: '1px solid var(--color-border)',
        }}
    >
        <div className="flex items-center gap-4 mb-10 px-3 pt-8">
            <PulseBlock height="3rem" width="3rem" borderRadius="1rem" />
            <div className="flex flex-col gap-2">
                <PulseBlock height="1.75rem" width="100px" />
                <PulseBlock height="0.8rem" width="80px" />
            </div>
        </div>

        <nav className="space-y-4 flex-1">
            {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <PulseBlock height="1.5rem" width="1.5rem" />
                    <PulseBlock height="1rem" width="65%" />
                </div>
            ))}
        </nav>

        <div className="mt-auto pt-6">
            <PulseBlock height="3.5rem" width="100%" borderRadius="1rem" />
        </div>
    </div>
);

const MobileNavSkeleton = () => (
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

// ---------------------------------------------------------------------
// Tab Layouts
// ---------------------------------------------------------------------

const DashboardSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
        {/* Payment Methods Grid (First in SummaryTab) */}
        <div className="space-y-4">
            <PulseBlock height="1.5rem" width="200px" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <CardSkeleton key={i} height="220px" className="bg-card/50">
                        <div className="flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <PulseBlock height="3rem" width="3rem" borderRadius="1rem" />
                                    <div className="space-y-2">
                                        <PulseBlock height="1.2rem" width="100px" />
                                        <PulseBlock height="0.8rem" width="60px" />
                                    </div>
                                </div>
                                <PulseBlock height="1rem" width="40px" borderRadius="1rem" />
                            </div>
                            <div className="space-y-2 mt-auto">
                                <PulseBlock height="2rem" width="120px" />
                                <PulseBlock height="0.8rem" width="80px" />
                            </div>
                        </div>
                    </CardSkeleton>
                ))}
            </div>
        </div>

        {/* Stats Cards - Row 1 (4 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>

        {/* Stats Cards - Row 2 (3 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(3)].map((_, i) => <StatCardSkeleton key={`row2-${i}`} />)}
        </div>

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

const HistorySkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-700">
        {/* Status Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-border bg-muted/20">
            <div className="flex items-center gap-3">
                <PulseBlock height="1.5rem" width="1.5rem" borderRadius="9999px" />
                <PulseBlock height="1rem" width="200px" />
            </div>
            <PulseBlock height="2rem" width="100px" />
        </div>

        {/* Filters */}
        <div className="bg-card/30 p-4 rounded-xl border border-border/50 space-y-4">
            <div className="flex items-center gap-2">
                <PulseBlock height="1.25rem" width="1.25rem" />
                <PulseBlock height="1.25rem" width="80px" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <PulseBlock height="2.5rem" width="100%" className="flex-1" /> {/* Search */}
                <div className="flex gap-2 w-full sm:w-auto">
                    <PulseBlock height="2.5rem" width="140px" />
                    <PulseBlock height="2.5rem" width="140px" />
                    <PulseBlock height="2.5rem" width="140px" />
                </div>
            </div>
        </div>

        {/* List (Table Desktop) */}
        <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden shadow-md">
            <table className="premium-table">
                <thead>
                    <tr>
                        {[...Array(6)].map((_, i) => (
                            <th key={i}><PulseBlock height="0.75rem" width="60%" className="mx-auto" /></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {[...Array(8)].map((_, i) => (
                        <tr key={i}>
                            {[...Array(6)].map((_, j) => (
                                <td key={j}><PulseBlock height="1rem" width="80%" className="mx-auto" /></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* List (Mobile Cards) */}
        <div className="md:hidden space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex justify-between">
                        <PulseBlock height="1rem" width="40%" />
                        <PulseBlock height="1.25rem" width="80px" />
                    </div>
                    <PulseBlock height="0.75rem" width="90%" />
                    <div className="flex justify-between pt-2 border-t border-border/50">
                        <PulseBlock height="0.75rem" width="100px" />
                        <div className="flex gap-2">
                            <PulseBlock height="1.5rem" width="1.5rem" />
                            <PulseBlock height="1.5rem" width="1.5rem" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const BudgetsSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-in fade-in duration-700">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <CardSkeleton height="140px">
                <PulseBlock height="1rem" width="120px" className="mb-4" />
                <PulseBlock height="2.5rem" width="60%" className="mb-4" />
                <PulseBlock height="0.5rem" width="100%" borderRadius="9999px" />
            </CardSkeleton>
            <CardSkeleton height="140px">
                <PulseBlock height="1rem" width="120px" className="mb-4" />
                <PulseBlock height="2.5rem" width="60%" className="mb-4" />
                <PulseBlock height="0.5rem" width="100%" borderRadius="9999px" />
            </CardSkeleton>
        </div>

        <CardSkeleton>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <PulseBlock height="1rem" width="40%" />
                            <PulseBlock height="1rem" width="20%" />
                        </div>
                        <PulseBlock height="0.6rem" width="100%" borderRadius="9999px" />
                    </div>
                ))}
            </div>
        </CardSkeleton>

        {/* Future Expenses Skeleton */}
        <CardSkeleton height="200px">
            <PulseBlock height="1.5rem" width="250px" className="mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <CardSkeleton key={i} height="120px" padding="1rem" />)}
            </div>
        </CardSkeleton>
    </div>
);

const LoansSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-in fade-in duration-700">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <CardSkeleton height="100px" padding="1.5rem" className="flex flex-col justify-center">
                <PulseBlock height="0.75rem" width="100px" className="mb-2" />
                <PulseBlock height="1.75rem" width="140px" />
            </CardSkeleton>
            <CardSkeleton height="100px" padding="1.5rem" className="flex flex-col justify-center">
                <PulseBlock height="0.75rem" width="100px" className="mb-2" />
                <PulseBlock height="1.75rem" width="140px" />
            </CardSkeleton>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PulseBlock height="1.5rem" width="280px" className="mb-2" />
            {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} padding="1.5rem">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <PulseBlock height="1.25rem" width="50%" />
                            <PulseBlock height="0.8rem" width="80%" />
                        </div>
                        <PulseBlock height="2.25rem" width="120px" />
                    </div>
                    <PulseBlock height="0.5rem" width="100%" borderRadius="9999px" />
                </CardSkeleton>
            ))}
        </div>
    </div>
);

const SavingsSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-in fade-in duration-700">
        {/* Only show top summary if it's not a full page with a global header to avoid mixing */}
        <CardSkeleton height="120px" padding="2rem" className="flex items-center justify-between bg-primary/5 border-primary/10">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <PulseBlock height="0.75rem" width="100px" />
                <PulseBlock height="2.5rem" width="180px" />
            </div>
            <PulseBlock height="3rem" width="3rem" borderRadius="9999px" />
        </CardSkeleton>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
            <PulseBlock height="2.5rem" width="180px" />
            <PulseBlock height="2.5rem" width="180px" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {[...Array(2)].map((_, i) => (
                <CardSkeleton key={i} height="240px">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <PulseBlock height="1.25rem" width="120px" />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <PulseBlock height="2rem" width="2rem" />
                            <PulseBlock height="2rem" width="2rem" />
                        </div>
                    </div>
                    <PulseBlock height="2.5rem" width="180px" className="mb-6" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {[...Array(3)].map((_, j) => <PulseBlock key={j} height="3.5rem" />)}
                    </div>
                </CardSkeleton>
            ))}
        </div>
    </div>
);

const ConfigSkeleton = () => (
    <div className="space-y-12 animate-in fade-in duration-700">
        <div className="space-y-8">
            <div className="space-y-8">
                {/* Theme Section */}
                <CardSkeleton height="280px" padding="1.5rem">
                    <PulseBlock height="1.5rem" width="150px" className="mb-6" />
                    <div className="flex gap-4 flex-wrap">
                        {[...Array(6)].map((_, i) => (
                            <PulseBlock key={i} height="3rem" width="3rem" borderRadius="9999px" />
                        ))}
                    </div>
                </CardSkeleton>

                {/* Currency Section */}
                <CardSkeleton height="200px" padding="1.5rem">
                    <PulseBlock height="1.5rem" width="180px" className="mb-6" />
                    <PulseBlock height="2.5rem" width="100%" className="max-w-md" />
                </CardSkeleton>

                <div className="flex flex-col gap-10">
                    {/* Categories Section */}
                    <CardSkeleton height="400px" padding="1.5rem">
                        <div className="flex justify-between items-center mb-6">
                            <PulseBlock height="1.5rem" width="120px" />
                            <PulseBlock height="2.5rem" width="100px" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {[...Array(12)].map((_, i) => (
                                <PulseBlock key={i} height="2.5rem" width="100%" borderRadius="0.75rem" />
                            ))}
                        </div>
                    </CardSkeleton>

                    {/* Payment Methods Section */}
                    <CardSkeleton height="auto" padding="1.5rem">
                        <div className="flex justify-between items-center mb-6">
                            <PulseBlock height="1.5rem" width="180px" />
                            <PulseBlock height="2.5rem" width="160px" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <CardSkeleton key={i} height="220px" className="bg-card/50">
                                    <div className="flex flex-col justify-between h-full">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3">
                                                <PulseBlock height="3rem" width="3rem" borderRadius="1rem" />
                                                <div className="space-y-2">
                                                    <PulseBlock height="1.2rem" width="100px" />
                                                    <PulseBlock height="0.8rem" width="60px" />
                                                </div>
                                            </div>
                                            <PulseBlock height="1rem" width="40px" borderRadius="1rem" />
                                        </div>
                                        <div className="space-y-2 mt-auto">
                                            <PulseBlock height="2rem" width="120px" />
                                            <PulseBlock height="0.8rem" width="80px" />
                                        </div>
                                    </div>
                                </CardSkeleton>
                            ))}
                        </div>
                    </CardSkeleton>
                </div>
            </div>

            <div className="h-px bg-border/50 w-full" />

            <div className="space-y-8">
                {/* Security Section */}
                <CardSkeleton height="250px" padding="1.5rem">
                    <PulseBlock height="1.5rem" width="150px" className="mb-6" />
                    <PulseBlock height="2.5rem" width="100%" className="max-w-xs" />
                </CardSkeleton>

                {/* Danger Zone */}
                <CardSkeleton height="200px" padding="1.5rem" style={{ border: '1px dashed var(--destructive)' }}>
                    <PulseBlock height="1.5rem" width="150px" className="mb-4" />
                    <PulseBlock height="1rem" width="80%" className="mb-6" />
                    <PulseBlock height="2.5rem" width="120px" />
                </CardSkeleton>
            </div>

            {/* Info Card */}
            <CardSkeleton height="150px" className="bg-primary/5 border-primary/10">
                <PulseBlock height="1rem" width="100px" className="mb-4" />
                <PulseBlock height="0.8rem" width="90%" className="mb-2" />
                <PulseBlock height="0.8rem" width="60%" />
            </CardSkeleton>
        </div>
    </div>
);

const CashFlowSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
        <div className="space-y-4">
            <PulseBlock height="2.5rem" width="100%" /> {/* Filters placeholder */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>

        <CardSkeleton height="400px">
            <PulseBlock height="1.5rem" width="120px" className="mb-6" />
            <PulseBlock height="300px" width="100%" />
        </CardSkeleton>

        <CardSkeleton height="300px">
            <PulseBlock height="1.5rem" width="180px" className="mb-6" />
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center bg-muted/20 p-4 rounded-xl">
                        <PulseBlock height="1rem" width="40%" />
                        <PulseBlock height="1rem" width="20%" />
                    </div>
                ))}
            </div>
        </CardSkeleton>

        <CardSkeleton height="auto">
            <PulseBlock height="1.5rem" width="180px" className="mb-4" />
            <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full">
                    <thead>
                        <tr>
                            {[...Array(6)].map((_, i) => (
                                <th key={i} className="p-3"><PulseBlock height="0.75rem" width="60%" className="mx-auto" /></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(6)].map((_, i) => (
                            <tr key={i}>
                                {[...Array(6)].map((_, j) => (
                                    <td key={j} className="p-3"><PulseBlock height="1rem" width="80%" className="mx-auto" /></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardSkeleton>
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
    withLayoutWrapper = false // Default to assuming we need to provide the layout structure (padding)
}) => {
    if (!loading) return null;

    const renderTabSkeleton = () => {
        switch (tab) {
            case 'dashboard': return <DashboardSkeleton />;
            case 'transactions': return <HistorySkeleton />;
            case 'budgets': return <BudgetsSkeleton />;
            case 'loans': return <LoansSkeleton />;
            case 'savings': return <SavingsSkeleton />;
            case 'config': return <ConfigSkeleton />;
            case 'cashflow': return <CashFlowSkeleton />;
        }
    };

    const getLabel = () => {
        switch (tab) {
            case 'dashboard': return 'Resumen';
            case 'transactions': return 'Historial';
            case 'budgets': return 'Presupuesto Mensual';
            case 'loans': return 'Préstamos y Deudas';
            case 'savings': return 'Ahorros e Inversiones';
            case 'config': return 'Configuración';
            case 'cashflow': return 'Flujo de Caja';
            default: return 'Cargando';
        }
    };

    return (
        <div
            className={cn(
                "h-screen overflow-hidden bg-background w-full",
                // Only use flex if we are rendering the sidebar structure
                fullPage ? "flex" : ""
            )}
        >
            <style>
                {`
                @keyframes skeleton-pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                .skeleton-pulse {
                    animation: skeleton-pulse 1.8s ease-in-out infinite;
                }
                `}
            </style>

            {message && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                    <div className="bg-card/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-border shadow-2xl flex items-center gap-3 skeleton-pulse">
                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                        <span className="text-sm font-semibold tracking-tight">{message}</span>
                    </div>
                </div>
            )}

            {/* Sidebar Skeleton - Only if fullPage */}
            {fullPage && <SidebarSkeleton />}

            <div
                className={cn(
                    "flex flex-col min-h-screen flex-1",
                    "transition-all duration-300",
                    // Only enforce left padding if sidebar is present AND we are NOT inside a wrapper that already handles it
                    (fullPage && !withLayoutWrapper) ? "lg:pl-72" : ""
                )}
            >
                <main
                    className={cn(
                        "w-full flex-1 container max-w-6xl mx-auto px-4 py-8"
                    )}
                >
                    {/* Render header skeleton for pages that have it */}
                    {tab !== 'default' && <PageHeaderSkeleton label={getLabel()} />}

                    {renderTabSkeleton()}
                </main>
            </div>

            {fullPage && !withLayoutWrapper && <MobileNavSkeleton />}
        </div>
    );
};
