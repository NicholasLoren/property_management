import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sectionRoutes } from '@/pages/extras/section-routes';
import type { ExtrasItemRow, ExtrasSection } from '@/types/extras';

export type ActiveExtrasRow = ExtrasItemRow;
export type TrashExtrasRow = ExtrasItemRow;

const USAGE_NOUN: Record<ExtrasSection, string> = {
    'expense-categories': 'expense',
    'income-categories': 'income entry',
    'document-categories': 'document',
    'property-features': 'property',
    'unit-types': 'unit',
};

function pluralize(count: number, noun: string): string {
    if (count === 1) {
        return `1 ${noun}`;
    }

    const plural = noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`;

    return `${count} ${plural}`;
}

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

export function getExtrasColumns(opts: {
    section: ExtrasSection;
    canEdit: boolean;
    canDelete: boolean;
    onTrash: (item: ActiveExtrasRow) => void;
}): ColumnDef<ActiveExtrasRow>[] {
    const routes = sectionRoutes(opts.section);
    const columns: ColumnDef<ActiveExtrasRow>[] = [
        {
            id: 'name',
            accessorKey: 'name',
            header: opts.section === 'unit-types' ? 'Label' : 'Name',
            enableHiding: false,
            meta: { label: 'Name' },
            cell: ({ row }) => (
                <span className="text-[13px] font-semibold">
                    {opts.section === 'unit-types'
                        ? row.original.label
                        : row.original.name}
                </span>
            ),
        },
    ];

    if (opts.section === 'unit-types') {
        columns.push({
            id: 'name_slug',
            header: 'Slug',
            meta: { label: 'Slug' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary">
                    {row.original.name}
                </span>
            ),
        });
    }

    columns.push(
        {
            id: 'usage',
            header: 'In use',
            meta: { label: 'In use' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {pluralize(row.original.usage_count, USAGE_NOUN[opts.section])}
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
                        {opts.canEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Edit"
                                asChild
                            >
                                <Link href={routes.edit(item.id)}>
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
    );

    return columns;
}

export function getExtrasTrashColumns(opts: {
    section: ExtrasSection;
    onRestore: (item: TrashExtrasRow) => void;
    onForceDelete: (item: TrashExtrasRow) => void;
}): ColumnDef<TrashExtrasRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: opts.section === 'unit-types' ? 'Label' : 'Name',
            enableHiding: false,
            meta: { label: 'Name' },
            cell: ({ row }) => (
                <span className="text-[13px] font-semibold">
                    {opts.section === 'unit-types'
                        ? row.original.label
                        : row.original.name}
                </span>
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
