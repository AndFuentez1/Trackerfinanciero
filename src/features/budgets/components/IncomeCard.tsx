import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useBudgetsData } from "@/hooks/useBudgetsData";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { parseISO } from "date-fns";
import { useFinance } from "@/contexts/FinanceContext";
import { CURRENCIES } from "@/hooks/currencyConstants";
import { useDecimalPlaces } from "@/hooks/useDecimalPlaces";
import { ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';

export function IncomeCard() {
    const { transactions, allTransactions } = useFinanceData();
    const { budgetYear, budgetMonth, setBudgetPeriod, availableYears } = useBudgetsData();
    const { currency } = useFormatCurrency();
    const { currency: ctxCurrency } = useFinance();
    const decimalPlaces = useDecimalPlaces();

    // Formateador refinado estilo JP Morgan (Símbolo pequeño, decimales discretos)
    const formatCurrency70 = (value: number) => {
        const currCode = ctxCurrency || currency || 'COP';
        const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;
        const decimals = decimalPlaces;

        const formatted = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currCode,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            currencyDisplay: 'code',
        }).format(Math.abs(value)).replace(currCode, symbol);

        const parts = formatted.split(',');
        const integerPart = parts[0].replace(symbol, '').trim();
        const decimalPart = parts[1];

        return (
            <span className="inline-flex items-baseline font-medium tracking-tight">
                <span className="text-[0.65em] opacity-70 mr-0.5">{symbol}</span>
                <span>{integerPart}</span>
                {decimalPart && <span className="text-[0.65em] opacity-50">,{decimalPart}</span>}
            </span>
        );
    };

    const selectedMonth = budgetMonth === 'all' ? 'all' : (budgetMonth - 1).toString();
    const selectedYear = budgetYear === 'all' ? 'all' : budgetYear.toString();
    const transactionsToFilter = budgetYear === 'all' ? allTransactions : transactions;

    const monthOptions = [
        { value: 'all', label: 'Todo el año' },
        { value: '0', label: 'Enero' }, { value: '1', label: 'Febrero' },
        { value: '2', label: 'Marzo' }, { value: '3', label: 'Abril' },
        { value: '4', label: 'Mayo' }, { value: '5', label: 'Junio' },
        { value: '6', label: 'Julio' }, { value: '7', label: 'Agosto' },
        { value: '8', label: 'Septiembre' }, { value: '9', label: 'Octubre' },
        { value: '10', label: 'Noviembre' }, { value: '11', label: 'Diciembre' },
    ];

    const filteredTransactions = transactionsToFilter.filter(t => {
        const tDate = parseISO(t.date);
        const yearMatch = budgetYear === 'all' || tDate.getFullYear() === budgetYear;
        const monthMatch = budgetMonth === 'all' || (tDate.getMonth() + 1) === budgetMonth;
        return yearMatch && monthMatch;
    });
    
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

    return (
        <Card className="h-full border-none shadow-xl bg-white overflow-hidden flex flex-col">
            {/* Header con Selectores Integrados estilo "Dashboard Ejecutivo" */}
            <div className="p-6 pb-2">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-900 rounded text-white">
                            <Scale className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tighter">Balance de Flujo</h3>
                    </div>
                    <div className="flex gap-2">
                        <Select 
                            value={selectedMonth} 
                            onValueChange={(val) => setBudgetPeriod(budgetYear, val === 'all' ? 'all' : Number(val) + 1)}
                        >
                            <SelectTrigger className="h-8 border-none bg-slate-50 text-[11px] font-bold w-[110px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select 
                            value={selectedYear} 
                            onValueChange={(val) => setBudgetPeriod(val === 'all' ? 'all' : Number(val), budgetMonth)}
                        >
                            <SelectTrigger className="h-8 border-none bg-slate-50 text-[11px] font-bold w-[80px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                                {availableYears.map(year => <SelectItem key={year} value={year.toString()} className="text-xs">{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Gran Total: Flujo Neto */}
                <div className="mb-8 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resultado Neto del Periodo</p>
                    <div className={cn("text-4xl", netFlow >= 0 ? "text-slate-900" : "text-red-600")}>
                        {netFlow < 0 && "-"} {formatCurrency70(netFlow)}
                    </div>
                </div>
            </div>

            <CardContent className="px-6 pb-6 space-y-6 flex-1">
                {/* Comparativa de Barras Proporcionales */}
                <div className="grid grid-cols-2 gap-8 relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-100 -translate-x-1/2" />
                    
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-600 mb-2">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold uppercase">Entradas</span>
                        </div>
                        <div className="text-lg text-slate-900">{formatCurrency70(totalIncome)}</div>
                    </div>

                    <div className="space-y-1 text-right">
                        <div className="flex items-center gap-1.5 text-red-600 mb-2 justify-end">
                            <span className="text-[10px] font-bold uppercase">Salidas</span>
                            <ArrowDownRight className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-lg text-slate-900">{formatCurrency70(totalExpenses)}</div>
                    </div>
                </div>

                {/* Tasa de Ahorro con Estética de "Health Gauge" */}
                <div className="pt-6 border-t border-slate-50">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tasa de Retención</p>
                            <p className="text-2xl font-light text-slate-900">{savingsRate.toFixed(1)}%</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-slate-400 font-medium max-w-[120px] leading-tight">
                                Porcentaje de ingresos que permanecen en tu patrimonio.
                            </p>
                        </div>
                    </div>
                    <Progress 
                        value={Math.max(0, Math.min(savingsRate, 100))} 
                        className="h-1 bg-slate-100" 
                        indicatorClassName={cn(
                            "transition-all duration-1000",
                            savingsRate > 20 ? "bg-emerald-500" : savingsRate > 0 ? "bg-amber-500" : "bg-red-500"
                        )}
                    />
                </div>
                
                {/* Nota de pie estilo Reporte Bancario */}
                <div className="mt-auto bg-slate-50 -mx-6 -mb-6 p-4">
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                        Análisis basado en <span className="font-bold text-slate-700">{filteredTransactions.length} transacciones</span> registradas. 
                        El balance refleja la liquidez neta del periodo seleccionado.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}