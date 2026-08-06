import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FileText, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import leases from '@/routes/leases';
import type { LeaseRow } from '@/types/leases';

export type ActiveLeaseRow = LeaseRow;

export type TrashLeaseRow = LeaseRow & {
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

function statusVariant(status: string): 'default' | 'outline' | 'secondary' {
    if (status === 'active') {
        return 'default';
    }

    if (status === 'terminated') {
        return 'secondary';
    }

    return 'outline';
}

function LeaseIdentityCell({ lease }: { lease: LeaseRow }) {
    return (
        <Link
            href={leases.show(lease)}
            className="flex items-center gap-2.5 hover:opacity-80"
        >
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <FileText className="size-4" />
            </span>
            <div>
                <div className="text-[13px] font-semibold">
                    {lease.unit_name} — {lease.property_name}
                </div>
                <div className="text-xs text-text-tertiary">
                    {lease.tenant_names.join(', ') || 'No tenants'}
                </div>
            </div>
        </Link>
    );
}

export function getLeaseColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    currency: string;
    onTrash: (lease: ActiveLeaseRow) => void;
}): ColumnDef<ActiveLeaseRow>[] {
    return [
        {
            id: 'unit',
            header: 'Lease',
            enableHiding: false,
            meta: { label: 'Lease', sortKey: 'start_date' },
            cell: ({ row }) => <LeaseIdentityCell lease={row.original} />,
        },
        {
            id: 'term',
            header: 'Term',
            meta: { label: 'Term' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.start_date} – {row.original.end_date}
                </span>
            ),
        },
        {
            id: 'rent',
            header: 'Rent',
            meta: { label: 'Rent' },
            cell: ({ row }) => (
                <div>
                    <span className="text-[13px] font-medium">
                        {formatCurrency(row.original.rent_amount, opts.currency)}
                    </span>
                    <div className="text-xs text-text-tertiary">
                        {row.original.billing_period_label}
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
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
                const lease = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="View details"
                            asChild
                        >
                            <Link href={leases.show(lease)}>
                                <Eye className="size-[15px]" />
                            </Link>
                        </Button>
                        {opts.canEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Edit"
                                asChild
                            >
                                <Link href={leases.edit(lease)}>
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
                                onClick={() => opts.onTrash(lease)}
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

export function getLeaseTrashColumns(opts: {
    onRestore: (lease: TrashLeaseRow) => void;
    onForceDelete: (lease: TrashLeaseRow) => void;
}): ColumnDef<TrashLeaseRow>[] {
    return [
        {
            id: 'unit',
            header: 'Lease',
            enableHiding: false,
            meta: { label: 'Lease' },
            cell: ({ row }) => <LeaseIdentityCell lease={row.original} />,
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
                const lease = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(lease)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(lease)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
