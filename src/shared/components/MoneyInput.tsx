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

        // Format a number to "1.000.000,00" or similar
        const formatValue = (val: number, isBlur = false) => {
            if (val === 0 && !isBlur) return ''; // Empty if 0 while typing (optional, maybe keep 0?)
            if (isNaN(val)) return '';

            // Use Intl for standard formatting then swap if needed or custom implementation
            // Simplest for "1.000,00" (ES-CO style)
            // We can use toLocaleString but strict control is better for input

            const parts = val.toFixed(activeDecimals).split('.');
            const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

            // If activeDecimals is 0, just integer
            if (activeDecimals === 0) return integerPart;

            const decimalPart = parts[1];
            return `${integerPart},${decimalPart}`;
        };

        // Initialize/Sync display value when prop value changes externally
        useEffect(() => {
            // Only update if the parsed value of current display doesn't match the new prop value
            // This prevents cursor jumping or re-formatting while typing if not needed?
            // Actually, strictly controlled inputs usually re-format on blur. 
            // For 'MoneyInput', usually we want to see the dots AS WE TYPE ideally, 
            // but that's complex.

            // Strategy:
            // 1. On Blur: Strict Format
            // 2. On Focus/Type: Allow loose typing but add dots dynamically if simple integer

            // Let's stick to: "Update displayValue only if formatted prop value !== current display value simplified"
            // But doing direct comparison is tricky due to "1000," vs "1000".

            // Simplest robust way: 
            // If the 'value' prop changes, we verify if our current internal 'displayValue' 
            // represents that number. If yes, don't touch it (preserves "1,50" vs "1,5").
            // If no, update it.

            const internalAsNumber = parseCurrencyString(displayValue);
            if (internalAsNumber !== value) {
                // If completely different, reset to formatted.
                if (value === 0 && displayValue === '') return; // Keep empty if 0
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
            let raw = e.target.value;

            // Allow only numbers, dots, commas
            if (!/^[\d.,]*$/.test(raw)) return;

            // Prevent multiple commas
            if ((raw.match(/,/g) || []).length > 1) return;

            // Handle simple formatting while typing (optional, often better to just allow raw digits + comma)
            // Here we will just let user type and only add dots on Blur to avoid checking cursor position hell.
            // OR: Minimal auto-dots: 

            // Let's revert to simple input Logic:
            // Just Update display, parse, send to Parent.

            setDisplayValue(raw);
            onChange(parseCurrencyString(raw));
        };

        const handleBlur = () => {
            const parsed = parseCurrencyString(displayValue);
            // Re-format nicely on blur
            if (parsed === 0) setDisplayValue('');
            else setDisplayValue(formatValue(parsed, true));
        };

        // Auto-formatting helper while typing (Naïve approach: formatting only integer part if no comma)
        // To make it feel "Premium", we really want real-time dots.
        // But real-time dots move the cursor. 
        // Implementation for Real-Time Dots without cursor jumping is heavy.
        // Let's stick to "Format on Blur" + "Simple Digits/Comma while typing" for safety first.
        // Wait, user asked for "agregar los puntos de miles para una mejor visualizacion".
        // Usually means while typing OR at least showing it clearly. 
        // The previous implementation in AddTransactionDialog WAS changing it while typing but ignoring cursor.
        // Let's try to improve that: Format INTEGER part while typing if possible.

        // Improved HandleChange for dots:
        const handleChangeWithDots = (e: React.ChangeEvent<HTMLInputElement>) => {
            let val = e.target.value;

            // Remove invalid chars
            if (!/^[\d.,]*$/.test(val)) return;

            // Handle multiple commas
            if ((val.match(/,/g) || []).length > 1) return;

            // Split into integer and decimal parts
            const parts = val.split(',');

            // Clean integer part (remove dots and non-digits)
            const cleanInteger = parts[0].replace(/\D/g, '');

            // Format integer part with thousands separators
            const formattedInteger = cleanInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

            let finalDisplay = formattedInteger;

            // If comma exists, append it and the decimal part
            if (val.includes(',')) {
                // If there's a second part (decimals), append it. If not, just append comma.
                finalDisplay += ',' + (parts[1] || '');
            }

            setDisplayValue(finalDisplay);

            // Calculate numeric value for parent
            const numericString = cleanInteger + '.' + (parts[1] || '0');
            const num = parseFloat(numericString);
            onChange(isNaN(num) ? 0 : num);
        };

        return (
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
        );
    }
);

MoneyInput.displayName = 'MoneyInput';


