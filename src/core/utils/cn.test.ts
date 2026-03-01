import { describe, it, expect } from 'vitest';
import { cn, getCurrencySymbol, formatCurrency, formatCurrencyCompact, formatCurrencySmall } from './cn';
import React from 'react';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
    expect(cn('p-4 p-2')).toBe('p-2');
    expect(cn('bg-red-500', { 'text-white': true })).toBe('bg-red-500 text-white');
  });
});

describe('currency formatter utils', () => {
  it('getCurrencySymbol returns correct symbol', () => {
    expect(getCurrencySymbol('COP')).toBe('COP');
    // Fallback if not mapped
    expect(getCurrencySymbol('UNKNOWN')).toBe('UNKNOWN');
  });

  it('formatCurrency formats correctly', () => {
    const formatted = formatCurrency(1500.5, 2, 'USD');
    // Using string matching to avoid locale dependencies issues
    expect(formatted).toContain('$');
    expect(formatted).toContain('1');
    expect(formatted).toContain('500');
  });

  it('formatCurrencyCompact formats k and M', () => {
    expect(formatCurrencyCompact(500)).toBe('COP500');
    expect(formatCurrencyCompact(1500)).toContain('k');
    expect(formatCurrencyCompact(1500000)).toContain('M'); 
    expect(formatCurrencyCompact(1000)).toBe('COP1k');
    expect(formatCurrencyCompact(1000000)).toBe('COP1M');
    expect(formatCurrencyCompact(-1500000)).toContain('M'); 
  });

  it('formatCurrencySmall returns ReactNode with decimals', () => {
    const node = formatCurrencySmall(1500.5, 2, 'COP') as any;
    expect(node).toBeTruthy();
    if (typeof node === 'object' && node.type) {
        expect(node.type).toBe('span');
        expect(node.props.children.length).toBeGreaterThan(0);
    }
  });

  it('formatCurrencySmall handles 0 decimals with string fallback', () => {
    const stringVal = formatCurrencySmall(1500, 0, 'COP');
    expect(typeof stringVal).toBe('string');
  });
});
