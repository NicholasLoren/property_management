import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import documents from '@/routes/documents';
import type { DocumentRow } from '@/types/documents';

export type ActiveDocumentRow = DocumentRow;

export type TrashDocumentRow = DocumentRow & {
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

const TYPE_LABELS: Record<string, string> = {
    property: 'Property',
    unit: 'Unit',
    tenant: 'Tenant',
    lease: 'Lease',
};

function DocumentIdentityCell({ document }: { document: DocumentRow }) {
    const content = (
        <div className="flex items-center gap-2.5">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <FileText className="size-4" />
            </span>
            <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                    {document.title}
                    {document.code && (
                        <span className="rounded bg-secondary px-1 py-px font-mono text-[10.5px] font-normal text-text-tertiary">
                            {document.code}
                        </span>
                    )}
                </div>
                <div className="text-xs text-text-tertiary">
                    {TYPE_LABELS[document.documentable_type] ?? document.documentable_type}
                    {document.documentable_label ? ` — ${document.documentable_label}` : ''}
                </div>
            </div>
        </div>
    );

    return document.file ? (
        <a
            href={document.file.url}
            target="_blank"
            rel="noreferrer"
            className="hover:opacity-80"
        >
            {content}
        </a>
    ) : (
        content
    );
}

export function getDocumentColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    onTrash: (document: ActiveDocumentRow) => void;
}): ColumnDef<ActiveDocumentRow>[] {
    return [
        {
            id: 'title',
            accessorKey: 'title',
            header: 'Document',
            enableHiding: false,
            meta: { label: 'Document', sortKey: 'created_at' },
            cell: ({ row }) => <DocumentIdentityCell document={row.original} />,
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
            id: 'uploaded_by',
            header: 'Uploaded by',
            meta: { label: 'Uploaded by' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.uploaded_by_name ?? '–'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const document = row.original;

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
                                <Link href={documents.edit(document)}>
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
                                onClick={() => opts.onTrash(document)}
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

export function getDocumentTrashColumns(opts: {
    onRestore: (document: TrashDocumentRow) => void;
    onForceDelete: (document: TrashDocumentRow) => void;
}): ColumnDef<TrashDocumentRow>[] {
    return [
        {
            id: 'title',
            accessorKey: 'title',
            header: 'Document',
            enableHiding: false,
            meta: { label: 'Document' },
            cell: ({ row }) => <DocumentIdentityCell document={row.original} />,
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
                const document = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(document)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(document)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
