import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Building2,
    DoorOpen,
    Eye,
    Pencil,
    Sparkles,
    Trash2,
    Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import properties from '@/routes/properties';
import units from '@/routes/units';
import type { UnitWithPropertyRow } from '@/types/units';

export type ActiveUnitWithPropertyRow = UnitWithPropertyRow;

export type TrashUnitWithPropertyRow = UnitWithPropertyRow & {
    deleted_at: string | null;
    deleted_by_name: string | null;
};

const STATUS_DOT_CLASS: Record<string, string> = {
    vacant: 'bg-warning',
    occupied: 'bg-success',
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

function UnitIdentityCell({ unit }: { unit: UnitWithPropertyRow }) {
    const content = (
        <>
            {unit.photo_url ? (
                <img
                    src={unit.photo_url}
                    alt=""
                    className="size-[34px] shrink-0 rounded-lg object-cover"
                />
            ) : (
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                    <DoorOpen className="size-4" />
                </span>
            )}
            <div>
                <div className="text-[13px] font-semibold">{unit.name}</div>
                <div className="text-xs text-text-tertiary">
                    {unit.unit_type_label ?? '–'}
                    {unit.size ? ` · ${unit.size}` : ''}
                </div>
            </div>
        </>
    );

    if (!unit.property) {
        return <div className="flex items-center gap-2.5">{content}</div>;
    }

    return (
        <Link
            href={units.show([unit.property.id, unit.id])}
            className="flex items-center gap-2.5 hover:opacity-80"
        >
            {content}
        </Link>
    );
}

function PropertyCell({ unit }: { unit: UnitWithPropertyRow }) {
    if (!unit.property) {
        return <span className="text-sm text-text-tertiary">–</span>;
    }

    return (
        <Link
            href={properties.show(unit.property)}
            className="inline-flex items-center gap-1.5 text-[13px] text-accent-strong hover:underline"
        >
            <Building2 className="size-3.5" />
            {unit.property.name}
        </Link>
    );
}

export function getAllUnitColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    currency: string;
    onEdit: (unit: ActiveUnitWithPropertyRow) => void;
    onTrash: (unit: ActiveUnitWithPropertyRow) => void;
}): ColumnDef<ActiveUnitWithPropertyRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Unit',
            enableHiding: false,
            meta: { label: 'Unit', sortKey: 'name' },
            cell: ({ row }) => <UnitIdentityCell unit={row.original} />,
        },
        {
            id: 'property',
            header: 'Property',
            meta: { label: 'Property', sortKey: 'property' },
            cell: ({ row }) => <PropertyCell unit={row.original} />,
        },
        {
            id: 'status',
            accessorKey: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-text-secondary">
                    <span
                        className={`size-[7px] rounded-full ${STATUS_DOT_CLASS[row.original.status]}`}
                    />
                    {row.original.status_label}
                </span>
            ),
        },
        {
            id: 'price',
            header: 'Price',
            meta: { label: 'Price' },
            cell: ({ row }) => {
                const price = row.original.current_price;

                return (
                    <span className="text-[13px] text-foreground">
                        {price
                            ? `${formatCurrency(price.amount, opts.currency)} / ${price.billing_period_label.toLowerCase()}`
                            : '–'}
                    </span>
                );
            },
        },
        {
            id: 'features',
            header: 'Features',
            meta: { label: 'Features' },
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                    <Sparkles className="size-[13px]" />
                    {row.original.features_count}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const unit = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        {unit.property && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="View details"
                                asChild
                            >
                                <Link
                                    href={units.show([
                                        unit.property.id,
                                        unit.id,
                                    ])}
                                >
                                    <Eye className="size-[15px]" />
                                </Link>
                            </Button>
                        )}
                        {opts.canEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Edit"
                                onClick={() => opts.onEdit(unit)}
                            >
                                <Pencil className="size-[15px]" />
                            </Button>
                        )}
                        {opts.canDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                title="Move to trash"
                                onClick={() => opts.onTrash(unit)}
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

export function getAllUnitTrashColumns(opts: {
    onRestore: (unit: TrashUnitWithPropertyRow) => void;
    onForceDelete: (unit: TrashUnitWithPropertyRow) => void;
}): ColumnDef<TrashUnitWithPropertyRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Unit',
            enableHiding: false,
            meta: { label: 'Unit' },
            cell: ({ row }) => <UnitIdentityCell unit={row.original} />,
        },
        {
            id: 'property',
            header: 'Property',
            meta: { label: 'Property' },
            cell: ({ row }) => <PropertyCell unit={row.original} />,
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
                const unit = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(unit)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(unit)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
