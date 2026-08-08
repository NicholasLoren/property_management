import { Head, Link, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
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
import users from '@/routes/users';
import { userSchema } from '@/schemas/user';

const LANDLORD_ROLE = 'Landlord';

type Option = { value: string; label: string };

type UserFormRow = {
    id: number;
    name: string;
    email: string;
    role?: string;
    status?: string;
    landlord_id_number: string | null;
    landlord_address: string | null;
    landlord_phone: string | null;
    landlord_notes: string | null;
    landlord_id_document: { name: string; url: string } | null;
    avatar: { name: string; url: string } | null;
};

type PageProps = {
    user?: UserFormRow;
    roles: Option[];
    statuses: Option[];
    defaultRole?: string | null;
};

export default function UserForm({
    user,
    roles,
    statuses,
    defaultRole,
}: PageProps) {
    const { name: appName } = usePage().props;
    const isEdit = Boolean(user);
    const [existingDocRemoved, setExistingDocRemoved] = useState(false);
    const [existingAvatarRemoved, setExistingAvatarRemoved] = useState(false);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        userSchema,
        {
            name: user?.name ?? '',
            email: user?.email ?? '',
            role: user?.role ?? defaultRole ?? roles[0]?.value ?? '',
            status: user?.status ?? statuses[0]?.value,
            landlord_id_number: user?.landlord_id_number ?? '',
            landlord_address: user?.landlord_address ?? '',
            landlord_phone: user?.landlord_phone ?? '',
            landlord_notes: user?.landlord_notes ?? '',
            landlord_id_document: null,
            landlord_id_document_remove: false,
            avatar: null,
            avatar_remove: false,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('patch', users.update(user!).url);
        } else {
            submit('post', users.store().url);
        }
    }

    const showLandlordSection = data.role === LANDLORD_ROLE;
    const existingDocument =
        !existingDocRemoved && user ? user.landlord_id_document : null;
    const existingAvatar = !existingAvatarRemoved && user ? user.avatar : null;

    return (
        <>
            <Head title={isEdit ? 'Edit user' : 'Invite user'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Users', href: users.index() },
                        {
                            title: isEdit ? 'Edit user' : 'Invite user',
                            href: isEdit ? users.edit(user!) : users.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit user' : 'Invite user'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isEdit
                        ? 'Update this account’s details, role, and status.'
                        : `Send a staff or landlord invitation to join ${appName}.`}
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
                            placeholder="Full name"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="email">
                            Email
                            <RequiredAsterisk />
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setField('email', e.target.value)}
                            placeholder="name@company.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="role">
                            Role
                            <RequiredAsterisk />
                        </Label>
                        <SearchableSelect
                            id="role"
                            value={data.role}
                            onChange={(value) => setField('role', value ?? '')}
                            options={roles}
                            placeholder="Select a role…"
                            searchPlaceholder="Search roles…"
                        />
                        <InputError message={errors.role} />
                    </div>

                    {isEdit && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={data.status}
                                onValueChange={(value) =>
                                    setField('status', value)
                                }
                            >
                                <SelectTrigger id="status" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((status) => (
                                        <SelectItem
                                            key={status.value}
                                            value={status.value}
                                        >
                                            {status.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.status} />
                        </div>
                    )}
                </div>

                {showLandlordSection && (
                    <div className="mt-5 border-t border-border-soft pt-4">
                        <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            Landlord details
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="landlord_id_number">
                                    ID / registration number
                                </Label>
                                <Input
                                    id="landlord_id_number"
                                    value={data.landlord_id_number ?? ''}
                                    onChange={(e) =>
                                        setField(
                                            'landlord_id_number',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. National ID or company registration no."
                                />
                                <InputError
                                    message={errors.landlord_id_number}
                                />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="landlord_address">
                                    Address
                                </Label>
                                <Input
                                    id="landlord_address"
                                    value={data.landlord_address ?? ''}
                                    onChange={(e) =>
                                        setField(
                                            'landlord_address',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Physical address"
                                />
                                <InputError message={errors.landlord_address} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="landlord_phone">
                                    Phone{' '}
                                    <span className="font-normal text-text-tertiary">
                                        (for SMS rent reminders)
                                    </span>
                                </Label>
                                <Input
                                    id="landlord_phone"
                                    value={data.landlord_phone ?? ''}
                                    onChange={(e) =>
                                        setField(
                                            'landlord_phone',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. +256700000000"
                                />
                                <InputError message={errors.landlord_phone} />
                            </div>

                            <div className="grid gap-1.5 sm:col-span-2">
                                <Label htmlFor="landlord_notes">Notes</Label>
                                <Textarea
                                    id="landlord_notes"
                                    value={data.landlord_notes ?? ''}
                                    onChange={(e) =>
                                        setField(
                                            'landlord_notes',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Anything else worth noting about this landlord"
                                    maxLength={2000}
                                />
                                <InputError message={errors.landlord_notes} />
                            </div>

                            <div className="grid gap-1.5 sm:col-span-2">
                                <Label>ID / registration document</Label>
                                <FileDropzone
                                    value={data.landlord_id_document ?? null}
                                    onChange={(file) => {
                                        setField('landlord_id_document', file);
                                        setField(
                                            'landlord_id_document_remove',
                                            false,
                                        );
                                    }}
                                    existing={existingDocument}
                                    onRemoveExisting={() => {
                                        setExistingDocRemoved(true);
                                        setField(
                                            'landlord_id_document_remove',
                                            true,
                                        );
                                    }}
                                    error={errors.landlord_id_document}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={users.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Send invite'}
                    </Button>
                </div>
            </form>
        </>
    );
}
