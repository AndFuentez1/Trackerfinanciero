
export const getSkeletonTypeFromPath = (path: string) => {
    // Normalize path to ensure consistent matching
    const normalizedPath = path.toLowerCase();

    if (normalizedPath === '/' || normalizedPath === '') return 'dashboard';
    if (normalizedPath.includes('historial')) return 'transactions';
    if (normalizedPath.includes('ahorros')) return 'savings';
    if (normalizedPath.includes('prestamos')) return 'loans';
    if (normalizedPath.includes('presupuestos')) return 'budgets';
    if (normalizedPath.includes('configuracion')) return 'config';
    if (normalizedPath.includes('flujo-caja')) return 'cashflow';

    if (normalizedPath.includes('auth')) return 'auth';

    return 'default';
};
