import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import documents from '@/routes/documents';
import { documentSchema } from '@/schemas/document';
import type { DocumentFile } from '@/types/documents';

type Option = { value: string; label: string };
type DocumentableType = 'property' | 'unit' | 'tenant' | 'lease';

type DocumentFormRow = {
    id: number;
    title: string;
    category_id: string;
    notes: string | null;
    documentable_type: DocumentableType;
    documentable_id: string;
    documentable_label: string | null;
    file: DocumentFile | null;
};

type PageProps = {
    document?: DocumentFormRow;
    categories: Option[];
    types: Option[];
    attachables: Record<DocumentableType, Option[]>;
};

export default function DocumentForm({
    document,
    categories,
    types,
    attachables,
}: PageProps) {
    const isEdit = Boolean(document);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        documentSchema,
        {
            documentable_type: document?.documentable_type ?? 'property',
            documentable_id: document?.documentable_id ?? '',
            title: document?.title ?? '',
            category_id: document?.category_id ?? categories[0]?.value ?? '',
            notes: document?.notes ?? '',
            file: null,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', documents.update(document!).url);
        } else {
            submit('post', documents.store().url);
        }
    }

    const attachableOptions = attachables[data.documentable_type] ?? [];

    return (
        <>
            <Head title={isEdit ? 'Edit document' : 'Add document'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Documents', href: documents.index() },
                        {
                            title: isEdit ? 'Edit document' : 'Add document',
                            href: isEdit
                                ? documents.edit(document!)
                                : documents.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit document' : 'Add document'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isEdit
                        ? 'Update this document’s details or replace the file.'
                        : 'File a contract, certificate, or record against a property, unit, tenant, or lease.'}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="documentable_type">Attach to</Label>
                        {isEdit ? (
                            <div className="flex h-9 items-center rounded-md border border-border-soft bg-secondary px-3 text-sm text-text-secondary">
                                {types.find((t) => t.value === data.documentable_type)
                                    ?.label}{' '}
                                — {document!.documentable_label}
                            </div>
                        ) : (
                            <Select
                                value={data.documentable_type}
                                onValueChange={(value) => {
                                    setField(
                                        'documentable_type',
                                        value as DocumentableType,
                                    );
                                    setField('documentable_id', '');
                                }}
                            >
                                <SelectTrigger id="documentable_type" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <InputError message={errors.documentable_type} />
                    </div>

                    {!isEdit && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="documentable_id">Record</Label>
                            <SearchableSelect
                                id="documentable_id"
                                value={data.documentable_id || null}
                                onChange={(value) =>
                                    setField('documentable_id', value ?? '')
                                }
                                options={attachableOptions}
                                placeholder="Select a record…"
                                searchPlaceholder="Search…"
                            />
                            <InputError message={errors.documentable_id} />
                        </div>
                    )}

                    <div className="grid gap-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            autoFocus
                            value={data.title}
                            onChange={(e) => setField('title', e.target.value)}
                            placeholder="e.g. Fire insurance certificate"
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="category_id">Category</Label>
                        <Select
                            value={data.category_id}
                            onValueChange={(value) => setField('category_id', value)}
                        >
                            <SelectTrigger id="category_id" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                        {category.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.category_id} />
                    </div>
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label htmlFor="notes" className="mb-2">
                        Notes{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="notes"
                        value={data.notes ?? ''}
                        onChange={(e) => setField('notes', e.target.value)}
                        placeholder="Anything else worth noting"
                        maxLength={5000}
                    />
                    <InputError message={errors.notes} />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-3">
                        File{' '}
                        {!isEdit && (
                            <span className="font-normal text-text-tertiary">
                                (required)
                            </span>
                        )}
                    </Label>
                    <FileDropzone
                        accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        maxSizeMb={10}
                        value={data.file ?? null}
                        onChange={(file) => setField('file', file)}
                        existing={document?.file ?? null}
                        error={errors.file}
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={documents.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add document'}
                    </Button>
                </div>
            </form>
        </>
    );
}
