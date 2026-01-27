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
import { PageHeader } from '@/components/layout/PageHeader';

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

    if (isLoading) {
        return <SkeletonLoader tab="savings" fullPage withLayoutWrapper />;
    }

    if (!user) return null;

    const currentEditingPM = paymentMethods.find(pm => pm.id === editingAccount);

    return (
        <div className="min-h-screen bg-background/30">
            <main className="container max-w-6xl mx-auto px-4 py-8">
                <PageHeader
                    title="Ahorros e Inversiones"
                    description="Gestiona tus metas de ahorro y cuentas de inversión"
                    icon={<Wallet className="h-6 w-6" />}
                />
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
