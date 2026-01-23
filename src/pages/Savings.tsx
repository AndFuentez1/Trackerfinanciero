import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useSavingsData } from '@/hooks/useSavingsData';
import { SavingsPerformance } from '@/components/finance/SavingsPerformance';
import { EditPaymentMethodDialog } from '@/components/finance/EditPaymentMethodDialog';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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

    const handleUpdatePaymentMethod = async (id: string, updates: any) => {
        const result = await updatePaymentMethod(id, updates);
        // Refetch savings accounts in case is_savings_account changed
        if (!result?.error) {
            await refetch();
        }
        return result;
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

    const currentEditingPM = paymentMethods.find(pm => pm.id === editingAccount);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/50 bg-[#F4F5F7]/50 backdrop-blur-sm sticky top-0 z-10">
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
