import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    AlertTriangle,
    Banknote,
    Calendar,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileText,
    Mail,
    Pencil,
    Phone,
} from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTablePaginationMeta } from '@/components/data-table/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import { getDocumentColumns } from '@/pages/documents/columns';
import { getPaymentColumns } from '@/pages/payments/columns';
import leases from '@/routes/leases';
import tenants from '@/routes/tenants';
import type { DocumentRow } from '@/types/documents';
import type { PaymentRow } from '@/types/payments';

type TenantLease = {
    id: number;
    lease_number: string | null;
    unit_name: string | null;
    property_name: string | null;
    status: string;
    status_label: string;
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
    is_fully_signed: boolean;
};

type UpcomingRow = {
    id: number;
    unit_name: string | null;
    property_name: string | null;
    period_start: string;
    period_end: string;
    amount_expected: string;
    amount_paid: string;
    status: string;
    status_label: string;
    is_overdue: boolean;
};

type TenantStats = {
    active_leases_count: number;
    total_paid: string;
    outstanding: string;
    tenant_since: string | null;
};

type TenantShowRow = {
    id: number;
    name: string;
    type: string;
    type_label: string;
    email: string | null;
    phone: string | null;
    avatar?: string | null;
    id_number: string | null;
    tin: string | null;
    id_document_type_label: string | null;
    address: string | null;
    notes: string | null;
    contact_person_name: string | null;
    contact_person_phone: string | null;
    contact_person_email: string | null;
    id_document: { name: string; url: string } | null;
    stats: TenantStats;
    leases: TenantLease[];
    created_at: string | null;
};

type TenantTab = 'payments' | 'upcoming' | 'documents';

type TableFilters = {
    tab: TenantTab;
    sort: string;
    dir: 'asc' | 'desc';
    per_page: number;
    page: number;
};

type PaginatedTable<T> = { data: T[]; meta: DataTablePaginationMeta };

type PageProps = {
    tenant: TenantShowRow;
    compliance_enabled: boolean;
    tableFilters: TableFilters;
    paymentsTable?: PaginatedTable<PaymentRow>;
    upcomingTable?: PaginatedTable<UpcomingRow>;
    documentsTable?: PaginatedTable<DocumentRow>;
};

const SCHEDULE_STATUS_CLASS: Record<string, string> = {
    pending: 'bg-secondary text-text-secondary',
    partial: 'bg-warning-soft text-warning',
};

function getUpcomingColumns(opts: {
    currency: string;
    timezone: string;
}): ColumnDef<UpcomingRow>[] {
    return [
        {
            id: 'period',
            header: 'Period',
            enableHiding: false,
            meta: { label: 'Period', sortKey: 'period_start' },
            cell: ({ row }) => (
                <div>
                    <span className="text-[13px] font-semibold text-foreground">
                        {formatDate(row.original.period_start, opts.timezone)} –{' '}
                        {formatDate(row.original.period_end, opts.timezone)}
                    </span>
                    <div className="text-xs text-text-tertiary">
                        {row.original.unit_name} — {row.original.property_name}
                    </div>
                </div>
            ),
        },
        {
            id: 'amount_expected',
            header: 'Expected',
            meta: { label: 'Expected', sortKey: 'amount_expected' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {formatCurrency(
                        row.original.amount_expected,
                        opts.currency,
                    )}
                </span>
            ),
        },
        {
            id: 'amount_paid',
            header: 'Paid',
            meta: { label: 'Paid' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {formatCurrency(row.original.amount_paid, opts.currency)}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
            cell: ({ row }) =>
                row.original.is_overdue ? (
                    <Badge className="bg-destructive/10 text-destructive">
                        Overdue
                    </Badge>
                ) : (
                    <Badge
                        className={SCHEDULE_STATUS_CLASS[row.original.status]}
                    >
                        {row.original.status_label}
                    </Badge>
                ),
        },
    ];
}

function StatTile({
    icon: Icon,
    label,
    value,
    warn,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    warn?: boolean;
}) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-border-soft p-3">
            <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    warn
                        ? 'bg-warning-soft text-warning'
                        : 'bg-secondary text-text-tertiary'
                }`}
            >
                <Icon className="size-4" />
            </span>
            <div>
                <div className="text-xs text-text-tertiary">{label}</div>
                <div
                    className={`text-[13px] font-semibold ${warn ? 'text-warning' : 'text-foreground'}`}
                >
                    {value}
                </div>
            </div>
        </div>
    );
}

function monthsSince(iso: string | null): string {
    if (!iso) {
        return '–';
    }

    const months = Math.max(
        0,
        Math.floor(
            (Date.now() - new Date(iso).getTime()) /
                (1000 * 60 * 60 * 24 * 30.44),
        ),
    );

    if (months < 1) {
        return 'This month';
    }

    return `${months} mo${months === 1 ? '' : 's'}`;
}

const EMPTY_META: DataTablePaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

export default function TenantShow({
    tenant,
    compliance_enabled,
    tableFilters,
    paymentsTable,
    upcomingTable,
    documentsTable,
}: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const outstanding = Number(tenant.stats.outstanding) > 0;
    const isCompany = tenant.type === 'company';

    const PROP_BY_TAB = {
        payments: 'paymentsTable',
        upcoming: 'upcomingTable',
        documents: 'documentsTable',
    } as const;

    function loadTable(next: Partial<TableFilters> = {}) {
        const params = { ...tableFilters, ...next };
        setIsRefreshing(true);

        router.get(
            tenants.show(tenant).url,
            {
                tab: params.tab,
                sort: params.sort,
                dir: params.dir,
                per_page: params.per_page,
                page: params.page,
            },
            {
                only: [PROP_BY_TAB[params.tab], 'tableFilters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setIsRefreshing(false),
            },
        );
    }

    function switchTab(tab: TenantTab) {
        loadTable({ tab, page: 1 });
    }

    const paymentColumns = getPaymentColumns({
        canEdit: false,
        canDelete: false,
        currency,
        onTrash: () => {},
    });
    const upcomingColumns = getUpcomingColumns({ currency, timezone });
    const documentColumns = getDocumentColumns({
        canEdit: false,
        canDelete: false,
        onTrash: () => {},
    });

    const isInitialLoad = {
        payments: tableFilters.tab === 'payments' && !paymentsTable,
        upcoming: tableFilters.tab === 'upcoming' && !upcomingTable,
        documents: tableFilters.tab === 'documents' && !documentsTable,
    };

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
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-[21px] font-extrabold tracking-tight">
                                {tenant.name}
                            </h1>
                            <Badge variant="outline">{tenant.type_label}</Badge>
                        </div>
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

            <div className="grid gap-3 sm:grid-cols-4">
                <StatTile
                    icon={CalendarClock}
                    label="Active leases"
                    value={`${tenant.stats.active_leases_count}`}
                />
                <StatTile
                    icon={Banknote}
                    label="Total paid"
                    value={formatCurrency(tenant.stats.total_paid, currency)}
                />
                <StatTile
                    icon={AlertTriangle}
                    label="Outstanding"
                    warn={outstanding}
                    value={
                        outstanding
                            ? formatCurrency(tenant.stats.outstanding, currency)
                            : formatCurrency('0', currency)
                    }
                />
                <StatTile
                    icon={Calendar}
                    label="Tenant since"
                    value={
                        tenant.stats.tenant_since
                            ? `${formatDate(tenant.stats.tenant_since, timezone)} · ${monthsSince(tenant.stats.tenant_since)}`
                            : '–'
                    }
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
                                <div
                                    key={lease.id}
                                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                >
                                    <Link
                                        href={leases.show(lease)}
                                        className="min-w-0 hover:opacity-80"
                                    >
                                        <div className="text-[13px] font-semibold">
                                            {lease.unit_name} —{' '}
                                            {lease.property_name}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                                            <span>
                                                {formatDate(
                                                    lease.start_date,
                                                    timezone,
                                                )}{' '}
                                                –{' '}
                                                {formatDate(
                                                    lease.end_date,
                                                    timezone,
                                                )}
                                            </span>
                                            {lease.lease_number && (
                                                <span>
                                                    {lease.lease_number}
                                                </span>
                                            )}
                                            {lease.is_fully_signed ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 font-medium text-success">
                                                    <CheckCircle2 className="size-3" />
                                                    Fully executed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-text-tertiary">
                                                    <Clock className="size-3" />
                                                    Awaiting signature
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-[13px] font-semibold">
                                                {formatCurrency(
                                                    lease.rent_amount,
                                                    currency,
                                                )}
                                            </div>
                                            <div className="text-xs text-text-tertiary">
                                                /{' '}
                                                {lease.billing_period_label.toLowerCase()}
                                            </div>
                                        </div>
                                        <Badge variant="outline">
                                            {lease.status_label}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Profile &amp; compliance
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">
                                {isCompany ? 'Registration no.' : 'ID number'}
                            </dt>
                            <dd className="text-right font-medium">
                                {tenant.id_number ?? '–'}
                            </dd>
                        </div>
                        {compliance_enabled && (
                            <div className="flex justify-between gap-3">
                                <dt className="text-text-tertiary">TIN</dt>
                                <dd className="text-right font-medium">
                                    {tenant.tin ?? '–'}
                                </dd>
                            </div>
                        )}
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Address</dt>
                            <dd className="text-right font-medium">
                                {tenant.address ?? '–'}
                            </dd>
                        </div>
                    </dl>

                    {compliance_enabled &&
                        isCompany &&
                        tenant.contact_person_name && (
                            <div className="mt-3 border-t border-border-soft pt-3">
                                <p className="mb-1 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                    Contact person
                                </p>
                                <p className="text-[13px] font-semibold">
                                    {tenant.contact_person_name}
                                </p>
                                <p className="mt-0.5 text-[12.5px] text-text-secondary">
                                    {[
                                        tenant.contact_person_phone,
                                        tenant.contact_person_email,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                        )}

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

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <Tabs
                    value={tableFilters.tab}
                    onValueChange={(value) => switchTab(value as TenantTab)}
                >
                    <TabsList>
                        <TabsTrigger value="payments">
                            <Banknote className="size-3.5" />
                            Payments
                        </TabsTrigger>
                        <TabsTrigger value="upcoming">
                            <CalendarClock className="size-3.5" />
                            Upcoming
                        </TabsTrigger>
                        <TabsTrigger value="documents">
                            <FileText className="size-3.5" />
                            Documents
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="payments" className="pt-4">
                        <DataTable
                            tableId="tenant-payments"
                            columns={paymentColumns}
                            data={paymentsTable?.data ?? []}
                            pagination={paymentsTable?.meta ?? EMPTY_META}
                            onPageChange={(page) =>
                                loadTable({ tab: 'payments', page })
                            }
                            onPerPageChange={(per_page) =>
                                loadTable({
                                    tab: 'payments',
                                    per_page,
                                    page: 1,
                                })
                            }
                            sort={{
                                column: tableFilters.sort,
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({
                                    tab: 'payments',
                                    sort: column,
                                    dir,
                                    page: 1,
                                })
                            }
                            onRefresh={() => loadTable({ tab: 'payments' })}
                            isRefreshing={
                                isRefreshing || isInitialLoad.payments
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: Banknote,
                                title: 'No payments yet',
                                description:
                                    'Payments recorded against this tenant will show up here.',
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="upcoming" className="pt-4">
                        <DataTable
                            tableId="tenant-upcoming"
                            columns={upcomingColumns}
                            data={upcomingTable?.data ?? []}
                            pagination={upcomingTable?.meta ?? EMPTY_META}
                            onPageChange={(page) =>
                                loadTable({ tab: 'upcoming', page })
                            }
                            onPerPageChange={(per_page) =>
                                loadTable({
                                    tab: 'upcoming',
                                    per_page,
                                    page: 1,
                                })
                            }
                            sort={{
                                column: tableFilters.sort,
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({
                                    tab: 'upcoming',
                                    sort: column,
                                    dir,
                                    page: 1,
                                })
                            }
                            onRefresh={() => loadTable({ tab: 'upcoming' })}
                            isRefreshing={
                                isRefreshing || isInitialLoad.upcoming
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: CalendarClock,
                                title: 'Nothing due',
                                description:
                                    'All active leases for this tenant are settled.',
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="documents" className="pt-4">
                        <DataTable
                            tableId="tenant-documents"
                            columns={documentColumns}
                            data={documentsTable?.data ?? []}
                            pagination={documentsTable?.meta ?? EMPTY_META}
                            onPageChange={(page) =>
                                loadTable({ tab: 'documents', page })
                            }
                            onPerPageChange={(per_page) =>
                                loadTable({
                                    tab: 'documents',
                                    per_page,
                                    page: 1,
                                })
                            }
                            sort={{
                                column: tableFilters.sort,
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({
                                    tab: 'documents',
                                    sort: column,
                                    dir,
                                    page: 1,
                                })
                            }
                            onRefresh={() => loadTable({ tab: 'documents' })}
                            isRefreshing={
                                isRefreshing || isInitialLoad.documents
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: FileText,
                                title: 'No documents on file',
                                description:
                                    'Documents attached to this tenant will show up here.',
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
