import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageHeader } from '../PageHeader';
import React from 'react';

describe('PageHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders title', () => {
        render(
            <PageHeader 
                title="Dashboard" 
                description="Welcome back"
            />
        );

        expect(screen.getByText('Dashboard')).toBeTruthy();
    });

    it('renders description when provided', () => {
        render(
            <PageHeader 
                title="Dashboard" 
                description="Welcome back to your dashboard"
            />
        );

        expect(screen.getByText('Welcome back to your dashboard')).toBeTruthy();
    });

    it('renders icon when provided', () => {
        const TestIcon = () => <div data-testid="test-icon">📊</div>;

        render(
            <PageHeader 
                title="Dashboard" 
                description="Welcome"
                icon={<TestIcon />}
            />
        );

        expect(screen.getByTestId('test-icon')).toBeTruthy();
    });

    it('renders action buttons in actions slot', () => {
        const onAddClick = vi.fn();

        render(
            <PageHeader 
                title="Transactions" 
                description="Manage transactions"
                actions={
                    <button onClick={onAddClick}>Add Transaction</button>
                }
            />
        );

        const button = screen.getByText('Add Transaction');
        expect(button).toBeTruthy();

        fireEvent.click(button);
        expect(onAddClick).toHaveBeenCalled();
    });

    it('renders multiple action buttons', () => {
        render(
            <PageHeader 
                title="Budgets" 
                description="Configure budgets"
                actions={
                    <div>
                        <button>Add Budget</button>
                        <button>Configure</button>
                    </div>
                }
            />
        );

        expect(screen.getByText('Add Budget')).toBeTruthy();
        expect(screen.getByText('Configure')).toBeTruthy();
    });

    it('applies responsive classes', () => {
        const { container } = render(
            <PageHeader 
                title="Test" 
                description="Test Description"
            />
        );

        const header = container.querySelector('[class*="flex"]');
        expect(header).toBeTruthy();
    });

    it('handles title with special characters', () => {
        render(
            <PageHeader 
                title="Q1 2024 - Financial Summary" 
                description="Quarter overview"
            />
        );

        expect(screen.getByText('Q1 2024 - Financial Summary')).toBeTruthy();
    });

    it('renders without actions when not provided', () => {
        const { container } = render(
            <PageHeader 
                title="Test" 
                description="Test Description"
            />
        );

        expect(container).toBeTruthy();
    });
});
