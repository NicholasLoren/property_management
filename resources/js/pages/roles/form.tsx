import { Head, Link } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import roles from '@/routes/roles';
import { ROLE_DESCRIPTION_MAX_LENGTH, roleSchema } from '@/schemas/role';
import type { PermissionCategoryOption, RoleRow } from '@/types/roles';

type PageProps = {
    role?: RoleRow;
    permissionCategories: PermissionCategoryOption[];
};

export default function RoleForm({ role, permissionCategories }: PageProps) {
    const isEdit = Boolean(role);
    const isSystem = role?.is_system ?? false;

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        roleSchema,
        {
            name: role?.name ?? '',
            description: role?.description ?? '',
            permissions: role?.permission_ids ?? [],
        },
    );

    const allPermissionIds = useMemo(
        () =>
            permissionCategories.flatMap((c) => c.permissions.map((p) => p.id)),
        [permissionCategories],
    );
    const allPermissionsSelected =
        allPermissionIds.length > 0 &&
        allPermissionIds.every((id) => data.permissions.includes(id));

    function togglePermission(id: number, checked: boolean) {
        setField(
            'permissions',
            checked
                ? [...data.permissions, id]
                : data.permissions.filter((p) => p !== id),
        );
    }

    function toggleAllPermissions() {
        setField('permissions', allPermissionsSelected ? [] : allPermissionIds);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isSystem) {
            return;
        }

        if (isEdit) {
            submit('patch', roles.update(role!).url);
        } else {
            submit('post', roles.store().url);
        }
    }

    return (
        <>
            <Head title={isEdit ? 'Edit role' : 'Add role'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Roles', href: roles.index() },
                        {
                            title: isEdit ? 'Edit role' : 'Add role',
                            href: isEdit ? roles.edit(role!) : roles.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit role' : 'Add role'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isSystem
                        ? 'This is a protected system role — its name and permissions can’t be changed.'
                        : 'Name the role and choose which permissions it grants.'}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            autoFocus={!isSystem}
                            disabled={isSystem}
                            value={data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="e.g. Property Manager"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="description">
                            Description{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Textarea
                            id="description"
                            disabled={isSystem}
                            value={data.description ?? ''}
                            onChange={(e) =>
                                setField('description', e.target.value)
                            }
                            maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                            placeholder="What this role is for"
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <Label>Permissions</Label>
                            {!isSystem && allPermissionIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={toggleAllPermissions}
                                    className="text-xs font-semibold text-accent-strong hover:underline"
                                >
                                    {allPermissionsSelected
                                        ? 'Deselect all'
                                        : 'Select all'}
                                </button>
                            )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {permissionCategories.map((category) => (
                                <div
                                    key={category.id}
                                    className="rounded-lg border border-border-soft p-3"
                                >
                                    <p className="mb-2 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                        {category.label}
                                    </p>
                                    <div className="grid gap-2">
                                        {category.permissions.map(
                                            (permission) => (
                                                <label
                                                    key={permission.id}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <Checkbox
                                                        disabled={isSystem}
                                                        checked={
                                                            isSystem ||
                                                            data.permissions.includes(
                                                                permission.id,
                                                            )
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            togglePermission(
                                                                permission.id,
                                                                checked ===
                                                                    true,
                                                            )
                                                        }
                                                    />
                                                    {permission.label}
                                                </label>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <InputError message={errors.permissions} />
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={roles.index()}>Cancel</Link>
                    </Button>
                    {!isSystem && (
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {isEdit ? 'Save changes' : 'Add role'}
                        </Button>
                    )}
                    {isSystem && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                            <ShieldCheck className="size-3.5" />
                            System role
                        </span>
                    )}
                </div>
            </form>
        </>
    );
}
