import { Head, Link, usePage } from '@inertiajs/react';
import { FileText, Pencil } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import leases from '@/routes/leases';
import tenants from '@/routes/tenants';
import type { LeaseDocument } from '@/types/leases';

type LeaseTenant = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

type LeaseShowRow = {
    id: number;
    unit: { id: number; name: string; property_name: string | null } | null;
    tenants: LeaseTenant[];
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
    security_deposit: string | null;
    status: string;
    status_label: string;
    notes: string | null;
    document: LeaseDocument | null;
    created_at: string | null;
};

type PageProps = { lease: LeaseShowRow };

export default function LeaseShow({ lease }: PageProps) {
    const { currency } = usePage().props;
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
                        <Badge variant="outline">{lease.status_label}</Badge>
                        <span className="text-[13px] text-text-secondary">
                            {lease.start_date} – {lease.end_date}
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

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Tenants
                    </h2>
                    {lease.tenants.length === 0 ? (
                        <p className="text-sm text-text-tertiary">
                            No tenants attached.
                        </p>
                    ) : (
                        <div className="divide-y divide-border-soft">
                            {lease.tenants.map((tenant) => (
                                <Link
                                    key={tenant.id}
                                    href={tenants.show(tenant)}
                                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                                >
                                    <span className="text-[13px] font-semibold">
                                        {tenant.name}
                                    </span>
                                    <span className="text-xs text-text-tertiary">
                                        {tenant.email ?? tenant.phone ?? '–'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {lease.notes && (
                        <p className="mt-3 border-t border-border-soft pt-3 text-sm text-text-secondary">
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
        </>
    );
}
