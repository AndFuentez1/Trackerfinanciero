import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSEO } from '@/shared/hooks/useSEO';
import type { PaymentMethod } from '@/features/finance/hooks/useFinanceData';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useSavingsData } from '@/features/finance/hooks/useSavingsData';
import { SavingsPerformance } from '@/features/finance/savings/components/SavingsPerformance';
import { EditPaymentMethodDialog } from '@/features/finance/payment-methods/components/EditPaymentMethodDialog';
import { SkeletonLoader, StandardHeaderSkeleton, CardSkeleton, PulseBlock, SavingsSkeleton } from '@/shared/components/skeletons/SkeletonLoader';
import { Wallet, LogOut, PiggyBank } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useState } from 'react';
// import { Sidebar } from '@/components/Sidebar'; // Removed to fix double sidebar

export default function SavingsPage() {
    useSEO({
        title: 'Ahorros',
        description: 'Seguimiento de tus metas y cuentas de ahorro.'
    });
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

    if (!user && !isLoading) { return null; }

    if (savingsError && savingsAccounts.length === 0 && !isLoading) {
        return (
            <div className="min-h-screen bg-background/30">
                <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="container max-w-6xl mx-auto px-4 py-4">
                        <h1 className="text-lg sm:text-xl font-semibold">Ahorros</h1>
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
            <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
                {isLoading ? (
                    <SkeletonLoader tab="savings" withLayoutWrapper={true} fullPage={false} />
                ) : (
                    <>
                        <header className="border-b border-border pb-8">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex items-start gap-3 w-full md:w-auto">
                                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                                        <PiggyBank className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Ahorros</h1>
                                        <p className="text-muted-foreground font-medium mt-[-6px] leading-none text-sm">Metas y seguimiento de ahorros</p>
                                    </div>
                                </div>
                            </div>
                        </header>
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
