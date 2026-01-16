import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useSavingsData } from '@/hooks/useSavingsData';
import { SavingsPerformance } from '@/components/finance/SavingsPerformance';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SavingsPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const {
        loading: dataLoading,
        addTransfer,
    } = useFinanceData();
    const {
        savingsAccounts,
        savingsTransactions,
        loading: savingsLoading,
        addSavingsAccount,
        deleteSavingsAccount,
        addSavingsTransaction,
        updateSavingsTransaction,
        updateSavingsTransactionFull,
        deleteSavingsTransaction,
        accountPerformance,
        totalSavingsBalance,
        refetch
    } = useSavingsData();

    const handleDeleteTransaction = async (id: string) => {
        await deleteSavingsTransaction(id);
    };

    const isLoading = authLoading || dataLoading || savingsLoading;

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Cargando...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-semibold">Ahorros</h1>
                    </div>
                </div>
            </header>

            <main className="container max-w-6xl mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
                    </div>
                ) : (
                    <SavingsPerformance
                        accounts={savingsAccounts}
                        accountPerformance={accountPerformance}
                        transactions={savingsTransactions}
                        totalBalance={totalSavingsBalance}
                        onAddAccount={addSavingsAccount}
                        onDeleteAccount={deleteSavingsAccount}
                        onAddTransaction={addSavingsTransaction}
                        onUpdateTransactionAmount={updateSavingsTransaction}
                        onUpdateTransactionFull={updateSavingsTransactionFull}
                        onAddTransfer={addTransfer}
                        onDeleteTransaction={handleDeleteTransaction}
                    />
                )}
            </main>
        </div>
    );
}
