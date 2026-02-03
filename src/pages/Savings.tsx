import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useSavingsData } from '@/hooks/useSavingsData';
import { SavingsPerformance } from '@/features/savings/components/SavingsPerformance';
import { EditPaymentMethodDialog } from '@/features/payment-methods/components/EditPaymentMethodDialog';
import { SkeletonLoader } from '@/components/common/skeletons/SkeletonLoader';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
// import { Sidebar } from '@/components/Sidebar'; // Removed to fix double sidebar

export default function SavingsPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const {
        loading: dataLoading,
        addTransfer,
        paymentMethods,
        updatePaymentMethod,
    } = useFinanceData();
    const {
        savingsAccounts,
        savingsTransactions,
        loading: savingsLoading,
        error: savingsError,
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

    const [editingAccount, setEditingAccount] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleEditAccount = (accountId: string) => {
        setEditingAccount(accountId);
        setIsEditDialogOpen(true);
    };

    const handleCloseEditDialog = (open: boolean) => {
        setIsEditDialogOpen(open);
        if (!open) {
            setEditingAccount(null);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        await deleteSavingsTransaction(id);
    };

    const handleUpdatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
        const result = await updatePaymentMethod(id, updates);
        // Refetch savings accounts in case is_savings_account changed
        if (!result?.error) {
            await refetch();
        }
        return result;
    };

    const isLoading = authLoading || dataLoading || savingsLoading;

    if (isLoading) {
        return <SkeletonLoader tab="savings" fullPage withLayoutWrapper />;
    }

    if (!user) return null;

    if (savingsError && savingsAccounts.length === 0) {
        return (
            <div className="min-h-screen bg-background/30">
                <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="container max-w-6xl mx-auto px-4 py-4">
                        <h1 className="text-xl font-semibold">Ahorros</h1>
                    </div>
                </header>
                <main className="container max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-full bg-destructive/10 p-4">
                        <Wallet className="h-12 w-12 text-destructive" />
                    </div>
                    <p className="text-muted-foreground max-w-md">{savingsError}</p>
                    <Button onClick={() => refetch()}>Reintentar</Button>
                </main>
            </div>
        );
    }

    const currentEditingPM = paymentMethods.find(pm => pm.id === editingAccount);

    return (
        <div className="min-h-screen bg-background/30">
            <main className="container max-w-6xl mx-auto px-4 py-8">
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 border-b border-border/40 pb-6">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">Ahorros</h1>
                            <p className="text-muted-foreground font-medium">Metas y seguimiento de ahorros</p>
                        </div>
                    </div>
                </header>
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
                    </div>
                ) : (
                    <>
                        <SavingsPerformance
                            accounts={savingsAccounts}
                            accountPerformance={accountPerformance}
                            transactions={savingsTransactions}
                            totalBalance={totalSavingsBalance}
                            onAddAccount={addSavingsAccount}
                            onDeleteAccount={deleteSavingsAccount}
                            onEdit={handleEditAccount}
                            onAddTransaction={addSavingsTransaction}
                            onUpdateTransactionAmount={updateSavingsTransaction}
                            onUpdateTransactionFull={updateSavingsTransactionFull}
                            onAddTransfer={addTransfer}
                            onDeleteTransaction={handleDeleteTransaction}
                        />

                        <EditPaymentMethodDialog
                            paymentMethod={currentEditingPM || null}
                            open={isEditDialogOpen}
                            onOpenChange={handleCloseEditDialog}
                            onSave={handleUpdatePaymentMethod}
                            lockType={true}
                        />
                    </>
                )}
            </main>
        </div>
    );
}
