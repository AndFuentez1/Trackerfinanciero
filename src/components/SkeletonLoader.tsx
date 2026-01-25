import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
    loading?: boolean;
    tab?: 'dashboard' | 'transactions' | 'config' | 'savings' | 'loans' | 'budgets' | 'default';
    message?: string;
    rows?: number;
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
            backgroundColor: 'rgba(100, 116, 139, 0.15)',
            border: '1px solid var(--border)',
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
            border: '1px solid var(--border)',
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

const PageHeaderSkeleton = () => (
    <div style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'rgba(var(--bg-card-rgb, 255, 255, 255), 0.5)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        marginBottom: '2rem'
    }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <PulseBlock height="1.75rem" width="120px" />
            <div className="flex items-center gap-3">
                <PulseBlock height="2.25rem" width="140px" />
                <PulseBlock height="2.25rem" width="100px" />
            </div>
        </div>
    </div>
);

const SidebarSkeleton = () => (
    <div
        className="hidden lg:flex flex-col border-r min-h-screen p-6"
        style={{
            width: '256px',
            flexShrink: 0,
            backgroundColor: 'hsl(var(--container))',
            borderRight: '1px solid var(--border)',
            boxShadow: '1px 0 0 rgba(0,0,0,0.05)',
            height: '100vh',
            overflowY: 'auto'
        }}
    >
        <div className="flex items-center gap-3 mb-10 px-2">
            <PulseBlock height="2.5rem" width="2.5rem" borderRadius="0.75rem" />
            <div className="flex flex-col gap-2">
                <PulseBlock height="1.25rem" width="80px" />
                <PulseBlock height="0.65rem" width="60px" />
            </div>
        </div>

        <nav className="space-y-4 flex-1">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <PulseBlock height="1.25rem" width="1.25rem" />
                    <PulseBlock height="1rem" width="60%" />
                </div>
            ))}
        </nav>

        <div className="mt-auto px-4 py-4">
            <PulseBlock height="2rem" />
        </div>
    </div>
);

const MobileNavSkeleton = () => (
    <div
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t px-6 py-2 flex items-center justify-between z-50"
        style={{
            backgroundColor: 'hsl(var(--container))',
            borderTop: '1px solid var(--border)',
            backdropFilter: 'blur(8px)'
        }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PulseBlock height="1.5rem" width="150px" />
            <div style={{ display: 'flex', gap: '1rem', overflow: 'hidden' }}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} style={{
                        minWidth: '280px',
                        height: '100px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem'
                    }} className="skeleton-pulse" />
                ))}
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PulseBlock height="1rem" width="140px" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {[...Array(3)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <PulseBlock height="1.5rem" width="180px" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="lg:col-span-2">
                    <CardSkeleton height="350px">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <PulseBlock height="1.5rem" width="100px" />
                            <PulseBlock height="1.5rem" width="200px" />
                        </div>
                        <PulseBlock height="220px" width="100%" className="mt-4" />
                    </CardSkeleton>
                </div>
                <CardSkeleton height="350px">
                    <PulseBlock height="1.5rem" width="120px" className="mb-8" />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                        <PulseBlock height="160px" width="160px" borderRadius="9999px" />
                    </div>
                </CardSkeleton>
            </div>
        </div>
    </div>
);

const HistorySkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <CardSkeleton padding="1rem" style={{ backgroundColor: 'rgba(var(--bg-card-rgb), 0.4)' }}>
            <PulseBlock height="1.25rem" width="100px" className="mb-4" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {[...Array(4)].map((_, i) => <PulseBlock key={i} height="2.5rem" />)}
            </div>
        </CardSkeleton>

        <PulseBlock height="1rem" width="220px" />

        <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            overflow: 'hidden'
        }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.03)', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {[...Array(4)].map((_, i) => <PulseBlock key={i} height="0.75rem" />)}
                </div>
            </div>
            {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: i === 5 ? 'none' : '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <PulseBlock height="2.5rem" width="2.5rem" borderRadius="9999px" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                            <PulseBlock height="0.9rem" width="60%" />
                            <PulseBlock height="0.6rem" width="30%" />
                        </div>
                    </div>
                    <PulseBlock height="1.25rem" width="80px" borderRadius="9999px" />
                </div>
            ))}
        </div>
    </div>
);

const BudgetsSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
    </div>
);

const LoansSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <CardSkeleton height="120px" padding="2rem" className="flex items-center justify-between">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <PulseBlock height="1rem" width="120px" />
                <PulseBlock height="2.5rem" width="200px" />
            </div>
            <PulseBlock height="3.5rem" width="3.5rem" borderRadius="9999px" />
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
    <div className="max-w-4xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <PulseBlock height="2.5rem" width="220px" />
            <PulseBlock height="1rem" width="380px" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <CardSkeleton height="120px" />
            <CardSkeleton height="120px" />
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '1rem 0' }} />

        <CardSkeleton>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <PulseBlock height="1.75rem" width="220px" />
                <PulseBlock height="2rem" width="160px" />
            </div>
            <PulseBlock height="3.5rem" className="mb-8" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[...Array(6)].map((_, i) => <CardSkeleton key={i} height="60px" padding="0.5rem" />)}
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
    message = 'Cargando aplicación',
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
            default: return <DashboardSkeleton />;
        }
    };

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: 'hsl(var(--background))',
            width: '100%',
            overflowX: 'hidden',
            transition: 'all 0.3s ease'
        }}>
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
                <div style={{
                    position: 'fixed',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        backdropFilter: 'blur(8px)',
                        padding: '0.65rem 1.5rem',
                        borderRadius: '9999px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem'
                    }} className="skeleton-pulse">
                        <div style={{
                            width: '18px',
                            height: '18px',
                            backgroundColor: 'hsl(var(--primary))',
                            borderRadius: '2px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <div style={{
                                width: '10px',
                                height: '2px',
                                backgroundColor: 'white',
                                borderRadius: '1px'
                            }} />
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
                            {message}
                        </span>
                    </div>
                </div>
            )}

            {tab !== 'config' && <SidebarSkeleton />}

            <div style={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                minHeight: '100vh',
                overflowY: 'auto',
                marginLeft: 0,
                paddingLeft: 0
            }}>
                {tab !== 'config' && <PageHeaderSkeleton />}

                <main className="max-w-6xl mx-auto w-full" style={{
                    paddingTop: tab === 'config' ? '2rem' : '0px',
                    paddingBottom: '5rem',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    transition: 'all 0.3s ease',
                    flex: 1
                }}>
                    {renderTabSkeleton()}
                </main>
            </div>

            <MobileNavSkeleton />
        </div>
    );
};
