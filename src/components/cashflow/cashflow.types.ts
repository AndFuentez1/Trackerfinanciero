export interface CashFlowPoint {
  fecha: string; // YYYY-MM-DD
  real: number | null;
  proyectado: number;
  income_estimate: number;
  expense_estimate: number;
  debt_commitment: number;
  net_balance: number;
}
