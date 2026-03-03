export const getSkeletonTypeFromPath = (path: string) => {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath === '/' || normalizedPath === '' || normalizedPath.includes('dashboard')) return 'dashboard';
  if (normalizedPath.includes('history') || normalizedPath.includes('historial')) return 'transactions';
  if (normalizedPath.includes('savings') || normalizedPath.includes('ahorros')) return 'savings';
  if (normalizedPath.includes('loans') || normalizedPath.includes('prestamos')) return 'loans';
  if (normalizedPath.includes('budgets') || normalizedPath.includes('presupuestos')) return 'budgets';
  if (normalizedPath.includes('settings') || normalizedPath.includes('configuracion')) return 'config';
  if (normalizedPath.includes('cashflow') || normalizedPath.includes('flujo-caja')) return 'cashflow';
  if (normalizedPath.includes('auth')) return 'auth';

  return 'default';
};

