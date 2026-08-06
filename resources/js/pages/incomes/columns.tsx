import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, TrendingUp, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import incomes from '@/routes/incomes';
import type { IncomeRow } from '@/types/transactions';

export type ActiveIncomeRow = IncomeRow;

export type TrashIncomeRow = IncomeRow & {
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

function IncomeIdentityCell({ income }: { income: IncomeRow }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <TrendingUp className="size-4" />
            </span>
            <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                    {income.property_name}
                    {income.code && (
                        <span className="rounded bg-secondary px-1 py-px font-mono text-[10.5px] font-normal text-text-tertiary">
                            {income.code}
                        </span>
                    )}
                </div>
                <div className="max-w-[280px] truncate text-xs text-text-tertiary">
                    {income.description ?? income.category_label}
                </div>
            </div>
        </div>
    );
}

export function getIncomeColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    currency: string;
    onTrash: (income: ActiveIncomeRow) => void;
}): ColumnDef<ActiveIncomeRow>[] {
    return [
        {
            id: 'property',
            header: 'Income',
            enableHiding: false,
            meta: { label: 'Income', sortKey: 'transaction_date' },
            cell: ({ row }) => <IncomeIdentityCell income={row.original} />,
        },
        {
            id: 'category',
            header: 'Category',
            meta: { label: 'Category' },
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.category_label}</Badge>
            ),
        },
        {
            id: 'amount',
            header: 'Amount',
            meta: { label: 'Amount', sortKey: 'amount' },
            cell: ({ row }) => (
                <span className="text-[13px] font-medium text-success">
                    +{formatCurrency(row.original.amount, opts.currency)}
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
                const income = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        {opts.canEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Edit"
                                asChild
                            >
                                <Link href={incomes.edit(income)}>
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
                                onClick={() => opts.onTrash(income)}
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

export function getIncomeTrashColumns(opts: {
    onRestore: (income: TrashIncomeRow) => void;
    onForceDelete: (income: TrashIncomeRow) => void;
}): ColumnDef<TrashIncomeRow>[] {
    return [
        {
            id: 'property',
            header: 'Income',
            enableHiding: false,
            meta: { label: 'Income' },
            cell: ({ row }) => <IncomeIdentityCell income={row.original} />,
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
                const income = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(income)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(income)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
