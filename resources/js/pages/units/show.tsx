import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    Calendar,
    History,
    Pencil,
    Sparkles,
    StickyNote,
    UserRound,
    Users,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTablePaginationMeta } from '@/components/data-table/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhotoCarousel } from '@/components/ui/photo-carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import type {
    LeaseTabRow,
    MaintenanceTabRow,
    PaymentTabRow,
    TenantTabRow,
} from '@/pages/units/show-tab-columns';
import {
    getLeaseTabColumns,
    getMaintenanceTabColumns,
    getPaymentTabColumns,
    getTenantTabColumns,
} from '@/pages/units/show-tab-columns';
import properties from '@/routes/properties';
import tenants from '@/routes/tenants';
import units from '@/routes/units';

type PropertyContext = { id: number; name: string };

type UnitPriceHistoryEntry = {
    id: number;
    amount: string;
    billing_period_label: string;
    effective_from: string;
    effective_to: string | null;
    is_current: boolean;
};

type UnitTenant = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

type UnitPerformance = {
    total_collected: string;
    payments_count: number;
    leases_count: number;
    avg_rent: string | null;
    maintenance_count: number;
    maintenance_total_cost: string;
};

type UnitShowRow = {
    id: number;
    name: string;
    unit_type_label: string | null;
    size: string | null;
    status: string;
    status_label: string;
    notes: string | null;
    features: { name: string; quantity: number }[];
    price_history: UnitPriceHistoryEntry[];
    photos: { id: number; name: string; url: string }[];
    current_tenants: UnitTenant[];
    performance: UnitPerformance;
    created_at: string | null;
};

type TableTab =
    | 'tenant'
    | 'past-tenants'
    | 'payments'
    | 'leases'
    | 'maintenance'
    | 'performance';

const LIST_TABS: TableTab[] = [
    'past-tenants',
    'payments',
    'leases',
    'maintenance',
];

type TableFilters = {
    tab: TableTab;
    sort: string | null;
    dir: 'asc' | 'desc';
    per_page: number;
    page: number;
};

type TabTableRow =
    TenantTabRow | PaymentTabRow | LeaseTabRow | MaintenanceTabRow;

type TabTable = { data: TabTableRow[]; meta: DataTablePaginationMeta };

type PageProps = {
    property: PropertyContext;
    unit: UnitShowRow;
    tableFilters: TableFilters;
    table?: TabTable;
};

const STATUS_DOT_CLASS: Record<string, string> = {
    vacant: 'bg-warning',
    occupied: 'bg-success',
};

function TenantRow({ tenant }: { tenant: UnitTenant }) {
    return (
        <Link
            href={tenants.show(tenant.id)}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-soft px-3 py-2.5 hover:border-accent-brand"
        >
            <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-text-tertiary">
                    <UserRound className="size-4" />
                </span>
                <div>
                    <div className="text-[13px] font-semibold text-foreground">
                        {tenant.name}
                    </div>
                    <div className="text-xs text-text-tertiary">
                        {tenant.email ?? tenant.phone ?? '—'}
                    </div>
                </div>
            </div>
        </Link>
    );
}

function EmptyTabState({ message }: { message: string }) {
    return (
        <p className="rounded-lg border border-dashed border-border-soft px-3 py-6 text-center text-[13px] text-text-tertiary">
            {message}
        </p>
    );
}

export default function UnitShow({
    property,
    unit,
    tableFilters,
    table,
}: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const currentPrice = unit.price_history.find((price) => price.is_current);

    function loadTable(next: Partial<TableFilters>) {
        const params = { ...tableFilters, ...next };
        setIsRefreshing(true);

        router.get(
            units.show([property.id, unit.id]).url,
            {
                tab: params.tab,
                sort: params.sort ?? undefined,
                dir: params.dir,
                per_page: params.per_page,
                page: params.page,
            },
            {
                only: ['table', 'tableFilters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setIsRefreshing(false),
            },
        );
    }

    function switchTab(tab: TableTab) {
        if (LIST_TABS.includes(tab)) {
            loadTable({ tab, sort: null, dir: 'desc', page: 1 });

            return;
        }

        router.get(
            units.show([property.id, unit.id]).url,
            { tab },
            {
                only: ['tableFilters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    const tenantColumns = useMemo(() => getTenantTabColumns(), []);
    const paymentColumns = useMemo(
        () => getPaymentTabColumns({ currency, timezone }),
        [currency, timezone],
    );
    const leaseColumns = useMemo(
        () => getLeaseTabColumns({ currency, timezone }),
        [currency, timezone],
    );
    const maintenanceColumns = useMemo(
        () => getMaintenanceTabColumns({ currency, timezone }),
        [currency, timezone],
    );

    const isInitialTableLoad = LIST_TABS.includes(tableFilters.tab) && !table;

    const tablePagination = table?.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: tableFilters.per_page,
        total: 0,
        from: null,
        to: null,
    };

    return (
        <>
            <Head title={`${unit.name} · ${property.name}`} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Properties', href: properties.index() },
                        {
                            title: property.name,
                            href: properties.show(property),
                        },
                        { title: 'Units', href: units.index(property) },
                        {
                            title: unit.name,
                            href: units.show([property.id, unit.id]),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {unit.name}
                    </h1>
                    <Link
                        href={properties.show(property)}
                        className="mt-0.5 flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-accent-strong hover:underline"
                    >
                        <Building2 className="size-3.5" />
                        {property.name}
                    </Link>
                </div>
                {can('units.edit') && (
                    <Button asChild variant="outline">
                        <Link href={units.edit([property.id, unit.id])}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-2">
                    <PhotoCarousel photos={unit.photos} />
                </div>

                <div className="grid gap-4 lg:col-span-3">
                    <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                        <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            Details
                        </p>
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs text-text-tertiary">
                                    Unit type
                                </dt>
                                <dd className="mt-1 text-[13px] text-foreground">
                                    {unit.unit_type_label ?? '–'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-text-tertiary">
                                    Size
                                </dt>
                                <dd className="mt-1 text-[13px] text-foreground">
                                    {unit.size ?? '–'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-text-tertiary">
                                    Status
                                </dt>
                                <dd className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-foreground">
                                    <span
                                        className={`size-[7px] rounded-full ${STATUS_DOT_CLASS[unit.status]}`}
                                    />
                                    {unit.status_label}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-text-tertiary">
                                    Current price
                                </dt>
                                <dd className="mt-1 text-[13px] text-foreground">
                                    {currentPrice
                                        ? `${formatCurrency(currentPrice.amount, currency)} / ${currentPrice.billing_period_label.toLowerCase()}`
                                        : '–'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-text-tertiary">
                                    Added
                                </dt>
                                <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-text-secondary">
                                    <Calendar className="size-3.5 text-text-tertiary" />
                                    {formatDate(unit.created_at, timezone)}
                                </dd>
                            </div>
                        </dl>

                        {unit.features.length > 0 && (
                            <div className="mt-5 border-t border-border-soft pt-4">
                                <p className="mb-2 flex items-center gap-1.5 text-xs text-text-tertiary">
                                    <Sparkles className="size-3.5" />
                                    Features
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {unit.features.map((feature) => (
                                        <Badge
                                            key={feature.name}
                                            variant="outline"
                                            className="font-normal"
                                        >
                                            {feature.name} × {feature.quantity}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            <StickyNote className="size-3.5" />
                            Notes
                        </p>
                        {unit.notes ? (
                            <p className="text-[13px] whitespace-pre-line text-foreground">
                                {unit.notes}
                            </p>
                        ) : (
                            <p className="text-[13px] text-text-tertiary">
                                No notes have been added for this unit.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                    <History className="size-3.5" />
                    Price history
                </p>
                {unit.price_history.length > 0 ? (
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                        {unit.price_history.map((price) => (
                            <li
                                key={price.id}
                                className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2"
                            >
                                <div>
                                    <div className="text-[13px] font-semibold text-foreground">
                                        {formatCurrency(price.amount, currency)}{' '}
                                        /{' '}
                                        {price.billing_period_label.toLowerCase()}
                                    </div>
                                    <div className="text-xs text-text-tertiary">
                                        {formatDate(
                                            price.effective_from,
                                            timezone,
                                        )}{' '}
                                        –{' '}
                                        {price.effective_to
                                            ? formatDate(
                                                  price.effective_to,
                                                  timezone,
                                              )
                                            : 'now'}
                                    </div>
                                </div>
                                {price.is_current && (
                                    <Badge className="bg-success-soft text-success">
                                        Current
                                    </Badge>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-[13px] text-text-tertiary">
                        No price has been set for this unit yet.
                    </p>
                )}
            </div>

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <Tabs
                    value={tableFilters.tab}
                    onValueChange={(value) => switchTab(value as TableTab)}
                >
                    <TabsList>
                        <TabsTrigger value="tenant">
                            <UserRound className="size-3.5" />
                            Current tenant
                        </TabsTrigger>
                        <TabsTrigger value="past-tenants">
                            <Users className="size-3.5" />
                            Past tenants
                        </TabsTrigger>
                        <TabsTrigger value="payments">
                            <Banknote className="size-3.5" />
                            Payments
                        </TabsTrigger>
                        <TabsTrigger value="leases">
                            <History className="size-3.5" />
                            Leases
                        </TabsTrigger>
                        <TabsTrigger value="performance">
                            <Sparkles className="size-3.5" />
                            Performance
                        </TabsTrigger>
                        <TabsTrigger value="maintenance">
                            <Wrench className="size-3.5" />
                            Maintenance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tenant" className="pt-4">
                        {unit.current_tenants.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {unit.current_tenants.map((tenant) => (
                                    <TenantRow
                                        key={tenant.id}
                                        tenant={tenant}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="This unit is currently vacant — no active tenant." />
                        )}
                    </TabsContent>

                    <TabsContent value="past-tenants" className="pt-4">
                        <DataTable
                            tableId="unit-past-tenants"
                            columns={tenantColumns}
                            data={
                                tableFilters.tab === 'past-tenants'
                                    ? ((table?.data ?? []) as TenantTabRow[])
                                    : []
                            }
                            pagination={tablePagination}
                            onPageChange={(page) => loadTable({ page })}
                            onPerPageChange={(per_page) =>
                                loadTable({ per_page, page: 1 })
                            }
                            sort={{
                                column: tableFilters.sort ?? '',
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({ sort: column, dir, page: 1 })
                            }
                            onRefresh={() => loadTable({})}
                            isRefreshing={
                                isRefreshing ||
                                (tableFilters.tab === 'past-tenants' &&
                                    isInitialTableLoad)
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: Users,
                                title: 'No past tenants',
                                description:
                                    'Tenants who have moved out of this unit will show up here.',
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="payments" className="pt-4">
                        <DataTable
                            tableId="unit-payments"
                            columns={paymentColumns}
                            data={
                                tableFilters.tab === 'payments'
                                    ? ((table?.data ?? []) as PaymentTabRow[])
                                    : []
                            }
                            pagination={tablePagination}
                            onPageChange={(page) => loadTable({ page })}
                            onPerPageChange={(per_page) =>
                                loadTable({ per_page, page: 1 })
                            }
                            sort={{
                                column: tableFilters.sort ?? '',
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({ sort: column, dir, page: 1 })
                            }
                            onRefresh={() => loadTable({})}
                            isRefreshing={
                                isRefreshing ||
                                (tableFilters.tab === 'payments' &&
                                    isInitialTableLoad)
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: Banknote,
                                title: 'No payments yet',
                                description:
                                    'Payments recorded against this unit’s leases will show up here.',
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="leases" className="pt-4">
                        <DataTable
                            tableId="unit-leases"
                            columns={leaseColumns}
                            data={
                                tableFilters.tab === 'leases'
                                    ? ((table?.data ?? []) as LeaseTabRow[])
                                    : []
                            }
                            pagination={tablePagination}
                            onPageChange={(page) => loadTable({ page })}
                            onPerPageChange={(per_page) =>
                                loadTable({ per_page, page: 1 })
                            }
                            sort={{
                                column: tableFilters.sort ?? '',
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({ sort: column, dir, page: 1 })
                            }
                            onRefresh={() => loadTable({})}
                            isRefreshing={
                                isRefreshing ||
                                (tableFilters.tab === 'leases' &&
                                    isInitialTableLoad)
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: History,
                                title: 'No leases yet',
                                description:
                                    'Leases created for this unit will show up here.',
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="performance" className="pt-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="text-xs text-text-tertiary">
                                    Total collected
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {formatCurrency(
                                        unit.performance.total_collected,
                                        currency,
                                    )}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="text-xs text-text-tertiary">
                                    Payments recorded
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {unit.performance.payments_count}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="text-xs text-text-tertiary">
                                    Total leases
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {unit.performance.leases_count}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="text-xs text-text-tertiary">
                                    Average rent
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {unit.performance.avg_rent
                                        ? formatCurrency(
                                              unit.performance.avg_rent,
                                              currency,
                                          )
                                        : '–'}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="text-xs text-text-tertiary">
                                    Maintenance requests
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {unit.performance.maintenance_count}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="text-xs text-text-tertiary">
                                    Maintenance spend
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {formatCurrency(
                                        unit.performance.maintenance_total_cost,
                                        currency,
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="maintenance" className="pt-4">
                        <DataTable
                            tableId="unit-maintenance"
                            columns={maintenanceColumns}
                            data={
                                tableFilters.tab === 'maintenance'
                                    ? ((table?.data ??
                                          []) as MaintenanceTabRow[])
                                    : []
                            }
                            pagination={tablePagination}
                            onPageChange={(page) => loadTable({ page })}
                            onPerPageChange={(per_page) =>
                                loadTable({ per_page, page: 1 })
                            }
                            sort={{
                                column: tableFilters.sort ?? '',
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({ sort: column, dir, page: 1 })
                            }
                            onRefresh={() => loadTable({})}
                            isRefreshing={
                                isRefreshing ||
                                (tableFilters.tab === 'maintenance' &&
                                    isInitialTableLoad)
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: Wrench,
                                title: 'No maintenance requests',
                                description:
                                    'Maintenance requests recorded for this unit will show up here.',
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
