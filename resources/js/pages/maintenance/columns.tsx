import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2, Undo2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import maintenance from '@/routes/maintenance';
import type { MaintenanceRow } from '@/types/maintenance';

export type ActiveMaintenanceRow = MaintenanceRow;

export type TrashMaintenanceRow = MaintenanceRow & {
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

function priorityVariant(priority: string): 'default' | 'outline' | 'secondary' | 'destructive' {
    if (priority === 'urgent') {
        return 'destructive';
    }

    if (priority === 'high') {
        return 'default';
    }

    return 'outline';
}

function statusVariant(status: string): 'default' | 'outline' | 'secondary' {
    if (status === 'completed') {
        return 'secondary';
    }

    if (status === 'in_progress') {
        return 'default';
    }

    return 'outline';
}

function MaintenanceIdentityCell({ item }: { item: MaintenanceRow }) {
    return (
        <Link
            href={maintenance.show(item)}
            className="flex items-center gap-2.5 hover:opacity-80"
        >
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <Wrench className="size-4" />
            </span>
            <div>
                <div className="text-[13px] font-semibold">{item.title}</div>
                <div className="text-xs text-text-tertiary">
                    {item.unit_name} — {item.property_name}
                </div>
            </div>
        </Link>
    );
}

export function getMaintenanceColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    currency: string;
    onTrash: (item: ActiveMaintenanceRow) => void;
}): ColumnDef<ActiveMaintenanceRow>[] {
    return [
        {
            id: 'title',
            accessorKey: 'title',
            header: 'Request',
            enableHiding: false,
            meta: { label: 'Request', sortKey: 'created_at' },
            cell: ({ row }) => <MaintenanceIdentityCell item={row.original} />,
        },
        {
            id: 'priority',
            header: 'Priority',
            meta: { label: 'Priority', sortKey: 'priority' },
            cell: ({ row }) => (
                <Badge variant={priorityVariant(row.original.priority)}>
                    {row.original.priority_label}
                </Badge>
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
            id: 'assigned_to',
            header: 'Assigned to',
            meta: { label: 'Assigned to' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.assigned_to_name ?? '–'}
                </span>
            ),
        },
        {
            id: 'cost',
            header: 'Cost',
            meta: { label: 'Cost' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.cost
                        ? formatCurrency(row.original.cost, opts.currency)
                        : '–'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const item = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="View details"
                            asChild
                        >
                            <Link href={maintenance.show(item)}>
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
                                <Link href={maintenance.edit(item)}>
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
                                onClick={() => opts.onTrash(item)}
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

export function getMaintenanceTrashColumns(opts: {
    onRestore: (item: TrashMaintenanceRow) => void;
    onForceDelete: (item: TrashMaintenanceRow) => void;
}): ColumnDef<TrashMaintenanceRow>[] {
    return [
        {
            id: 'title',
            accessorKey: 'title',
            header: 'Request',
            enableHiding: false,
            meta: { label: 'Request' },
            cell: ({ row }) => <MaintenanceIdentityCell item={row.original} />,
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
                const item = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(item)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(item)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
