import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { TotalBudgetState } from "@/hooks/useBudgetsData";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useFinance } from "@/contexts/FinanceContext";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { isSameMonth, isSameYear, subMonths, isAfter, isBefore, startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns';

interface BudgetTotalCardProps {
    totalBudget?: TotalBudgetState; // Made optional as we might calculate it internally
}

export function BudgetTotalCard({ totalBudget: propsTotalBudget }: BudgetTotalCardProps) {
    const { allTransactions, budgets, dateFilter, categories } = useFinanceData();
    const { formatCurrency } = useFormatCurrency();
    const { currency } = useFinance();

    // 1. Determine Date Range from Global Filter or fallback to Current Month
    const now = new Date();
    const currentYear = dateFilter.period === 'year' && dateFilter.from ? new Date(dateFilter.from).getFullYear() : now.getFullYear();
    const currentMonth = dateFilter.period === 'month' && dateFilter.from ? new Date(dateFilter.from).getMonth() : now.getMonth();

    // Check if we are filtering by a specific month
    const isMonthlyFilter = dateFilter.period === 'month';
    const isYearlyFilter = dateFilter.period === 'year';

    // 2. Filter Transactions for Current Period
    const currentTransactions = allTransactions.filter(t => {
        const d = new Date(t.date);
        if (isMonthlyFilter) {
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }
        if (isYearlyFilter) {
            return d.getFullYear() === currentYear;
        }
        return true; // If 'all', show everything? Or default to current month? Let's default to current month if 'all' isn't explicitly handling history. 
        // Actually for "all", usually we want total history. But "Monthly Health" implies a month view.
        // Let's stick to the filter logic: if specific filter, use it. If not, maybe use current month as default for "Monthly Health"?
        // The request says "Sale de Header de la app". 
    });

    // 3. Calculate Income and Expenses
    const income = currentTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    // 4. Calculate Budget (active budgets for the period)
    // If filtering by month, we use the monthly budget amount.
    // Logic: Budget is per category. Sum of all category budgets.
    // If year, sum * 12? Or sum of budgets for that year?
    // For now, let's assume budgets are monthly values.
    const totalBudgetAmount = budgets.reduce((sum, b) => {
        // If budget has a specific month assigned, check if it matches.
        // If budget is recurring (no specific month or applies to all), include it.
        // Our current budget model in useBudgetsData seems to be "monthly" by default.
        // Let's check the Budget interface again. It has 'month' string YYYY-MM.
        if (b.month) {
            const bDate = new Date(b.month + '-01'); // Ensure day is 1st to avoid timezone shifts
            if (isMonthlyFilter) {
                // Check if matches selected month/year
                if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
                    return sum + b.amount;
                }
                return sum;
            }
            if (isYearlyFilter) {
                // Check if matches selected year
                if (bDate.getFullYear() === currentYear) {
                    return sum + b.amount;
                }
                return sum;
            }
            // Valid for "all" or other views?
        }
        // If budget has no month (generic?), include it? (Model implies budgets are monthly entries)
        // If we have "generic" budgets, we add them once per month?
        return sum; // Assume budgets are strictly monthly records in DB based on previous analysis
    }, 0);

    // If totalBudgetAmount is 0 (no budgets found for this month), maybe use the props as fallback?
    // But props depend on useBudgetsData which might have its own state.
    // Let's rely on our calculation to be consistent with the filter.

    const remaining = totalBudgetAmount - expenses;
    const percentage = totalBudgetAmount > 0 ? (expenses / totalBudgetAmount) * 100 : 0;

    // 5. Trend Calculation (Same day previous month)
    // Only makes sense for Monthly view
    let trendLabel = "";
    let trendIcon = null;
    let trendColor = "";

    if (isMonthlyFilter) {
        const prevMonthDate = subMonths(new Date(currentYear, currentMonth, 1), 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();

        // Define "Same Day" limit. If looking at past months, it's full month. 
        // If looking at current month, it's up to today.
        const isCurrentActiveMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();
        const maxDay = isCurrentActiveMonth ? now.getDate() : 31; // Compare up to 31st (full month) if past

        const prevTransactions = allTransactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === prevMonth &&
                d.getFullYear() === prevYear &&
                d.getDate() <= maxDay &&
                t.type === 'expense';
        });

        const prevExpenses = prevTransactions.reduce((sum, t) => sum + t.amount, 0);

        if (prevExpenses > 0) {
            const diff = expenses - prevExpenses;
            const diffPercent = (Math.abs(diff) / prevExpenses) * 100;

            if (diff > 0) {
                trendLabel = `${diffPercent.toFixed(0)}% más que el mes pasado`;
                trendIcon = <TrendingUp className="h-4 w-4" />;
                trendColor = "text-red-500"; // Spending more is usually bad
            } else if (diff < 0) {
                trendLabel = `${diffPercent.toFixed(0)}% menos que el mes pasado`;
                trendIcon = <TrendingDown className="h-4 w-4" />;
                trendColor = "text-emerald-500"; // Spending less is good
            } else {
                trendLabel = "Igual que el mes pasado";
                trendIcon = <Minus className="h-4 w-4" />;
                trendColor = "text-muted-foreground";
            }
        } else {
            trendLabel = "Sin datos previos";
            trendColor = "text-muted-foreground";
        }
    }

    // Colors
    const isOverBudget = expenses > totalBudgetAmount;
    const isHighUsage = percentage >= 90 && !isOverBudget; // Amber

    const progressColorClass = isOverBudget
        ? "bg-destructive"
        : isHighUsage
            ? "bg-amber-500"
            : "bg-primary"; // Default gradient handling via class? Or simpler color.

    // For gradient "from-primary to-primary/60", we can use style or specific utility.
    // The Progress component usually takes a class for the indicator.
    // If we want gradient on the indicator, we might need a custom class or style.
    // Let's use a solid color matching the requirements for now, or use `bg-gradient-to-r` if supported by the component.
    // ShadCN Progress `indicatorClassName` prop supports this.

    const gradientClass = isOverBudget
        ? "bg-destructive" // Solid red
        : isHighUsage
            ? "bg-amber-500" // Solid amber
            : "bg-gradient-to-r from-primary to-primary/60"; // Gradient blue/primary

    return (
        <Card className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-foreground/90 flex justify-between items-center">
                    <span>Salud Financiera Mensual</span>
                    {trendLabel && (
                        <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-background/50 border border-border/50", trendColor)}>
                            {trendIcon}
                            <span>{trendLabel}</span>
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Main Progress Section */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-3xl font-bold tracking-tight">
                                {percentage.toFixed(0)}%
                            </span>
                            <span className="text-sm text-muted-foreground ml-2 font-medium">ejecutado</span>
                        </div>
                        {/* Optionally show remaining percentage or other info */}
                    </div>

                    <Progress
                        value={Math.min(percentage, 100)}
                        className="h-2 w-full bg-secondary/50"
                        indicatorClassName={cn("transition-all duration-500", gradientClass)}
                    />
                </div>

                {/* Triple Column Metadata */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ingresos</span>
                        <span className="text-sm sm:text-base font-semibold text-emerald-500 truncate" title={formatCurrency(income)}>
                            {formatCurrency(income)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 border-l border-border/50 pl-4">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gastos</span>
                        <span className="text-sm sm:text-base font-semibold text-destructive truncate" title={formatCurrency(expenses)}>
                            {formatCurrency(expenses)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 border-l border-border/50 pl-4">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Restante</span>
                        <span className={cn(
                            "text-sm sm:text-base font-semibold truncate",
                            remaining < 0 ? "text-destructive" : "text-primary"
                        )} title={formatCurrency(remaining)}>
                            {formatCurrency(remaining)}
                        </span>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
