import type { Database } from '@/integrations/supabase/types';

export type TransactionType = 'income' | 'expense' | 'saving' | 'savings' | 'investment' | 'transfer_out' | 'transfer_in' | 'loan' | 'other';
export type PaymentMethodType = 'cash' | 'debit' | 'credit' | 'savings' | 'investment';

export interface CategoryItem {
    id: string;
    name: string;
    type: TransactionType;
    color?: string | null;
    is_default?: boolean;
    saving_goal?: number | null;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    category: string | null;
    category_id?: string | null;
    amount: number;
    description: string;
    date: string;
    payment_method_id?: string | null;
    installments?: number;
    created_at?: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    type: PaymentMethodType;
    balance: number;
    credit_limit?: number | null;
    is_savings_account?: boolean;
    savings_goal?: number | null;
    estimated_yield?: number | null; // Rentabilidad Estimada (%)
    closing_date?: number | null;
    payment_day?: number | null;
    color?: string | null;
    franchise?: string | null;
    last_4_digits?: string | null;
}

// Row type returned by Supabase for payment_methods table
export type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export interface Budget {
    id: string;
    category: string;
    category_id?: string;
    amount: number;
    month: string;
    spent?: number;
    user_id?: string;
    period?: 'monthly';
    created_at?: string;
    updated_at?: string;
}

export interface Insight {
    id: string;
    type: 'warning' | 'tip' | 'success';
    title: string;
    description: string;
}

export interface LoanPayment {
    id: string;
    loan_id: string;
    amount: number;
    date: string;
    created_at: string;
}

export interface Loan {
    id: string;
    name: string;
    total_amount: number;
    paid_amount: number;
    interest_rate: number;
    due_date: string | null;
    payment_method_id: string | null;
    created_at: string;
    user_id: string;
    type: 'borrowed' | 'lent';
    payments?: LoanPayment[];
    is_disbursed?: boolean;
    installments?: number;
}

export interface LoanPaymentRow {
    id: string;
    loan_id: string;
    amount: number | string;
    date: string;
    created_at?: string;
}

export interface LoanRow {
    id: string;
    name: string;
    total_amount: number | string;
    interest_rate: number | string;
    due_date?: string | null;
    payment_method_id?: string | null;
    created_at?: string;
    user_id: string;
    type?: 'borrowed' | 'lent' | string;
    loan_payments?: LoanPaymentRow[];
    is_disbursed?: boolean;
    installments?: number | null;
}

export interface FutureExpense {
    id: string;
    payment_date: string;
    amount: number;
    description: string;
    category_id: string | null;
    status: 'pending' | 'paid';
    is_subscription?: boolean;
    payment_day?: number;
    start_date?: string;
    end_date?: string;
    frequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly';
    user_id: string;
    created_at?: string;
}

export interface FinanceContextState {
    transactions: Transaction[];
    allTransactions: Transaction[];
    budgets: Budget[];
    paymentMethods: PaymentMethod[];
    loans: Loan[];
    futureExpenses: FutureExpense[];
    loading: boolean;
    summary: {
        totalIncome: number;
        totalExpenses: number;
        totalSavings: number;
        totalInvestments: number;
        netWorth: number;
        currency: string;
    };
    filteredSummary: {
        totalIncome: number;
        totalExpenses: number;
        totalSavings: number;
        totalInvestments: number;
        netWorth: number;
        currency: string;
    };
    expensesByCategory: { category: string; category_id: string | null; amount: number }[];
    insights: Insight[];
    yieldStatistics: any;
    currency: string;
    decimalPlaces: number;
    onboardingDecision: 'pending' | 'from_scratch' | 'imported' | null;
    hasPendingImport: boolean;
    welcomeCompleted: boolean;
    importProgress: {
        status: 'idle' | 'loading' | 'completed' | 'failed' | 'cancelled';
        progress: number;
        message: string;
        recordsProcessed?: number;
        error?: string;
    };
    pendingImportData: Omit<Transaction, 'id'>[];
    addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<{ error: any }>;
    addTransactionsBulk: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error: any; count: number }>;
    deleteTransaction: (id: string) => Promise<void>;
    addPaymentMethod: (pm: Omit<PaymentMethod, 'id'>) => Promise<{ error: any; data?: any }>;
    updatePaymentMethod: (id: string, pm: Partial<PaymentMethod>) => Promise<{ error: any; data?: any }>;
    deletePaymentMethod: (id: string) => Promise<void>;
    addTransfer: (fromId: string, toId: string, amount: number, description: string, date: string) => Promise<{ error: any }>;
    updateProfile: (updates: any) => Promise<{ error: any }>;
    convertCurrency: (rate: number, newCurrency: string, dryRun?: boolean) => Promise<{ error: any; preview?: { payment_methods: any; transactions: any } }>;
    setOnboardingDecision: (decision: any) => any;
    highlightedCard: 'categories' | 'payment-methods' | null;
    setHighlightedCard: (card: 'categories' | 'payment-methods' | null) => void;
    confirmPendingImport: () => Promise<{ error: any }>;
    startImport: (data: any[]) => void;
    cancelImport: () => Promise<void>;
    confirmImportData: () => Promise<{ error: any }>;
    addBudget: (budget: any) => Promise<{ error: any }>;
    deleteBudget: (id: string) => Promise<void>;
    refreshData: () => Promise<void> | void;
    categories: CategoryItem[];
    addCategory: (category: any) => Promise<{ error: any; data?: any }>;
    updateCategory: (id: string, category: any) => Promise<{ error: any; data?: any }>;
    deleteCategory: (id: string) => Promise<void>;
    updateTransaction: (id: string, updates: any) => Promise<{ error: any; data?: any }>;
    orphanedTransactions: Transaction[];
    dateFilter: any;
    sortConfig: any;
    setSortConfig: (config: any) => void;
    loadMore: () => void;
    updateFilter: (period: string, from?: string | null, to?: string | null) => void;
    hasMore: boolean;
    rangeTransactions: Transaction[];
    totalTransactionsCount: number;
    totalBudget: number;
    totalSpentCurrentMonth: number;
    resetProfileData: () => Promise<{ error: any }>;
    lastUpdated: Date | null;
    updateCategoryGoal: (id: string, goal: number) => Promise<{ error: any }>;
    baseColor: string;
    themeVars: Record<string, string>;
    themeOptions: { label: string; hex: string }[];
    setAppThemePreference: (color: string) => Promise<any> | any;
}
