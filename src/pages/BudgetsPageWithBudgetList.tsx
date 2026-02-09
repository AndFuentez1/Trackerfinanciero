import { BudgetList } from '@/features/finance/budgets/components/BudgetList';
// ...existing code...

export default function BudgetsPage() {
  // ...existing code...
  return (
    <div className="min-h-screen bg-background/30">
      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ...existing code... */}
        <div className="my-8">
          <BudgetList budgets={budgets} onDelete={saveBudget} onSave={saveBudget} categories={categories} />
        </div>
        {/* ...existing code... */}
      </main>
    </div>
  );
}

