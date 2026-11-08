import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GmailHistoryDialog } from './GmailHistoryDialog';
import { GmailImportResult } from './GmailHistoryDialog';
import type { ReactNode } from 'react';

type MockProps = { children?: ReactNode; onClick?: () => void };

// Mock the UI components that might cause issues in a test environment
vi.mock('@/shared/ui/dialog', () => ({
    Dialog: ({ children }: MockProps) => <div>{children}</div>,
    DialogContent: ({ children }: MockProps) => <div>{children}</div>,
    DialogHeader: ({ children }: MockProps) => <div>{children}</div>,
    DialogTitle: ({ children }: MockProps) => <div>{children}</div>,
    DialogDescription: ({ children }: MockProps) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/alert-dialog', () => ({
    AlertDialog: ({ children }: MockProps) => <div>{children}</div>,
    AlertDialogContent: ({ children }: MockProps) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: MockProps) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: MockProps) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: MockProps) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: MockProps) => <div>{children}</div>,
    AlertDialogCancel: ({ children }: MockProps) => <button>{children}</button>,
}));

vi.mock('@/shared/ui/button', () => ({
    Button: ({ children, onClick }: MockProps) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/shared/ui/scroll-area', () => ({
    ScrollArea: ({ children }: MockProps) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/checkbox', () => ({
    Checkbox: () => <input type="checkbox" />,
}));

vi.mock('@/shared/ui/badge', () => ({
    Badge: ({ children }: MockProps) => <span>{children}</span>,
}));

vi.mock('@/shared/ui/table', () => ({
    Table: ({ children }: MockProps) => <table>{children}</table>,
    TableHeader: ({ children }: MockProps) => <thead>{children}</thead>,
    TableBody: ({ children }: MockProps) => <tbody>{children}</tbody>,
    TableRow: ({ children }: MockProps) => <tr>{children}</tr>,
    TableHead: ({ children }: MockProps) => <th>{children}</th>,
    TableCell: ({ children }: MockProps) => <td>{children}</td>,
}));

vi.mock('@/shared/ui/tabs', () => ({
    Tabs: ({ children }: MockProps) => <div>{children}</div>,
    TabsContent: ({ children }: MockProps) => <div>{children}</div>,
    TabsList: ({ children }: MockProps) => <div>{children}</div>,
    TabsTrigger: ({ children }: MockProps) => <button>{children}</button>,
}));

vi.mock('@/shared/ui/accordion', () => ({
    Accordion: ({ children }: MockProps) => <div>{children}</div>,
    AccordionItem: ({ children }: MockProps) => <div>{children}</div>,
    AccordionTrigger: ({ children }: MockProps) => <button>{children}</button>,
    AccordionContent: ({ children }: MockProps) => <div>{children}</div>,
}));

vi.mock('@/features/finance/hooks/useFinanceData', () => ({
    useFinanceData: () => ({
        addCategory: vi.fn(),
    })
}));

describe('GmailHistoryDialog', () => {
    const mockCategories = [{ id: '1', name: 'Alimentación', type: 'expense' as const }];
    const mockPaymentMethods = [{ id: '1', name: 'Tarjeta', type: 'credit' as const, balance: 0 }];
    const mockUser = { id: 'user1' };

    it('renders duplicate message when import result status is duplicate', () => {
        const importResults: GmailImportResult[] = [
            {
                messageId: 'msg1',
                status: 'duplicate',
                products: [], // Backend returns no products for duplicates
                groups: []
            }
        ];

        const historyItems = [
            {
                id: 'msg1',
                threadId: 'th1',
                snippet: 'Factura de prueba',
                isValidInvoice: true,
                hasZip: false,
                fileNames: [],
                subject: 'Factura 1',
                from: 'test@example.com',
                date: '2023-01-01'
            }
        ];

        const reviewItems = importResults.map(r => ({ ...r, meta: historyItems[0] }));

        render(
            <GmailHistoryDialog
                open={true}
                onOpenChange={vi.fn()}
                isReviewing={true}
                importStep="review"
                setImportStep={vi.fn()}
                searchRange="30"
                setSearchRange={vi.fn() as never}
                searchLimit="50"
                setSearchLimit={vi.fn()}
                searchType="all"
                setSearchType={vi.fn()}
                hideApproved={false}
                setHideApproved={vi.fn()}
                searching={false}
                handleSearch={vi.fn()}
                visibleResults={[]}
                selectableResults={[]}
                selectedMessages={[]}
                setSelectedMessages={vi.fn()}
                hasOnlyArchivedHidden={false}
                unarchiveMessages={vi.fn()}
                archiveMessages={vi.fn()}
                deleteMessages={vi.fn()}
                importing={false}
                handleImportSelected={vi.fn()}
                reviewItems={reviewItems}
                approvingMessageId={null}
                paymentMethods={mockPaymentMethods}
                categories={mockCategories}
                updateImportProduct={vi.fn()}
                handleApproveInvoice={vi.fn()}
                setImportResults={vi.fn()}
                normalizeStatus={vi.fn()}
                safeFormatDate={vi.fn()}
                parseNumberValue={vi.fn()}
                resolveCategoryLabel={vi.fn()}
                onCancel={vi.fn()}
            />
        );

        // Verify that the specific duplicate text is displayed
        expect(screen.getByText('Esta factura ya había sido importada y se omitió para evitar duplicados.')).toBeInTheDocument();

        // Ensure that the "Productos detectados" table is not trying to render for the duplicate item
        expect(screen.queryByText('Productos detectados')).not.toBeInTheDocument();
    });
});
