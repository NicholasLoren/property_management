import { Head, Link, usePage } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    Calendar,
    CreditCard,
    FileText,
    Pencil,
    UserRound,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import leases from '@/routes/leases';
import payments from '@/routes/payments';
import units from '@/routes/units';

type PaymentShowRow = {
    id: number;
    reference: string | null;
    amount: string;
    payment_date: string;
    method: string;
    method_label: string;
    status: string;
    status_label: string;
    notes: string | null;
    lease_id: number | null;
    unit_id: number | null;
    unit_name: string | null;
    property_id: number | null;
    property_name: string | null;
    tenant_id: number | null;
    tenant_name: string | null;
    lease_tenant_names: string | null;
    schedule_period: string | null;
    created_by_name: string | null;
    created_at: string | null;
    receipt: { name: string; url: string } | null;
};

type PageProps = { payment: PaymentShowRow };

function statusVariant(status: string): 'default' | 'outline' | 'destructive' {
    if (status === 'completed') {
        return 'default';
    }

    if (status === 'failed') {
        return 'destructive';
    }

    return 'outline';
}

function StatTile({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-border-soft p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <Icon className="size-4" />
            </span>
            <div>
                <div className="text-xs text-text-tertiary">{label}</div>
                <div className="text-[13px] font-semibold text-foreground">
                    {value}
                </div>
            </div>
        </div>
    );
}

export default function PaymentShow({ payment }: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();
    const title = payment.reference ?? `Payment #${payment.id}`;

    return (
        <>
            <Head title={title} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Payments', href: payments.index() },
                        { title, href: payments.show(payment.id) },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {title}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(payment.status)}>
                            {payment.status_label}
                        </Badge>
                        {payment.unit_name &&
                            payment.property_id &&
                            payment.unit_id && (
                                <Link
                                    href={units.show([
                                        payment.property_id,
                                        payment.unit_id,
                                    ])}
                                    className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-accent-strong hover:underline"
                                >
                                    <Building2 className="size-3.5" />
                                    {payment.unit_name} —{' '}
                                    {payment.property_name}
                                </Link>
                            )}
                    </div>
                </div>
                {can('payments.edit') && (
                    <Button variant="outline" asChild>
                        <Link href={payments.edit(payment.id)}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
                <StatTile
                    icon={Banknote}
                    label="Amount"
                    value={formatCurrency(payment.amount, currency)}
                />
                <StatTile
                    icon={Calendar}
                    label="Payment date"
                    value={formatDate(payment.payment_date, timezone)}
                />
                <StatTile
                    icon={CreditCard}
                    label="Method"
                    value={payment.method_label}
                />
                <StatTile
                    icon={UserRound}
                    label="Tenant"
                    value={
                        payment.tenant_name ?? payment.lease_tenant_names ?? '–'
                    }
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                        <FileText className="size-[15px]" />
                        Notes
                    </h2>
                    <p className="text-sm whitespace-pre-line text-text-secondary">
                        {payment.notes ?? 'No notes provided.'}
                    </p>

                    {payment.receipt && (
                        <div className="mt-4 border-t border-border-soft pt-4">
                            <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                Receipt
                            </p>
                            <a
                                href={payment.receipt.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] font-medium text-accent-strong hover:underline"
                            >
                                {payment.receipt.name}
                            </a>
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Summary
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Reference</dt>
                            <dd className="text-right font-medium">
                                {payment.reference ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Period</dt>
                            <dd className="text-right font-medium">
                                {payment.schedule_period ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Recorded by</dt>
                            <dd className="text-right font-medium">
                                {payment.created_by_name ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Recorded on</dt>
                            <dd className="text-right font-medium">
                                {formatDate(payment.created_at, timezone)}
                            </dd>
                        </div>
                    </dl>

                    {payment.lease_id && can('leases.view') && (
                        <Link
                            href={leases.show(payment.lease_id)}
                            className="mt-3 block border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                        >
                            View lease →
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}
