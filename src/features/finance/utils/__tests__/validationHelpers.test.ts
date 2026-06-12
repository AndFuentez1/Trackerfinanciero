import { describe, it, expect } from 'vitest';

/**
 * Tests for Finance Validation Utilities
 * Covers input validation, data transformation, and error handling
 */

describe('Finance Validation Utilities', () => {
    // Helper function tests
    describe('Amount Validation', () => {
        const validateAmount = (amount: any): boolean => {
            if (typeof amount !== 'number') return false;
            if (amount < 0) return false;
            if (!isFinite(amount)) return false;
            return true;
        };

        it('accepts positive numbers', () => {
            expect(validateAmount(100)).toBe(true);
            expect(validateAmount(0.01)).toBe(true);
            expect(validateAmount(1000000)).toBe(true);
        });

        it('rejects negative numbers', () => {
            expect(validateAmount(-100)).toBe(false);
        });

        it('rejects non-numeric values', () => {
            expect(validateAmount('100')).toBe(false);
            expect(validateAmount(null)).toBe(false);
            expect(validateAmount(undefined)).toBe(false);
        });

        it('rejects infinite and NaN values', () => {
            expect(validateAmount(Infinity)).toBe(false);
            expect(validateAmount(NaN)).toBe(false);
        });
    });

    describe('Date Validation', () => {
        const validateDate = (date: any): boolean => {
            if (typeof date !== 'string') return false;
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(date)) return false;
            const d = new Date(date);
            return d instanceof Date && !isNaN(d.getTime());
        };

        it('accepts valid ISO date strings', () => {
            expect(validateDate('2024-01-15')).toBe(true);
            expect(validateDate('2024-12-31')).toBe(true);
        });

        it('rejects invalid formats', () => {
            expect(validateDate('2024-1-15')).toBe(false);
            expect(validateDate('01/15/2024')).toBe(false);
            expect(validateDate('15-01-2024')).toBe(false);
        });

        it('rejects non-string dates', () => {
            expect(validateDate(new Date())).toBe(false);
            expect(validateDate(1234567890)).toBe(false);
        });
    });

    describe('Category Validation', () => {
        const validateCategory = (cat: any): boolean => {
            if (typeof cat !== 'string') return false;
            if (cat.trim().length === 0) return false;
            if (cat.length > 50) return false;
            return true;
        };

        it('accepts valid category names', () => {
            expect(validateCategory('Groceries')).toBe(true);
            expect(validateCategory('Transportation')).toBe(true);
        });

        it('rejects empty strings', () => {
            expect(validateCategory('')).toBe(false);
            expect(validateCategory('   ')).toBe(false);
        });

        it('rejects overly long strings', () => {
            const longString = 'a'.repeat(51);
            expect(validateCategory(longString)).toBe(false);
        });
    });

    describe('Currency Code Validation', () => {
        const validateCurrencyCode = (code: any): boolean => {
            if (typeof code !== 'string') return false;
            const regex = /^[A-Z]{3}$/;
            return regex.test(code);
        };

        it('accepts valid 3-letter currency codes', () => {
            expect(validateCurrencyCode('USD')).toBe(true);
            expect(validateCurrencyCode('EUR')).toBe(true);
            expect(validateCurrencyCode('COP')).toBe(true);
        });

        it('rejects invalid formats', () => {
            expect(validateCurrencyCode('US')).toBe(false);
            expect(validateCurrencyCode('USDA')).toBe(false);
            expect(validateCurrencyCode('usd')).toBe(false);
        });
    });
});

describe('Payment Method Validation', () => {
    const validatePaymentMethod = (pm: any): boolean => {
        if (!pm || typeof pm !== 'object') return false;
        if (typeof pm.name !== 'string' || pm.name.trim().length === 0) return false;
        if (typeof pm.balance !== 'number' || pm.balance < 0) return false;
        if (!['cash', 'credit_card', 'debit_card', 'savings_account'].includes(pm.type)) return false;
        return true;
    };

    it('validates complete payment method objects', () => {
        const validPm = {
            name: 'Credit Card',
            balance: 1000,
            type: 'credit_card'
        };
        expect(validatePaymentMethod(validPm)).toBe(true);
    });

    it('rejects invalid balance', () => {
        const invalidPm = {
            name: 'Credit Card',
            balance: -100,
            type: 'credit_card'
        };
        expect(validatePaymentMethod(invalidPm)).toBe(false);
    });

    it('rejects invalid type', () => {
        const invalidPm = {
            name: 'Credit Card',
            balance: 1000,
            type: 'invalid_type'
        };
        expect(validatePaymentMethod(invalidPm)).toBe(false);
    });
});

describe('Budget Validation', () => {
    const validateBudget = (budget: any): boolean => {
        if (!budget || typeof budget !== 'object') return false;
        if (typeof budget.amount !== 'number' || budget.amount <= 0) return false;
        if (typeof budget.month !== 'string' || !/^\d{4}-\d{2}$/.test(budget.month)) return false;
        if (!budget.category_id) return false;
        return true;
    };

    it('validates complete budget objects', () => {
        const validBudget = {
            amount: 500,
            month: '2024-01',
            category_id: 'c1'
        };
        expect(validateBudget(validBudget)).toBe(true);
    });

    it('rejects zero or negative amounts', () => {
        const invalidBudget = {
            amount: 0,
            month: '2024-01',
            category_id: 'c1'
        };
        expect(validateBudget(invalidBudget)).toBe(false);
    });

    it('rejects invalid month format', () => {
        const invalidBudget = {
            amount: 500,
            month: '2024-1',
            category_id: 'c1'
        };
        expect(validateBudget(invalidBudget)).toBe(false);
    });
});
