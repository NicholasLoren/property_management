import { Head, Link, usePage } from '@inertiajs/react';
import { Banknote, Calendar, FileText, Pencil, Wallet } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import leases from '@/routes/leases';
import payments from '@/routes/payments';
import tenants from '@/routes/tenants';
import type { LeaseDocument } from '@/types/leases';

type LeaseTenant = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

type LeasePayment = {
    id: number;
    amount: string;
    payment_date: string;
    method_label: string;
    status: string;
    status_label: string;
    reference: string | null;
};

type LeasePaymentsSummary = {
    total_collected: string;
    payments_count: number;
};

type LeaseShowRow = {
    id: number;
    unit: { id: number; name: string; property_name: string | null } | null;
    tenants: LeaseTenant[];
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
    billing_day: number;
    security_deposit: string | null;
    status: string;
    status_label: string;
    notes: string | null;
    document: LeaseDocument | null;
    payments: LeasePayment[];
    payments_summary: LeasePaymentsSummary;
    created_at: string | null;
};

type PageProps = { lease: LeaseShowRow };

const STATUS_BADGE_CLASS: Record<string, string> = {
    draft: 'bg-secondary text-text-secondary',
    active: 'bg-success-soft text-success',
    ended: 'bg-secondary text-text-secondary',
    terminated: 'bg-destructive/10 text-destructive',
};

const PAYMENT_STATUS_CLASS: Record<string, string> = {
    completed: 'bg-success-soft text-success',
    refunded: 'bg-warning-soft text-warning',
    failed: 'bg-destructive/10 text-destructive',
};

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

export default function LeaseShow({ lease }: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();

    return (
        <>
            <Head title={`Lease #${lease.id}`} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Leases', href: leases.index() },
                        {
                            title: `Lease #${lease.id}`,
                            href: leases.show(lease),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {lease.unit?.name} — {lease.unit?.property_name}
                    </h1>
                    <div className="mt-1 flex items-center gap-2">
                        <Badge className={STATUS_BADGE_CLASS[lease.status]}>
                            {lease.status_label}
                        </Badge>
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary">
                            <Calendar className="size-3.5 text-text-tertiary" />
                            {formatDate(lease.start_date, timezone)} –{' '}
                            {formatDate(lease.end_date, timezone)}
                        </span>
                    </div>
                </div>
                {can('leases.edit') && (
                    <Button variant="outline" asChild>
                        <Link href={leases.edit(lease)}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
                <StatTile
                    icon={Wallet}
                    label="Rent"
                    value={`${formatCurrency(lease.rent_amount, currency)} / ${lease.billing_period_label.toLowerCase()}`}
                />
                <StatTile
                    icon={Banknote}
                    label="Total collected"
                    value={formatCurrency(
                        lease.payments_summary.total_collected,
                        currency,
                    )}
                />
                <StatTile
                    icon={FileText}
                    label="Payments recorded"
                    value={`${lease.payments_summary.payments_count}`}
                />
                <StatTile
                    icon={Calendar}
                    label="Security deposit"
                    value={
                        lease.security_deposit
                            ? formatCurrency(lease.security_deposit, currency)
                            : '–'
                    }
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Tenants
                    </h2>
                    {lease.tenants.length === 0 ? (
                        <p className="text-sm text-text-tertiary">
                            No tenants attached.
                        </p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {lease.tenants.map((tenant) => (
                                <Link
                                    key={tenant.id}
                                    href={tenants.show(tenant)}
                                    className="flex items-center gap-2.5 rounded-lg border border-border-soft px-3 py-2.5 hover:border-accent-brand"
                                >
                                    <EntityAvatar
                                        name={tenant.name}
                                        seed={tenant.id}
                                        className="size-8 text-xs"
                                    />
                                    <div className="min-w-0">
                                        <div className="truncate text-[13px] font-semibold text-foreground">
                                            {tenant.name}
                                        </div>
                                        <div className="truncate text-xs text-text-tertiary">
                                            {tenant.email ??
                                                tenant.phone ??
                                                '–'}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {lease.notes && (
                        <p className="mt-3 border-t border-border-soft pt-3 text-sm whitespace-pre-line text-text-secondary">
                            {lease.notes}
                        </p>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Terms
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Rent</dt>
                            <dd className="text-right font-medium">
                                {formatCurrency(lease.rent_amount, currency)}{' '}
                                <span className="text-text-tertiary">
                                    / {lease.billing_period_label.toLowerCase()}
                                </span>
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Rent due day</dt>
                            <dd className="text-right font-medium">
                                Day {lease.billing_day} of each cycle
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">
                                Security deposit
                            </dt>
                            <dd className="text-right font-medium">
                                {lease.security_deposit
                                    ? formatCurrency(
                                          lease.security_deposit,
                                          currency,
                                      )
                                    : '–'}
                            </dd>
                        </div>
                    </dl>

                    {lease.document && (
                        <a
                            href={lease.document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                        >
                            <FileText className="size-[15px]" />
                            {lease.document.name}
                        </a>
                    )}
                </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                    <Banknote className="size-[15px]" />
                    Payment history
                </h2>
                {lease.payments.length > 0 ? (
                    <ul className="grid gap-2">
                        {lease.payments.map((payment) => {
                            const row = (
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border-soft px-3 py-2.5">
                                    <div>
                                        <div className="text-[13px] font-semibold text-foreground">
                                            {formatCurrency(
                                                payment.amount,
                                                currency,
                                            )}
                                        </div>
                                        <div className="text-xs text-text-tertiary">
                                            {formatDate(
                                                payment.payment_date,
                                                timezone,
                                            )}{' '}
                                            · {payment.method_label}
                                            {payment.reference &&
                                                ` · ${payment.reference}`}
                                        </div>
                                    </div>
                                    <Badge
                                        className={
                                            PAYMENT_STATUS_CLASS[payment.status]
                                        }
                                    >
                                        {payment.status_label}
                                    </Badge>
                                </div>
                            );

                            return (
                                <li key={payment.id}>
                                    {can('payments.edit') ? (
                                        <Link
                                            href={payments.edit(payment.id)}
                                            className="block hover:opacity-80"
                                        >
                                            {row}
                                        </Link>
                                    ) : (
                                        row
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="rounded-lg border border-dashed border-border-soft px-3 py-6 text-center text-[13px] text-text-tertiary">
                        No payments have been recorded against this lease yet.
                    </p>
                )}
            </div>
        </>
    );
}
