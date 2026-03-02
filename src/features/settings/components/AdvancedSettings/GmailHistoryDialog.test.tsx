import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GmailHistoryDialog } from './GmailHistoryDialog';
import { GmailImportResult } from './GmailHistoryDialog';

// Mock the UI components that might cause issues in a test environment
vi.mock('@/shared/ui/dialog', () => ({
    Dialog: ({ children }: any) => <div>{children}</div>,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/alert-dialog', () => ({
    AlertDialog: ({ children }: any) => <div>{children}</div>,
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
}));

vi.mock('@/shared/ui/button', () => ({
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/shared/ui/scroll-area', () => ({
    ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/checkbox', () => ({
    Checkbox: () => <input type="checkbox" />,
}));

vi.mock('@/shared/ui/badge', () => ({
    Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/shared/ui/table', () => ({
    Table: ({ children }: any) => <table>{children}</table>,
    TableHeader: ({ children }: any) => <thead>{children}</thead>,
    TableBody: ({ children }: any) => <tbody>{children}</tbody>,
    TableRow: ({ children }: any) => <tr>{children}</tr>,
    TableHead: ({ children }: any) => <th>{children}</th>,
    TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock('@/shared/ui/tabs', () => ({
    Tabs: ({ children }: any) => <div>{children}</div>,
    TabsContent: ({ children }: any) => <div>{children}</div>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children }: any) => <button>{children}</button>,
}));

vi.mock('@/shared/ui/accordion', () => ({
    Accordion: ({ children }: any) => <div>{children}</div>,
    AccordionItem: ({ children }: any) => <div>{children}</div>,
    AccordionTrigger: ({ children }: any) => <button>{children}</button>,
    AccordionContent: ({ children }: any) => <div>{children}</div>,
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

        const historyItems: any[] = [
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
                setSearchRange={vi.fn() as any}
                searchLimit="50"
                setSearchLimit={vi.fn()}
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
