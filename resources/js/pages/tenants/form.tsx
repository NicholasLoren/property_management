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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    type: 'individual' | 'company';
    email: string | null;
    phone: string | null;
    id_number: string | null;
    tin: string | null;
    id_document_type:
        | 'national_id'
        | 'passport'
        | 'company_registration_certificate'
        | 'other'
        | null;
    address: string | null;
    notes: string | null;
    contact_person_name: string | null;
    contact_person_phone: string | null;
    contact_person_email: string | null;
    id_document: TenantDocument | null;
    avatar: TenantDocument | null;
};

type PageProps = {
    tenant?: TenantFormRow;
    compliance_enabled: boolean;
};

const ID_DOCUMENT_TYPES = [
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    {
        value: 'company_registration_certificate',
        label: 'Company registration certificate',
    },
    { value: 'other', label: 'Other' },
] as const;

export default function TenantForm({
    tenant,
    compliance_enabled: complianceEnabled,
}: PageProps) {
    const isEdit = Boolean(tenant);
    const [existingAvatarRemoved, setExistingAvatarRemoved] = useState(false);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        tenantSchema,
        {
            name: tenant?.name ?? '',
            type: tenant?.type ?? 'individual',
            email: tenant?.email ?? '',
            phone: tenant?.phone ?? '',
            id_number: tenant?.id_number ?? '',
            tin: tenant?.tin ?? '',
            id_document_type: tenant?.id_document_type ?? null,
            address: tenant?.address ?? '',
            notes: tenant?.notes ?? '',
            contact_person_name: tenant?.contact_person_name ?? '',
            contact_person_phone: tenant?.contact_person_phone ?? '',
            contact_person_email: tenant?.contact_person_email ?? '',
            id_document: null,
            id_document_remove: false,
            avatar: null,
            avatar_remove: false,
        },
    );

    const isCompany = data.type === 'company';

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

                <div className="mb-4 grid gap-1.5">
                    <Label>Tenant type</Label>
                    <div className="inline-flex w-fit gap-0.5 rounded-full border border-border-soft bg-secondary p-[3px]">
                        {(['individual', 'company'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setField('type', type)}
                                className={
                                    'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize ' +
                                    (data.type === type
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-text-secondary')
                                }
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">
                            {isCompany ? 'Company name' : 'Name'}
                            <RequiredAsterisk />
                        </Label>
                        <Input
                            id="name"
                            autoFocus
                            value={data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder={
                                isCompany
                                    ? 'e.g. Kessler Holdings Ltd'
                                    : 'e.g. Jonah Kessler'
                            }
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
                        <Label htmlFor="id_number">
                            {isCompany ? 'Registration number' : 'ID number'}
                        </Label>
                        <Input
                            id="id_number"
                            value={data.id_number ?? ''}
                            onChange={(e) =>
                                setField('id_number', e.target.value)
                            }
                            placeholder={
                                isCompany
                                    ? 'URSB registration no.'
                                    : 'National ID or passport no.'
                            }
                        />
                        <InputError message={errors.id_number} />
                    </div>
                </div>

                {complianceEnabled && (
                    <div className="mt-5 border-t border-border-soft pt-4">
                        <Label className="mb-3">Compliance details</Label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="tin">TIN</Label>
                                <Input
                                    id="tin"
                                    value={data.tin ?? ''}
                                    onChange={(e) =>
                                        setField('tin', e.target.value)
                                    }
                                    placeholder="Tax Identification Number"
                                />
                                <InputError message={errors.tin} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="id_document_type">
                                    ID document type
                                </Label>
                                <Select
                                    value={data.id_document_type ?? ''}
                                    onValueChange={(value) =>
                                        setField(
                                            'id_document_type',
                                            value as typeof data.id_document_type,
                                        )
                                    }
                                >
                                    <SelectTrigger id="id_document_type">
                                        <SelectValue placeholder="Select a type…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ID_DOCUMENT_TYPES.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.id_document_type} />
                            </div>
                        </div>

                        {isCompany && (
                            <div className="mt-4 grid gap-4 border-t border-border-soft pt-4 sm:grid-cols-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="contact_person_name">
                                        Contact person
                                    </Label>
                                    <Input
                                        id="contact_person_name"
                                        value={data.contact_person_name ?? ''}
                                        onChange={(e) =>
                                            setField(
                                                'contact_person_name',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Name of the person to reach"
                                    />
                                    <InputError
                                        message={errors.contact_person_name}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="contact_person_phone">
                                        Contact phone
                                    </Label>
                                    <Telephone
                                        id="contact_person_phone"
                                        value={data.contact_person_phone}
                                        onChange={(value) =>
                                            setField(
                                                'contact_person_phone',
                                                value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.contact_person_phone}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="contact_person_email">
                                        Contact email
                                    </Label>
                                    <Input
                                        id="contact_person_email"
                                        type="email"
                                        value={data.contact_person_email ?? ''}
                                        onChange={(e) =>
                                            setField(
                                                'contact_person_email',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="contact@company.com"
                                    />
                                    <InputError
                                        message={errors.contact_person_email}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
