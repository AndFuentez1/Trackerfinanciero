import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
    loading?: boolean;
    tab?: 'dashboard' | 'transactions' | 'config' | 'savings' | 'loans' | 'budgets' | 'default' | 'cashflow' | 'auth';
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
            border: '1px solid var(--border)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
    />
);

const CardSkeleton: React.FC<{
    className?: string;
    height?: string;
    width?: string;
    maxWidth?: string;
    children?: React.ReactNode;
    padding?: string;
    style?: React.CSSProperties;
}> = ({ className, height, width, maxWidth, children, padding = '1.5rem', style }) => (
    <div
        className={cn("rounded-xl shadow-sm", className)}
        style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            height,
            width,
            maxWidth,
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

const PageHeaderSkeleton = () => (
    <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10 w-full mb-8">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <PulseBlock height="2rem" width="2rem" borderRadius="0.5rem" />
                <PulseBlock height="1.75rem" width="150px" />
            </div>
            <div className="flex items-center gap-3">
                <PulseBlock height="2.25rem" width="120px" />
                <PulseBlock height="2.25rem" width="120px" />
                <PulseBlock height="2.25rem" width="40px" />
            </div>
        </div>
    </div>
);

const SidebarSkeleton = () => (
    <div
        className="hidden lg:flex flex-col w-64 border-r h-screen p-6 sticky top-0 flex-shrink-0"
        style={{
            backgroundColor: 'hsl(var(--container))',
            borderRight: '1px solid var(--border)',
            boxShadow: '1px 0 0 rgba(0,0,0,0.08)',
        }}
    >
        <div className="flex items-center gap-3 mb-10 px-2 flex-shrink-0">
            <PulseBlock height="2.5rem" width="2.5rem" borderRadius="0.75rem" />
            <div className="flex flex-col gap-2">
                <PulseBlock height="1.25rem" width="80px" />
                <PulseBlock height="0.65rem" width="60px" />
            </div>
        </div>

        <nav className="space-y-4 flex-1 overflow-hidden">
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

const StandardHeaderSkeleton = () => (
    <div className="space-y-4 border-b border-border/40 pb-6 w-full animate-in fade-in duration-700 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <PulseBlock height="3rem" width="3rem" borderRadius="1rem" />
                <div className="space-y-2">
                    <PulseBlock height="2rem" width="200px" />
                    <PulseBlock height="1rem" width="300px" />
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

const DashboardSkeleton = () => (
    <div className="space-y-12">
        <StandardHeaderSkeleton />
        {/* Header - usually handled by PageHeaderSkeleton but some pages have their own */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
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
    <div className="space-y-6">
        <StandardHeaderSkeleton />
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

        {/* List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="bg-muted/30 p-4 border-b border-border">
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <PulseBlock key={i} height="0.75rem" />)}
                </div>
            </div>
            {[...Array(8)].map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between border-b border-border last:border-0">
                    <div className="flex items-center gap-4 flex-1">
                        <PulseBlock height="2.5rem" width="2.5rem" borderRadius="9999px" />
                        <div className="space-y-2 flex-1 max-w-[200px]">
                            <PulseBlock height="0.9rem" width="80%" />
                            <PulseBlock height="0.6rem" width="50%" />
                        </div>
                    </div>
                    <PulseBlock height="1.25rem" width="100px" borderRadius="9999px" />
                </div>
            ))}
        </div>
    </div>
);

const BudgetsSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <StandardHeaderSkeleton />
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
            <PulseBlock height="1.5rem" width="250px" className="mb-8" />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <StandardHeaderSkeleton />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <StandardHeaderSkeleton />

        {/* Total Balance Card */}
        <CardSkeleton height="100px" padding="1.5rem" className="flex items-center justify-between">
            <div>
                <PulseBlock height="0.8rem" width="100px" className="mb-2" />
                <PulseBlock height="2rem" width="150px" />
                <PulseBlock height="0.8rem" width="80px" className="mt-1" />
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
                <CardSkeleton key={i} height="200px" padding="1.5rem">
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

const ConfigSkeleton = () => (
    <div className="container max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* Header Section */}
        <StandardHeaderSkeleton />

        <div className="space-y-8">
            <section className="space-y-8">
                {/* Theme Section */}
                <CardSkeleton height="200px">
                    <PulseBlock height="1.5rem" width="180px" className="mb-6" />
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {[...Array(6)].map((_, i) => <PulseBlock key={i} height="80px" borderRadius="1rem" />)}
                    </div>
                </CardSkeleton>

                {/* Currency Section */}
                <CardSkeleton height="150px" />

                {/* Two large sections (Categories & Methods) */}
                <div className="flex flex-col gap-10">
                    <CardSkeleton height="400px" padding="2rem">
                        <PulseBlock height="1.5rem" width="150px" className="mb-6" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[...Array(9)].map((_, i) => <PulseBlock key={i} height="3.5rem" />)}
                        </div>
                    </CardSkeleton>

                    <CardSkeleton height="300px" padding="2rem">
                        <PulseBlock height="1.5rem" width="180px" className="mb-6" />
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <PulseBlock key={i} height="4rem" />)}
                        </div>
                    </CardSkeleton>
                </div>
            </section>

            {/* Separator mimic */}
            <PulseBlock height="1px" width="100%" className="opacity-50" />

            <section className="space-y-8">
                {/* Security & Danger */}
                <CardSkeleton height="250px" />
                <CardSkeleton height="200px" />
            </section>

            {/* Info Card */}
            <CardSkeleton height="150px" className="bg-primary/5 border-primary/10" />
        </div>
    </div >
);

const CashFlowSkeleton = () => (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
        <StandardHeaderSkeleton />

        {/* Filters */}
        <div className="flex gap-4 mb-6">
            <PulseBlock height="2.5rem" width="120px" />
            <PulseBlock height="2.5rem" width="120px" />
            <PulseBlock height="2.5rem" width="120px" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-muted/40 p-4 h-[100px] flex flex-col justify-between">
                    <PulseBlock height="0.75rem" width="60%" className="mb-2" />
                    <PulseBlock height="1.5rem" width="80%" />
                </div>
            ))}
        </div>

        {/* Chart */}
        <CardSkeleton height="400px" className="mb-6">
            <PulseBlock height="1.5rem" width="150px" className="mb-6" />
            <PulseBlock height="300px" width="100%" />
        </CardSkeleton>

        {/* Table */}
        <div className="rounded-xl border border-input bg-card overflow-hidden">
            <div className="bg-muted/40 p-4 border-b border-border">
                <div className="grid grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => <PulseBlock key={i} height="0.75rem" />)}
                </div>
            </div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 border-b border-border last:border-0 grid grid-cols-6 gap-4">
                    {[...Array(6)].map((_, j) => <PulseBlock key={j} height="1rem" width="80%" />)}
                </div>
            ))}
        </div>
    </div>
);

// ---------------------------------------------------------------------
// Auth Skeleton (No Sidebar)
// ---------------------------------------------------------------------
const AuthSkeleton = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <CardSkeleton height="auto" width="100%" maxWidth="450px" padding="2rem" className="flex flex-col items-center space-y-6">
            <div className="p-3 rounded-2xl bg-primary/10 mb-2">
                <PulseBlock height="2.5rem" width="2.5rem" borderRadius="0.5rem" />
            </div>
            <PulseBlock height="2rem" width="60%" className="mb-2" />
            <PulseBlock height="1rem" width="40%" className="mb-8" />

            <div className="w-full space-y-4">
                <PulseBlock height="3rem" width="100%" borderRadius="0.5rem" />
                <div className="flex gap-2">
                    <PulseBlock height="2.5rem" width="50%" borderRadius="0.5rem" />
                    <PulseBlock height="2.5rem" width="50%" borderRadius="0.5rem" />
                </div>
                <PulseBlock height="10rem" width="100%" borderRadius="0.5rem" />
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
            case 'auth': return <AuthSkeleton />;
            default: return <DashboardSkeleton />;
        }
    };

    const loadingText = message || "Cargando...";
    const isAuth = tab === 'auth';

    // Embedded Mode (Inside MainLayout)
    if (!fullPage) {
        return (
            <div className="w-full h-full bg-background">
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
                {/* Loading Indicator for embedded view */}
                <div className="fixed top-[140px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none fade-in duration-500">
                    <div className="bg-card/90 backdrop-blur-md px-6 py-3 rounded-full border border-border/50 shadow-xl flex items-center gap-3 skeleton-pulse">
                        <div className="h-2.5 w-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="h-2.5 w-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <div className="h-2.5 w-2.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        <span className="text-sm font-semibold tracking-wide ml-1 text-foreground whitespace-nowrap">{loadingText}</span>
                    </div>
                </div>

                <div
                    className={cn(
                        "w-full",
                        tab === 'config' ? "" : "container max-w-6xl mx-auto px-4 py-10"
                    )}
                >
                    {renderTabSkeleton()}
                </div>
            </div>
        );
    }

    // Full Page Mode (App.tsx / MainLayout fallback)
    return (
        <div
            className={cn(
                "h-screen w-full overflow-hidden font-sans antialiased bg-background flex"
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

            {/* Loading Indicator */}
            <div className="fixed top-[140px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none fade-in duration-500">
                <div className="bg-card/90 backdrop-blur-md px-6 py-3 rounded-full border border-border/50 shadow-xl flex items-center gap-3 skeleton-pulse">
                    <div className="h-2.5 w-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="h-2.5 w-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="h-2.5 w-2.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    <span className="text-sm font-semibold tracking-wide ml-1 text-foreground whitespace-nowrap">{loadingText}</span>
                </div>
            </div>

            {/* Sidebar Skeleton - Only show if NOT auth */}
            {!isAuth && <SidebarSkeleton />}

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 pb-20 lg:pb-0 overflow-y-auto h-screen relative",
                    "transition-all duration-300",
                    isAuth ? "bg-background flex items-center justify-center" : ""
                )}
            >
                {/* Content Container */}
                <div
                    className={cn(
                        "w-full mx-auto px-4 py-10",
                        tab === 'config' ? "" : "max-w-6xl",
                        isAuth ? "flex justify-center items-center h-full" : ""
                    )}
                >
                    {renderTabSkeleton()}
                </div>
            </main>

            {!withLayoutWrapper && !isAuth && <MobileNavSkeleton />}
        </div>
    );
};
