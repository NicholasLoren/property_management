import { Head, Link, usePage } from '@inertiajs/react';
import { FileText, Mail, Pencil, Phone } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import leases from '@/routes/leases';
import tenants from '@/routes/tenants';
import type { TenantDocument } from '@/types/tenants';

type TenantLease = {
    id: number;
    unit_name: string | null;
    property_name: string | null;
    status: string;
    status_label: string;
    start_date: string;
    end_date: string;
    rent_amount: string;
};

type TenantShowRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    avatar?: string | null;
    id_number: string | null;
    address: string | null;
    notes: string | null;
    id_document: TenantDocument | null;
    leases: TenantLease[];
    created_at: string | null;
};

type PageProps = { tenant: TenantShowRow };

export default function TenantShow({ tenant }: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();

    return (
        <>
            <Head title={tenant.name} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Tenants', href: tenants.index() },
                        { title: tenant.name, href: tenants.show(tenant) },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <EntityAvatar
                        name={tenant.name}
                        seed={tenant.id}
                        imageUrl={tenant.avatar}
                        className="size-12 text-base"
                    />
                    <div>
                        <h1 className="text-[21px] font-extrabold tracking-tight">
                            {tenant.name}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-secondary">
                            {tenant.email && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Mail className="size-[13px]" />
                                    {tenant.email}
                                </span>
                            )}
                            {tenant.phone && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Phone className="size-[13px]" />
                                    {tenant.phone}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {can('tenants.edit') && (
                    <Button variant="outline" asChild>
                        <Link href={tenants.edit(tenant)}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Leases
                    </h2>
                    {tenant.leases.length === 0 ? (
                        <p className="text-sm text-text-tertiary">
                            No leases yet.
                        </p>
                    ) : (
                        <div className="divide-y divide-border-soft">
                            {tenant.leases.map((lease) => (
                                <Link
                                    key={lease.id}
                                    href={leases.show(lease)}
                                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                                >
                                    <div>
                                        <div className="text-[13px] font-semibold">
                                            {lease.unit_name} —{' '}
                                            {lease.property_name}
                                        </div>
                                        <div className="mt-0.5 text-xs text-text-tertiary">
                                            {lease.start_date} –{' '}
                                            {lease.end_date}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[13px] font-medium">
                                            {formatCurrency(
                                                lease.rent_amount,
                                                currency,
                                            )}
                                        </span>
                                        <Badge variant="outline">
                                            {lease.status_label}
                                        </Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Profile
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">ID number</dt>
                            <dd className="text-right font-medium">
                                {tenant.id_number ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Address</dt>
                            <dd className="text-right font-medium">
                                {tenant.address ?? '–'}
                            </dd>
                        </div>
                    </dl>

                    {tenant.notes && (
                        <p className="mt-3 border-t border-border-soft pt-3 text-sm text-text-secondary">
                            {tenant.notes}
                        </p>
                    )}

                    {tenant.id_document && (
                        <a
                            href={tenant.id_document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                        >
                            <FileText className="size-[15px]" />
                            {tenant.id_document.name}
                        </a>
                    )}
                </div>
            </div>
        </>
    );
}
