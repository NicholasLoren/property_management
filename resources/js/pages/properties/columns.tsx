import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, DoorOpen, Eye, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import properties from '@/routes/properties';
import type { PropertyRow } from '@/types/properties';

export type ActivePropertyRow = PropertyRow;

export type TrashPropertyRow = PropertyRow & {
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

function PropertyIdentityCell({ property }: { property: PropertyRow }) {
    return (
        <Link
            href={properties.show(property)}
            className="flex items-center gap-2.5 hover:opacity-80"
        >
            {property.photo_url ? (
                <img
                    src={property.photo_url}
                    alt=""
                    className="size-[34px] shrink-0 rounded-lg object-cover"
                />
            ) : (
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                    <Building2 className="size-4" />
                </span>
            )}
            <div>
                <div className="text-[13px] font-semibold">{property.name}</div>
                <div className="text-xs text-text-tertiary">
                    {property.address}
                </div>
            </div>
        </Link>
    );
}

export function getPropertyColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    currency: string;
    onTrash: (property: ActivePropertyRow) => void;
}): ColumnDef<ActivePropertyRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Property',
            enableHiding: false,
            meta: { label: 'Property', sortKey: 'name' },
            cell: ({ row }) => <PropertyIdentityCell property={row.original} />,
        },
        {
            id: 'type',
            accessorKey: 'type',
            header: 'Type',
            meta: { label: 'Type', sortKey: 'type' },
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.type_label}</Badge>
            ),
        },
        {
            id: 'landlord',
            header: 'Landlord',
            meta: { label: 'Landlord', sortKey: 'landlord' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.landlord_name ?? '–'}
                </span>
            ),
        },
        {
            id: 'units',
            header: 'Units',
            meta: { label: 'Units', sortKey: 'units' },
            cell: ({ row }) => {
                const { units_summary: summary, price_range: price } =
                    row.original;

                return (
                    <div>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                            <DoorOpen className="size-[13px] text-text-tertiary" />
                            {summary.total} unit{summary.total === 1 ? '' : 's'}
                        </span>
                        {summary.total > 0 && (
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
                                {summary.vacant > 0 && (
                                    <span className="inline-flex items-center gap-1">
                                        <span className="size-[6px] rounded-full bg-warning" />
                                        {summary.vacant} vacant
                                    </span>
                                )}
                                {summary.occupied > 0 && (
                                    <span className="inline-flex items-center gap-1">
                                        <span className="size-[6px] rounded-full bg-success" />
                                        {summary.occupied} occupied
                                    </span>
                                )}
                            </div>
                        )}
                        {price.low && (
                            <div className="mt-0.5 text-xs text-text-tertiary">
                                {formatCurrency(price.low, opts.currency)}
                                {price.high !== price.low
                                    ? ` – ${Number(price.high).toLocaleString()}`
                                    : ''}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const property = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="View details"
                            asChild
                        >
                            <Link href={properties.show(property)}>
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
                                <Link href={properties.edit(property)}>
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
                                onClick={() => opts.onTrash(property)}
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

export function getPropertyTrashColumns(opts: {
    onRestore: (property: TrashPropertyRow) => void;
    onForceDelete: (property: TrashPropertyRow) => void;
}): ColumnDef<TrashPropertyRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Property',
            enableHiding: false,
            meta: { label: 'Property' },
            cell: ({ row }) => <PropertyIdentityCell property={row.original} />,
        },
        {
            id: 'type',
            header: 'Type',
            meta: { label: 'Type' },
            cell: ({ row }) => (
                <Badge variant="outline">{row.original.type_label}</Badge>
            ),
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
                const property = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(property)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(property)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
