import { Head, Link } from '@inertiajs/react';
import { X } from 'lucide-react';
import type { FormEvent } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
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
import leases from '@/routes/leases';
import { leaseSchema } from '@/schemas/lease';
import type { LeaseDocument } from '@/types/leases';

type Option = { value: string; label: string };

type LeaseFormRow = {
    id: number;
    unit_id: string;
    unit_label: string | null;
    tenant_ids: number[];
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period: 'monthly' | 'quarterly' | 'yearly';
    security_deposit: string | null;
    status: 'draft' | 'active' | 'ended' | 'terminated';
    notes: string | null;
    document: LeaseDocument | null;
};

type PageProps = {
    lease?: LeaseFormRow;
    units: Option[];
    tenants: { value: number; label: string }[];
    statuses: Option[];
    billingPeriods: Option[];
};

export default function LeaseForm({
    lease,
    units,
    tenants,
    statuses,
    billingPeriods,
}: PageProps) {
    const isEdit = Boolean(lease);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        leaseSchema,
        {
            unit_id: lease?.unit_id ?? '',
            tenant_ids: lease?.tenant_ids ?? [],
            start_date: lease?.start_date ?? '',
            end_date: lease?.end_date ?? '',
            rent_amount: lease?.rent_amount ?? '',
            billing_period: lease?.billing_period ?? 'monthly',
            security_deposit: lease?.security_deposit ?? '',
            status: lease?.status ?? 'draft',
            notes: lease?.notes ?? '',
            document: null,
            document_remove: false,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', leases.update(lease!).url);
        } else {
            submit('post', leases.store().url);
        }
    }

    function addTenant(id: string | null) {
        if (!id) {
            return;
        }

        setField('tenant_ids', [...data.tenant_ids, Number(id)]);
    }

    function removeTenant(id: number) {
        setField(
            'tenant_ids',
            data.tenant_ids.filter((t) => t !== id),
        );
    }

    const availableTenants = tenants
        .filter((tenant) => !data.tenant_ids.includes(tenant.value))
        .map((tenant) => ({ value: String(tenant.value), label: tenant.label }));

    const selectedTenants = data.tenant_ids
        .map((id) => tenants.find((tenant) => tenant.value === id))
        .filter((tenant): tenant is { value: number; label: string } => Boolean(tenant));

    return (
        <>
            <Head title={isEdit ? 'Edit lease' : 'Add lease'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Leases', href: leases.index() },
                        {
                            title: isEdit ? 'Edit lease' : 'Add lease',
                            href: isEdit ? leases.edit(lease!) : leases.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit lease' : 'Add lease'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isEdit
                        ? 'Update this lease’s term, rent, and tenants.'
                        : 'Set up a tenancy for a unit and its tenant(s).'}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="unit_id">Unit</Label>
                        {isEdit ? (
                            <div className="flex h-9 items-center rounded-md border border-border-soft bg-secondary px-3 text-sm text-text-secondary">
                                {lease!.unit_label}
                            </div>
                        ) : (
                            <>
                                <SearchableSelect
                                    id="unit_id"
                                    value={data.unit_id || null}
                                    onChange={(value) =>
                                        setField('unit_id', value ?? '')
                                    }
                                    options={units}
                                    placeholder="Select a unit…"
                                    searchPlaceholder="Search units…"
                                />
                                <InputError message={errors.unit_id} />
                            </>
                        )}
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) =>
                                setField(
                                    'status',
                                    value as typeof data.status,
                                )
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

                    <div className="grid gap-1.5">
                        <Label htmlFor="start_date">Start date</Label>
                        <Input
                            id="start_date"
                            type="date"
                            value={data.start_date}
                            onChange={(e) =>
                                setField('start_date', e.target.value)
                            }
                        />
                        <InputError message={errors.start_date} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="end_date">End date</Label>
                        <Input
                            id="end_date"
                            type="date"
                            min={data.start_date || undefined}
                            value={data.end_date}
                            onChange={(e) =>
                                setField('end_date', e.target.value)
                            }
                        />
                        <InputError message={errors.end_date} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="rent_amount">Rent amount</Label>
                        <Input
                            id="rent_amount"
                            inputMode="decimal"
                            value={data.rent_amount}
                            onChange={(e) =>
                                setField('rent_amount', e.target.value)
                            }
                            placeholder="e.g. 850000"
                        />
                        <InputError message={errors.rent_amount} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="billing_period">Billing period</Label>
                        <Select
                            value={data.billing_period}
                            onValueChange={(value) =>
                                setField(
                                    'billing_period',
                                    value as typeof data.billing_period,
                                )
                            }
                        >
                            <SelectTrigger
                                id="billing_period"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {billingPeriods.map((period) => (
                                    <SelectItem
                                        key={period.value}
                                        value={period.value}
                                    >
                                        {period.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.billing_period} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="security_deposit">
                            Security deposit{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="security_deposit"
                            inputMode="decimal"
                            value={data.security_deposit ?? ''}
                            onChange={(e) =>
                                setField('security_deposit', e.target.value)
                            }
                            placeholder="e.g. 850000"
                        />
                        <InputError message={errors.security_deposit} />
                    </div>
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-2">Tenants</Label>
                    <SearchableSelect
                        value={null}
                        onChange={addTenant}
                        options={availableTenants}
                        placeholder="Add a tenant…"
                        searchPlaceholder="Search tenants…"
                    />
                    <InputError message={errors.tenant_ids} />
                    {selectedTenants.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {selectedTenants.map((tenant) => (
                                <Badge
                                    key={tenant.value}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                >
                                    {tenant.label}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeTenant(tenant.value)
                                        }
                                        className="rounded-full p-0.5 hover:bg-black/10"
                                    >
                                        <X className="size-2.5" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
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
                        placeholder="Anything else worth noting about this lease"
                    />
                    <InputError message={errors.notes} />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-3">
                        Lease document{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <FileDropzone
                        value={data.document ?? null}
                        onChange={(file) => {
                            setField('document', file);
                            setField('document_remove', false);
                        }}
                        existing={
                            !data.document_remove
                                ? (lease?.document ?? null)
                                : null
                        }
                        onRemoveExisting={() =>
                            setField('document_remove', true)
                        }
                        error={errors.document}
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={leases.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add lease'}
                    </Button>
                </div>
            </form>
        </>
    );
}
