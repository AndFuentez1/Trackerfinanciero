
export const queryKeys = {
    user: {
        all: ['user'] as const,
        config: (userId: string) => [...queryKeys.user.all, 'config', userId] as const,
    },
    finance: {
        all: ['finance'] as const,
        allTransactions: (userId: string) => [...queryKeys.finance.all, 'allTransactions', userId] as const,
        transactions: (userId: string) => [...queryKeys.finance.all, 'transactions', userId] as const,
        transactionsFiltered: (userId: string, filters: Record<string, any>) => [...queryKeys.finance.transactions(userId), filters] as const,
        budgets: (userId: string) => [...queryKeys.finance.all, 'budgets', userId] as const,
        paymentMethods: (userId: string) => [...queryKeys.finance.all, 'paymentMethods', userId] as const,
        categories: (userId: string) => [...queryKeys.finance.all, 'categories', userId] as const,
        futureExpenses: (userId: string) => [...queryKeys.finance.all, 'futureExpenses', userId] as const,
        profile: (userId: string) => [...queryKeys.finance.all, 'profile', userId] as const,
        pendingInvoices: (userId: string) => [...queryKeys.finance.all, 'pendingInvoices', userId] as const,
        stagingTransactions: (userId: string) => [...queryKeys.finance.all, 'stagingTransactions', userId] as const,
    },
    savings: {
        all: ['savings'] as const,
        accounts: (userId: string) => [...queryKeys.savings.all, 'accounts', userId] as const,
    },
    loans: {
        all: ['loans'] as const,
        list: (userId: string) => [...queryKeys.loans.all, 'list', userId] as const,
    }
};
