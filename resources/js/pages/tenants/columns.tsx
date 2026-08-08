import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import tenants from '@/routes/tenants';
import type { TenantRow } from '@/types/tenants';

export type ActiveTenantRow = TenantRow;

export type TrashTenantRow = TenantRow & {
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

function TenantIdentityCell({ tenant }: { tenant: TenantRow }) {
    return (
        <Link
            href={tenants.show(tenant)}
            className="flex items-center gap-2.5 hover:opacity-80"
        >
            <EntityAvatar
                name={tenant.name}
                seed={tenant.id}
                imageUrl={tenant.avatar}
                className="size-[34px] text-[13px]"
            />
            <div>
                <div className="text-[13px] font-semibold">{tenant.name}</div>
                <div className="text-xs text-text-tertiary">
                    {tenant.email ?? tenant.phone ?? '–'}
                </div>
            </div>
        </Link>
    );
}

export function getTenantColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    onTrash: (tenant: ActiveTenantRow) => void;
}): ColumnDef<ActiveTenantRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Tenant',
            enableHiding: false,
            meta: { label: 'Tenant', sortKey: 'name' },
            cell: ({ row }) => <TenantIdentityCell tenant={row.original} />,
        },
        {
            id: 'phone',
            header: 'Phone',
            meta: { label: 'Phone' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.phone ?? '–'}
                </span>
            ),
        },
        {
            id: 'active_lease',
            header: 'Current lease',
            meta: { label: 'Current lease' },
            cell: ({ row }) => {
                const lease = row.original.active_lease;

                return lease ? (
                    <span className="text-[13px] text-foreground">
                        {lease.unit_name} — {lease.property_name}
                    </span>
                ) : (
                    <span className="text-sm text-text-tertiary">
                        No active lease
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const tenant = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="View details"
                            asChild
                        >
                            <Link href={tenants.show(tenant)}>
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
                                <Link href={tenants.edit(tenant)}>
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
                                onClick={() => opts.onTrash(tenant)}
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

export function getTenantTrashColumns(opts: {
    onRestore: (tenant: TrashTenantRow) => void;
    onForceDelete: (tenant: TrashTenantRow) => void;
}): ColumnDef<TrashTenantRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Tenant',
            enableHiding: false,
            meta: { label: 'Tenant' },
            cell: ({ row }) => <TenantIdentityCell tenant={row.original} />,
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
                const tenant = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(tenant)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(tenant)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
