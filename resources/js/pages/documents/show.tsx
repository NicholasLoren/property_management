import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Download,
    FileText,
    Pencil,
    Tag,
    UserRound,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate } from '@/lib/datetime';
import documents from '@/routes/documents';

type DocumentShowRow = {
    id: number;
    code: string;
    title: string;
    notes: string | null;
    category_label: string | null;
    documentable_type: string | null;
    documentable_label: string | null;
    documentable_url: string | null;
    uploaded_by_name: string | null;
    file: { name: string; url: string; mime_type: string | null } | null;
    created_at: string | null;
};

type PageProps = { document: DocumentShowRow };

const TYPE_LABEL: Record<string, string> = {
    property: 'Property',
    unit: 'Unit',
    tenant: 'Tenant',
    lease: 'Lease',
};

export default function DocumentShow({ document }: PageProps) {
    const { timezone } = usePage().props;
    const { can } = usePermissions();

    return (
        <>
            <Head title={document.title} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Documents', href: documents.index() },
                        {
                            title: document.title,
                            href: documents.show(document.id),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {document.title}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-text-tertiary">
                            {document.code}
                        </span>
                        {document.category_label && (
                            <Badge variant="outline" className="font-normal">
                                {document.category_label}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {document.file && (
                        <Button variant="outline" asChild>
                            <a
                                href={document.file.url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Download className="size-[15px]" />
                                Download
                            </a>
                        </Button>
                    )}
                    {can('documents.edit') && (
                        <Button variant="outline" asChild>
                            <Link href={documents.edit(document.id)}>
                                <Pencil className="size-[15px]" />
                                Edit
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                        <FileText className="size-[15px]" />
                        File
                    </h2>
                    {document.file ? (
                        document.file.mime_type?.startsWith('image/') ? (
                            <img
                                src={document.file.url}
                                alt={document.file.name}
                                className="max-h-[420px] rounded-lg border border-border-soft object-contain"
                            />
                        ) : (
                            <a
                                href={document.file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2.5 rounded-lg border border-border-soft bg-secondary px-3 py-2.5 text-[13px] font-medium text-accent-strong hover:underline"
                            >
                                <FileText className="size-4" />
                                {document.file.name}
                            </a>
                        )
                    ) : (
                        <p className="text-sm text-text-tertiary">
                            No file attached.
                        </p>
                    )}

                    {document.notes && (
                        <div className="mt-4 border-t border-border-soft pt-4">
                            <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                Notes
                            </p>
                            <p className="text-sm whitespace-pre-line text-text-secondary">
                                {document.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Summary
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="flex items-center gap-1.5 text-text-tertiary">
                                <Tag className="size-3.5" />
                                Attached to
                            </dt>
                            <dd className="text-right font-medium">
                                {document.documentable_type
                                    ? TYPE_LABEL[document.documentable_type]
                                    : '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="flex items-center gap-1.5 text-text-tertiary">
                                <UserRound className="size-3.5" />
                                Uploaded by
                            </dt>
                            <dd className="text-right font-medium">
                                {document.uploaded_by_name ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Uploaded on</dt>
                            <dd className="text-right font-medium">
                                {formatDate(document.created_at, timezone)}
                            </dd>
                        </div>
                    </dl>

                    {document.documentable_url &&
                        document.documentable_label && (
                            <Link
                                href={document.documentable_url}
                                className="mt-3 flex items-center justify-between border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                            >
                                View {document.documentable_label}
                                <ArrowRight className="size-3.5" />
                            </Link>
                        )}
                </div>
            </div>
        </>
    );
}
