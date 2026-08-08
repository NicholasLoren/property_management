import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2, TrendingDown, Undo2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import expenses from '@/routes/expenses';
import type { ExpenseRow } from '@/types/transactions';

export type ActiveExpenseRow = ExpenseRow;

export type TrashExpenseRow = ExpenseRow & {
    deleted_at: string | null;
    deleted_by_name: string | null;
};

function formatRelative(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 60) {
        return `${Math.max(minutes, 0)}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d ago`;
    }

    return `${Math.floor(days / 7)}w ago`;
}

function ExpenseIdentityCell({ expense }: { expense: ExpenseRow }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <TrendingDown className="size-4" />
            </span>
            <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                    {expense.property_name}
                    {expense.code && (
                        <span className="rounded bg-secondary px-1 py-px font-mono text-[10.5px] font-normal text-text-tertiary">
                            {expense.code}
                        </span>
                    )}
                </div>
                <div className="max-w-[280px] truncate text-xs text-text-tertiary">
                    {expense.description ?? expense.category_label}
                </div>
            </div>
        </div>
    );
}

export function getExpenseColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    currency: string;
    onTrash: (expense: ActiveExpenseRow) => void;
    onView: (expense: ActiveExpenseRow) => void;
}): ColumnDef<ActiveExpenseRow>[] {
    return [
        {
            id: 'property',
            header: 'Expense',
            enableHiding: false,
            meta: { label: 'Expense', sortKey: 'transaction_date' },
            cell: ({ row }) => <ExpenseIdentityCell expense={row.original} />,
        },
        {
            id: 'category',
            header: 'Category',
            meta: { label: 'Category' },
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline">
                        {row.original.category_label}
                    </Badge>
                    {row.original.is_from_maintenance && (
                        <span title="Created from a maintenance request">
                            <Wrench className="size-[13px] text-text-tertiary" />
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'amount',
            header: 'Amount',
            meta: { label: 'Amount', sortKey: 'amount' },
            cell: ({ row }) => (
                <span className="text-[13px] font-medium text-destructive">
                    -{formatCurrency(row.original.amount, opts.currency)}
                </span>
            ),
        },
        {
            id: 'transaction_date',
            header: 'Date',
            meta: { label: 'Date' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.transaction_date}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const expense = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="View details"
                            onClick={() => opts.onView(expense)}
                        >
                            <Eye className="size-[15px]" />
                        </Button>
                        {opts.canEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Edit"
                                asChild
                            >
                                <Link href={expenses.edit(expense)}>
                                    <Pencil className="size-[15px]" />
                                </Link>
                            </Button>
                        )}
                        {opts.canDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                title="Move to trash"
                                onClick={() => opts.onTrash(expense)}
                            >
                                <Trash2 className="size-[15px]" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];
}

export function getExpenseTrashColumns(opts: {
    onRestore: (expense: TrashExpenseRow) => void;
    onForceDelete: (expense: TrashExpenseRow) => void;
}): ColumnDef<TrashExpenseRow>[] {
    return [
        {
            id: 'property',
            header: 'Expense',
            enableHiding: false,
            meta: { label: 'Expense' },
            cell: ({ row }) => <ExpenseIdentityCell expense={row.original} />,
        },
        {
            id: 'deleted_by',
            header: 'Deleted by',
            meta: { label: 'Deleted by' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.deleted_by_name ?? '–'}
                </span>
            ),
        },
        {
            id: 'deleted_at',
            header: 'Deleted',
            meta: { label: 'Deleted' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {row.original.deleted_at
                        ? formatRelative(row.original.deleted_at)
                        : '–'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const expense = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(expense)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(expense)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
