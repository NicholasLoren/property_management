import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Spinner } from '@/components/ui/spinner';
import { Telephone } from '@/components/ui/telephone';
import { Textarea } from '@/components/ui/textarea';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import tenants from '@/routes/tenants';
import { tenantSchema } from '@/schemas/tenant';
import type { TenantDocument } from '@/types/tenants';

type TenantFormRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    id_number: string | null;
    address: string | null;
    notes: string | null;
    id_document: TenantDocument | null;
    avatar: TenantDocument | null;
};

type PageProps = {
    tenant?: TenantFormRow;
};

export default function TenantForm({ tenant }: PageProps) {
    const isEdit = Boolean(tenant);
    const [existingAvatarRemoved, setExistingAvatarRemoved] = useState(false);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        tenantSchema,
        {
            name: tenant?.name ?? '',
            email: tenant?.email ?? '',
            phone: tenant?.phone ?? '',
            id_number: tenant?.id_number ?? '',
            address: tenant?.address ?? '',
            notes: tenant?.notes ?? '',
            id_document: null,
            id_document_remove: false,
            avatar: null,
            avatar_remove: false,
        },
    );

    const existingAvatar =
        !existingAvatarRemoved && tenant ? tenant.avatar : null;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', tenants.update(tenant!).url);
        } else {
            submit('post', tenants.store().url);
        }
    }

    return (
        <>
            <Head title={isEdit ? 'Edit tenant' : 'Add tenant'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Tenants', href: tenants.index() },
                        {
                            title: isEdit ? 'Edit tenant' : 'Add tenant',
                            href: isEdit
                                ? tenants.edit(tenant!)
                                : tenants.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit tenant' : 'Add tenant'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isEdit
                        ? 'Update this tenant’s contact details and documents.'
                        : 'Register a new tenant so they can be added to a lease.'}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="mb-5 border-b border-border-soft pb-4">
                    <Label className="mb-3">
                        Avatar{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <FileDropzone
                        accept="image/jpeg,image/png,image/webp"
                        value={data.avatar ?? null}
                        onChange={(file) => setField('avatar', file)}
                        existing={existingAvatar}
                        onRemoveExisting={() => {
                            setExistingAvatarRemoved(true);
                            setField('avatar_remove', true);
                        }}
                        error={errors.avatar}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">
                            Name
                            <RequiredAsterisk />
                        </Label>
                        <Input
                            id="name"
                            autoFocus
                            value={data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="e.g. Jonah Kessler"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email ?? ''}
                            onChange={(e) => setField('email', e.target.value)}
                            placeholder="tenant@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="phone">Phone</Label>
                        <Telephone
                            id="phone"
                            value={data.phone}
                            onChange={(value) => setField('phone', value)}
                        />
                        <InputError message={errors.phone} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="id_number">ID number</Label>
                        <Input
                            id="id_number"
                            value={data.id_number ?? ''}
                            onChange={(e) =>
                                setField('id_number', e.target.value)
                            }
                            placeholder="National ID or passport no."
                        />
                        <InputError message={errors.id_number} />
                    </div>
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label htmlFor="address" className="mb-2">
                        Address{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <Input
                        id="address"
                        value={data.address ?? ''}
                        onChange={(e) => setField('address', e.target.value)}
                        placeholder="Physical or forwarding address"
                    />
                    <InputError message={errors.address} />
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
                        placeholder="Anything else worth noting about this tenant"
                        maxLength={5000}
                    />
                    <InputError message={errors.notes} />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-3">ID document</Label>
                    <FileDropzone
                        value={data.id_document ?? null}
                        onChange={(file) => {
                            setField('id_document', file);
                            setField('id_document_remove', false);
                        }}
                        existing={
                            !data.id_document_remove
                                ? (tenant?.id_document ?? null)
                                : null
                        }
                        onRemoveExisting={() =>
                            setField('id_document_remove', true)
                        }
                        error={errors.id_document}
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={tenants.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add tenant'}
                    </Button>
                </div>
            </form>
        </>
    );
}
