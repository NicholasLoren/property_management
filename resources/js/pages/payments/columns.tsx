import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { CreditCard, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import payments from '@/routes/payments';
import type { PaymentRow } from '@/types/payments';

export type ActivePaymentRow = PaymentRow;

export type TrashPaymentRow = PaymentRow & {
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

function statusVariant(status: string): 'default' | 'outline' | 'destructive' {
    if (status === 'completed') {
        return 'default';
    }

    if (status === 'failed') {
        return 'destructive';
    }

    return 'outline';
}

function PaymentIdentityCell({ payment }: { payment: PaymentRow }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <CreditCard className="size-4" />
            </span>
            <div>
                <div className="text-[13px] font-semibold">
                    {payment.tenant_name ?? 'Unassigned tenant'}
                </div>
                <div className="text-xs text-text-tertiary">
                    {payment.unit_name} — {payment.property_name}
                </div>
            </div>
        </div>
    );
}

export function getPaymentColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    currency: string;
    onTrash: (payment: ActivePaymentRow) => void;
}): ColumnDef<ActivePaymentRow>[] {
    return [
        {
            id: 'tenant',
            header: 'Payment',
            enableHiding: false,
            meta: { label: 'Payment', sortKey: 'payment_date' },
            cell: ({ row }) => <PaymentIdentityCell payment={row.original} />,
        },
        {
            id: 'amount',
            header: 'Amount',
            meta: { label: 'Amount', sortKey: 'amount' },
            cell: ({ row }) => (
                <span className="text-[13px] font-medium">
                    {formatCurrency(row.original.amount, opts.currency)}
                </span>
            ),
        },
        {
            id: 'payment_date',
            header: 'Date',
            meta: { label: 'Date' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.payment_date}
                </span>
            ),
        },
        {
            id: 'method',
            header: 'Method',
            meta: { label: 'Method' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.method_label}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            meta: { label: 'Status' },
            cell: ({ row }) => (
                <Badge variant={statusVariant(row.original.status)}>
                    {row.original.status_label}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const payment = row.original;

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
                                <Link href={payments.edit(payment)}>
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
                                onClick={() => opts.onTrash(payment)}
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

export function getPaymentTrashColumns(opts: {
    onRestore: (payment: TrashPaymentRow) => void;
    onForceDelete: (payment: TrashPaymentRow) => void;
}): ColumnDef<TrashPaymentRow>[] {
    return [
        {
            id: 'tenant',
            header: 'Payment',
            enableHiding: false,
            meta: { label: 'Payment' },
            cell: ({ row }) => <PaymentIdentityCell payment={row.original} />,
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
                const payment = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(payment)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(payment)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
