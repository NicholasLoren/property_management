import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useMemo } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import payments from '@/routes/payments';
import { paymentCreateSchema, paymentEditSchema } from '@/schemas/payment';
import type { PaymentReceipt } from '@/types/payments';

type Option = { value: string; label: string };
type SchedulePeriodOption = Option & { balance: string };
type LeaseOption = Option & {
    tenants: Option[];
    schedule_periods: SchedulePeriodOption[];
};

type PaymentFormRow = {
    id: number;
    lease_id: string;
    lease_label: string | null;
    payment_schedule_id: string | null;
    lease_schedule_periods: Option[];
    tenant_id: string | null;
    lease_tenants: Option[];
    amount: string;
    payment_date: string;
    method: 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' | 'other';
    status: 'completed' | 'refunded' | 'failed';
    reference: string | null;
    notes: string | null;
    receipt: PaymentReceipt | null;
};

type PageProps = {
    payment?: PaymentFormRow;
    leases: LeaseOption[];
    methods: Option[];
    statuses: Option[];
};

export default function PaymentForm({
    payment,
    leases,
    methods,
    statuses,
}: PageProps) {
    return payment ? (
        <PaymentEditForm
            payment={payment}
            methods={methods}
            statuses={statuses}
        />
    ) : (
        <PaymentCreateForm
            leases={leases}
            methods={methods}
            statuses={statuses}
        />
    );
}

function PaymentCreateForm({
    leases,
    methods,
    statuses,
}: {
    leases: LeaseOption[];
    methods: Option[];
    statuses: Option[];
}) {
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        paymentCreateSchema,
        {
            lease_id: '',
            payment_schedule_ids: [],
            tenant_id: '',
            amount: '',
            payment_date: '',
            method: 'mobile_money',
            status: 'completed',
            reference: '',
            notes: '',
            receipt: null,
            receipt_remove: false,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('post', payments.store().url);
    }

    const tenantOptions = useMemo(
        () =>
            leases.find((lease) => lease.value === data.lease_id)?.tenants ??
            [],
        [leases, data.lease_id],
    );

    const schedulePeriodOptions = useMemo(
        () =>
            leases.find((lease) => lease.value === data.lease_id)
                ?.schedule_periods ?? [],
        [leases, data.lease_id],
    );

    function toggleSchedule(id: string, checked: boolean) {
        const nextIds = checked
            ? [...data.payment_schedule_ids, id]
            : data.payment_schedule_ids.filter((value) => value !== id);

        setField('payment_schedule_ids', nextIds);

        const sum = schedulePeriodOptions
            .filter((period) => nextIds.includes(period.value))
            .reduce((total, period) => total + Number(period.balance), 0);

        setField('amount', nextIds.length > 0 ? sum.toFixed(2) : '');
    }

    const multipleSelected = data.payment_schedule_ids.length > 1;

    return (
        <>
            <Head title="Record payment" />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Payments', href: payments.index() },
                        { title: 'Record payment', href: payments.create() },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Record payment
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Record rent received against a lease.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="lease_id">
                            Lease
                            <RequiredAsterisk />
                        </Label>
                        <SearchableSelect
                            id="lease_id"
                            value={data.lease_id || null}
                            onChange={(value) => {
                                setField('lease_id', value ?? '');
                                setField('tenant_id', '');
                                setField('payment_schedule_ids', []);
                                setField('amount', '');
                            }}
                            options={leases}
                            placeholder="Select a lease…"
                            searchPlaceholder="Search leases…"
                        />
                        <InputError message={errors.lease_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="tenant_id">
                            Paying tenant{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <SearchableSelect
                            id="tenant_id"
                            value={data.tenant_id || null}
                            onChange={(value) =>
                                setField('tenant_id', value ?? '')
                            }
                            options={tenantOptions}
                            placeholder="Any / unspecified"
                            searchPlaceholder="Search tenants…"
                            disabled={tenantOptions.length === 0}
                        />
                        <InputError message={errors.tenant_id} />
                    </div>
                </div>

                <div className="mt-4 grid gap-1.5">
                    <Label>
                        Rent period(s)
                        <RequiredAsterisk />
                    </Label>
                    {schedulePeriodOptions.length > 0 ? (
                        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border border-border-soft p-3">
                            {schedulePeriodOptions.map((period) => (
                                <label
                                    key={period.value}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={data.payment_schedule_ids.includes(
                                            period.value,
                                        )}
                                        onCheckedChange={(checked) =>
                                            toggleSchedule(
                                                period.value,
                                                checked === true,
                                            )
                                        }
                                    />
                                    {period.label}
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-9 items-center rounded-md border border-border-soft bg-secondary px-3 text-sm text-text-tertiary">
                            {data.lease_id
                                ? 'This lease has no outstanding rent periods.'
                                : 'Select a lease first.'}
                        </div>
                    )}
                    <InputError message={errors.payment_schedule_ids} />
                    {multipleSelected && (
                        <p className="text-xs text-text-tertiary">
                            Amount is the total for all selected periods — each
                            will be recorded as its own fully paid payment.
                        </p>
                    )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="amount">
                            Amount
                            <RequiredAsterisk />
                        </Label>
                        <Input
                            id="amount"
                            inputMode="decimal"
                            value={data.amount}
                            onChange={(e) => setField('amount', e.target.value)}
                            placeholder="e.g. 450000"
                            disabled={multipleSelected}
                        />
                        <InputError message={errors.amount} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="payment_date">
                            Payment date
                            <RequiredAsterisk />
                        </Label>
                        <Input
                            id="payment_date"
                            type="date"
                            value={data.payment_date}
                            onChange={(e) =>
                                setField('payment_date', e.target.value)
                            }
                        />
                        <InputError message={errors.payment_date} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="method">
                            Method
                            <RequiredAsterisk />
                        </Label>
                        <Select
                            value={data.method}
                            onValueChange={(value) =>
                                setField('method', value as typeof data.method)
                            }
                        >
                            <SelectTrigger id="method" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {methods.map((method) => (
                                    <SelectItem
                                        key={method.value}
                                        value={method.value}
                                    >
                                        {method.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.method} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="status">
                            Status
                            <RequiredAsterisk />
                        </Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) =>
                                setField('status', value as typeof data.status)
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
                        <Label htmlFor="reference">
                            Reference{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="reference"
                            value={data.reference ?? ''}
                            onChange={(e) =>
                                setField('reference', e.target.value)
                            }
                            placeholder="Transaction / receipt no."
                        />
                        <InputError message={errors.reference} />
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
                        Receipt{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <FileDropzone
                        value={data.receipt ?? null}
                        onChange={(file) => {
                            setField('receipt', file);
                            setField('receipt_remove', false);
                        }}
                        existing={null}
                        onRemoveExisting={() =>
                            setField('receipt_remove', true)
                        }
                        error={errors.receipt}
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={payments.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        Record payment
                    </Button>
                </div>
            </form>
        </>
    );
}

function PaymentEditForm({
    payment,
    methods,
    statuses,
}: {
    payment: PaymentFormRow;
    methods: Option[];
    statuses: Option[];
}) {
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        paymentEditSchema,
        {
            lease_id: payment.lease_id,
            payment_schedule_id: payment.payment_schedule_id ?? '',
            tenant_id: payment.tenant_id ?? '',
            amount: payment.amount,
            payment_date: payment.payment_date,
            method: payment.method,
            status: payment.status,
            reference: payment.reference ?? '',
            notes: payment.notes ?? '',
            receipt: null,
            receipt_remove: false,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('put', payments.update(payment).url);
    }

    return (
        <>
            <Head title="Edit payment" />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Payments', href: payments.index() },
                        {
                            title: 'Edit payment',
                            href: payments.edit(payment),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Edit payment
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Update this payment’s details.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="lease_id">Lease</Label>
                        <div className="flex h-9 items-center rounded-md border border-border-soft bg-secondary px-3 text-sm text-text-secondary">
                            {payment.lease_label}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="payment_schedule_id">
                            Rent period
                            <RequiredAsterisk />
                        </Label>
                        <SearchableSelect
                            id="payment_schedule_id"
                            value={data.payment_schedule_id || null}
                            onChange={(value) =>
                                setField('payment_schedule_id', value ?? '')
                            }
                            options={payment.lease_schedule_periods}
                            placeholder="Select a rent period…"
                            searchPlaceholder="Search periods…"
                            disabled={
                                payment.lease_schedule_periods.length === 0
                            }
                        />
                        <InputError message={errors.payment_schedule_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="tenant_id">
                            Paying tenant{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <SearchableSelect
                            id="tenant_id"
                            value={data.tenant_id || null}
                            onChange={(value) =>
                                setField('tenant_id', value ?? '')
                            }
                            options={payment.lease_tenants}
                            placeholder="Any / unspecified"
                            searchPlaceholder="Search tenants…"
                            disabled={payment.lease_tenants.length === 0}
                        />
                        <InputError message={errors.tenant_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="amount">
                            Amount
                            <RequiredAsterisk />
                        </Label>
                        <Input
                            id="amount"
                            inputMode="decimal"
                            value={data.amount}
                            onChange={(e) => setField('amount', e.target.value)}
                            placeholder="e.g. 450000"
                        />
                        <InputError message={errors.amount} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="payment_date">
                            Payment date
                            <RequiredAsterisk />
                        </Label>
                        <Input
                            id="payment_date"
                            type="date"
                            value={data.payment_date}
                            onChange={(e) =>
                                setField('payment_date', e.target.value)
                            }
                        />
                        <InputError message={errors.payment_date} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="method">
                            Method
                            <RequiredAsterisk />
                        </Label>
                        <Select
                            value={data.method}
                            onValueChange={(value) =>
                                setField('method', value as typeof data.method)
                            }
                        >
                            <SelectTrigger id="method" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {methods.map((method) => (
                                    <SelectItem
                                        key={method.value}
                                        value={method.value}
                                    >
                                        {method.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.method} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="status">
                            Status
                            <RequiredAsterisk />
                        </Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) =>
                                setField('status', value as typeof data.status)
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
                        <Label htmlFor="reference">
                            Reference{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="reference"
                            value={data.reference ?? ''}
                            onChange={(e) =>
                                setField('reference', e.target.value)
                            }
                            placeholder="Transaction / receipt no."
                        />
                        <InputError message={errors.reference} />
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
                        Receipt{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <FileDropzone
                        value={data.receipt ?? null}
                        onChange={(file) => {
                            setField('receipt', file);
                            setField('receipt_remove', false);
                        }}
                        existing={
                            !data.receipt_remove
                                ? (payment.receipt ?? null)
                                : null
                        }
                        onRemoveExisting={() =>
                            setField('receipt_remove', true)
                        }
                        error={errors.receipt}
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={payments.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        Save changes
                    </Button>
                </div>
            </form>
        </>
    );
}
