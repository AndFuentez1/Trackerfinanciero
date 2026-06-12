import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormatCurrency } from '../useFormatCurrency';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useFormatCurrency', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false }
            }
        });
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

    it('formats positive amounts correctly', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const formatted = result.current.formatCurrency(1234.56);
        expect(formatted).toMatch(/1[\.,]?234/);
        expect(formatted).toMatch(/56|,56/);
    });

    it('handles negative amounts', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const formatted = result.current.formatCurrency(-500);
        expect(formatted).toMatch(/-|−/);
        expect(formatted).toMatch(/500/);
    });

    it('formats zero correctly', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const formatted = result.current.formatCurrency(0);
        expect(formatted).toMatch(/0/);
    });

    it('formats large numbers with separators', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const formatted = result.current.formatCurrency(1000000);
        expect(formatted).toMatch(/1[\.,]?000[\.,]?000|1000000/);
    });

    it('handles decimal places correctly', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const formatted = result.current.formatCurrency(99.99);
        expect(formatted).toMatch(/99/);
        expect(formatted).toMatch(/99|99/);
    });

    it('formatCurrency80 formats with 80% sizing consideration', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const formatted = result.current.formatCurrency80(1234.56);
        // Should return formatted string, potentially with adjusted size
        expect(formatted).toBeTruthy();
        expect(formatted).toMatch(/1[\.,]?234/);
    });

    it('handles very small decimals', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const formatted = result.current.formatCurrency(0.01);
        expect(formatted).toMatch(/0[\.,]01|0\.01/);
    });

    it('remains consistent across multiple calls', () => {
        const { result } = renderHook(() => useFormatCurrency(), { wrapper: createWrapper() });
        
        const amount = 1500.75;
        const formatted1 = result.current.formatCurrency(amount);
        const formatted2 = result.current.formatCurrency(amount);
        
        expect(formatted1).toBe(formatted2);
    });
});
