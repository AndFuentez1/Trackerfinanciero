// Tipos centrales para fundaciones y finanzas

export type CategoryType = 'ingreso' | 'gasto' | 'transferencia';
export type PaymentMethodType = 'efectivo' | 'banco' | 'tarjeta' | 'otro';

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  user_id: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  user_id: string;
}
