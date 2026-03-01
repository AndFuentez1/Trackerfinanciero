import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { Input } from '@/shared/ui/input';
import { cn } from '@/core/utils';
import { useFinance } from '@/features/finance/context/FinanceContext';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number;
    onChange: (value: number) => void;
    currencySymbol?: string;
    decimals?: number;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value, onChange, currencySymbol, decimals, className, placeholder, ...props }, ref) => {
        const { currency, decimalPlaces } = useFinance();
        const activeSymbol = currencySymbol || currency || '$';
        const activeDecimals = decimals ?? decimalPlaces ?? 2;

        // Internal state for the display string to handle intermediate typing states (like "1000,")
        const [displayValue, setDisplayValue] = useState('');
        const [showCommaWarning, setShowCommaWarning] = useState(false);

        // Format a number to "1.000.000,00" or similar
        const formatValue = (val: number, isBlur = false) => {
            if (val === 0 && !isBlur) { return ''; } // Empty if 0 while typing (optional, maybe keep 0?)
            if (isNaN(val)) { return ''; }

            const parts = val.toFixed(activeDecimals).split('.');
            const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

            // If activeDecimals is 0, just integer
            if (activeDecimals === 0) { return integerPart; }

            const decimalPart = parts[1];
            return `${integerPart},${decimalPart}`;
        };

        // Initialize/Sync display value when prop value changes externally
        useEffect(() => {
            const internalAsNumber = parseCurrencyString(displayValue);
            if (internalAsNumber !== value) {
                // If completely different, reset to formatted.
                if (value === 0 && displayValue === '') { return; } // Keep empty if 0
                setDisplayValue(formatValue(value, true));
            }
        }, [value, activeDecimals]);

        const parseCurrencyString = (str: string) => {
            // Remove dots, replace comma with dot
            const clean = str.replace(/\./g, '').replace(/,/g, '.');
            const num = parseFloat(clean);
            return isNaN(num) ? 0 : num;
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;

            // Mostrar el aviso si el usuario escribió un punto y tiene decimales habilitados
            if (raw.includes('.') && activeDecimals > 0) {
                setShowCommaWarning(true);
            } else {
                setShowCommaWarning(false);
            }

            // Allow only numbers, dots, commas
            let cleaned = raw;
            if (!/^[\d.,]*$/.test(cleaned)) { return; }

            // Prevent multiple commas
            if ((cleaned.match(/,/g) || []).length > 1) { return; }

            setDisplayValue(cleaned);
            onChange(parseCurrencyString(cleaned));
        };

        const handleBlur = () => {
            const parsed = parseCurrencyString(displayValue);
            setShowCommaWarning(false);
            setDisplayValue(formatValue(parsed, true));
        };

        // Improved HandleChange for dots:
        const handleChangeWithDots = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;

            // Mostrar el aviso si el usuario escribió un punto y tiene decimales habilitados al final
            if (val.endsWith('.') && activeDecimals > 0) {
                setShowCommaWarning(true);
            } else if (!val.includes('.')) {
                setShowCommaWarning(false);
            }

            // Remove invalid chars
            if (!/^[\d.,]*$/.test(val)) { return; }

            // Handle multiple commas
            if ((val.match(/,/g) || []).length > 1) { return; }

            const parts = val.split(',');
            const cleanInteger = parts[0].replace(/\D/g, '');
            const formattedInteger = cleanInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

            let finalDisplay = formattedInteger;

            if (val.includes(',')) {
                finalDisplay += ',' + (parts[1] || '');
            } else if (val.endsWith('.')) {
                finalDisplay += '.';
            }

            setDisplayValue(finalDisplay);
            onChange(parseCurrencyString(finalDisplay));
        };

        return (
            <div className="space-y-1">
                <div className={cn("relative", className)}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        {activeSymbol}
                    </span>
                    <Input
                        ref={ref}
                        type="text"
                        inputMode="decimal"
                        className="pl-12" // Space for currency symbol
                        value={displayValue}
                        onChange={handleChangeWithDots}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        {...props}
                    />
                </div>
                {showCommaWarning && (
                    <div className="text-xs text-amber-500 font-medium">
                        Usa la coma (,) para los decimales
                    </div>
                )}
            </div>
        );
    }
);

MoneyInput.displayName = 'MoneyInput';


