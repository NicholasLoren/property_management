import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    Building2,
    FileText,
    Mail,
    Pencil,
    Percent,
    Phone,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
    Wrench,
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
import { getDocumentColumns } from '@/pages/documents/columns';
import { getMaintenanceColumns } from '@/pages/maintenance/columns';
import { getPaymentColumns } from '@/pages/payments/columns';
import { getPropertyColumns } from '@/pages/properties/columns';
import { getTenantColumns } from '@/pages/tenants/columns';
import { getAllUnitColumns } from '@/pages/units/all-columns';
import landlords from '@/routes/landlords';
import maintenance from '@/routes/maintenance';
import payments from '@/routes/payments';
import properties from '@/routes/properties';
import units from '@/routes/units';
import users from '@/routes/users';
import type { DocumentRow } from '@/types/documents';
import type { MaintenanceRow } from '@/types/maintenance';
import type { PaymentRow } from '@/types/payments';
import type { PropertyRow } from '@/types/properties';
import type { TenantRow } from '@/types/tenants';
import type { UnitWithPropertyRow } from '@/types/units';

type LandlordStats = {
    properties_count: number;
    units_count: number;
    occupancy_rate: number | null;
    collected_ytd: string;
};

type LandlordPerformance = {
    total_income: string;
    total_expenses: string;
    net: string;
    due_this_month: string;
    collected_this_month: string;
};

type LandlordShowRow = {
    id: number;
    name: string;
    email: string;
    type: string;
    type_label: string;
    id_number: string | null;
    tin: string | null;
    id_document_type_label: string | null;
    address: string | null;
    phone: string | null;
    notes: string | null;
    avatar?: string | null;
    id_document: { name: string; url: string } | null;
    stats: LandlordStats;
    performance: LandlordPerformance;
    property_ids: number[];
    created_at: string | null;
};

type LandlordTab =
    | 'properties'
    | 'units'
    | 'tenants'
    | 'payments'
    | 'maintenance'
    | 'documents';

type TableFilters = {
    tab: LandlordTab;
    sort: string;
    dir: 'asc' | 'desc';
    per_page: number;
    page: number;
};

type PaginatedTable<T> = { data: T[]; meta: DataTablePaginationMeta };

type PageProps = {
    landlord: LandlordShowRow;
    compliance_enabled: boolean;
    tableFilters: TableFilters;
    propertiesTable?: PaginatedTable<PropertyRow>;
    unitsTable?: PaginatedTable<UnitWithPropertyRow>;
    tenantsTable?: PaginatedTable<TenantRow>;
    paymentsTable?: PaginatedTable<PaymentRow>;
    maintenanceTable?: PaginatedTable<MaintenanceRow>;
    documentsTable?: PaginatedTable<DocumentRow>;
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

const EMPTY_META: DataTablePaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: null,
    to: null,
};

export default function LandlordShow({
    landlord,
    compliance_enabled,
    tableFilters,
    propertiesTable,
    unitsTable,
    tenantsTable,
    paymentsTable,
    maintenanceTable,
    documentsTable,
}: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const collectedThisMonth = Number(
        landlord.performance.collected_this_month,
    );
    const dueThisMonth = Number(landlord.performance.due_this_month);
    const collectionRate =
        dueThisMonth > 0
            ? Math.min(
                  100,
                  Math.round((collectedThisMonth / dueThisMonth) * 100),
              )
            : null;

    const PROP_BY_TAB = {
        properties: 'propertiesTable',
        units: 'unitsTable',
        tenants: 'tenantsTable',
        payments: 'paymentsTable',
        maintenance: 'maintenanceTable',
        documents: 'documentsTable',
    } as const;

    function loadTable(next: Partial<TableFilters> = {}) {
        const params = { ...tableFilters, ...next };
        setIsRefreshing(true);

        router.get(
            landlords.show(landlord).url,
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

    function switchTab(tab: LandlordTab) {
        loadTable({ tab, page: 1 });
    }

    const propertyColumns = getPropertyColumns({
        canEdit: false,
        canDelete: false,
        currency,
        onTrash: () => {},
    });
    const unitColumns = getAllUnitColumns({
        canEdit: false,
        canDelete: false,
        currency,
        onEdit: () => {},
        onTrash: () => {},
    });
    const tenantColumns = getTenantColumns({
        canEdit: false,
        canDelete: false,
        onTrash: () => {},
    });
    const paymentColumns = getPaymentColumns({
        canEdit: false,
        canDelete: false,
        currency,
        onTrash: () => {},
    });
    const maintenanceColumns = getMaintenanceColumns({
        canEdit: false,
        canDelete: false,
        currency,
        onTrash: () => {},
    });
    const documentColumns = getDocumentColumns({
        canEdit: false,
        canDelete: false,
        onTrash: () => {},
    });

    const isInitialLoad = {
        properties: tableFilters.tab === 'properties' && !propertiesTable,
        units: tableFilters.tab === 'units' && !unitsTable,
        tenants: tableFilters.tab === 'tenants' && !tenantsTable,
        payments: tableFilters.tab === 'payments' && !paymentsTable,
        maintenance: tableFilters.tab === 'maintenance' && !maintenanceTable,
        documents: tableFilters.tab === 'documents' && !documentsTable,
    };

    return (
        <>
            <Head title={landlord.name} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Landlords', href: landlords.index() },
                        {
                            title: landlord.name,
                            href: landlords.show(landlord),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <EntityAvatar
                        name={landlord.name}
                        seed={landlord.id}
                        imageUrl={landlord.avatar}
                        className="size-12 text-base"
                    />
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-[21px] font-extrabold tracking-tight">
                                {landlord.name}
                            </h1>
                            <Badge variant="outline">
                                {landlord.type_label}
                            </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-secondary">
                            <span className="inline-flex items-center gap-1.5">
                                <Mail className="size-[13px]" />
                                {landlord.email}
                            </span>
                            {landlord.phone && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Phone className="size-[13px]" />
                                    {landlord.phone}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <a href={`mailto:${landlord.email}`}>
                            <Mail className="size-[15px]" />
                            Contact
                        </a>
                    </Button>
                    {can('users.edit') && (
                        <Button variant="outline" asChild>
                            <Link href={users.edit(landlord)}>
                                <Pencil className="size-[15px]" />
                                Edit in Users
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
                <StatTile
                    icon={Building2}
                    label="Properties"
                    value={`${landlord.stats.properties_count}`}
                />
                <StatTile
                    icon={Building2}
                    label="Units"
                    value={`${landlord.stats.units_count}`}
                />
                <StatTile
                    icon={Percent}
                    label="Occupancy"
                    value={
                        landlord.stats.occupancy_rate !== null
                            ? `${landlord.stats.occupancy_rate}%`
                            : '–'
                    }
                />
                <StatTile
                    icon={Wallet}
                    label="Collected YTD"
                    value={formatCurrency(
                        landlord.stats.collected_ytd,
                        currency,
                    )}
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Portfolio performance
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-border-soft p-3">
                            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                <TrendingUp className="size-3.5" />
                                Income
                            </div>
                            <div className="mt-1 text-lg font-semibold text-success">
                                {formatCurrency(
                                    landlord.performance.total_income,
                                    currency,
                                )}
                            </div>
                        </div>
                        <div className="rounded-lg border border-border-soft p-3">
                            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                <TrendingDown className="size-3.5" />
                                Expenses
                            </div>
                            <div className="mt-1 text-lg font-semibold text-destructive">
                                {formatCurrency(
                                    landlord.performance.total_expenses,
                                    currency,
                                )}
                            </div>
                        </div>
                        <div className="rounded-lg border border-border-soft p-3">
                            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                <Wallet className="size-3.5" />
                                Net
                            </div>
                            <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatCurrency(
                                    landlord.performance.net,
                                    currency,
                                )}
                            </div>
                        </div>
                    </div>

                    {dueThisMonth > 0 && (
                        <>
                            <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-4 text-[12.5px] text-text-secondary">
                                <span>Rent collected this month</span>
                                <span className="font-semibold text-foreground">
                                    {formatCurrency(
                                        landlord.performance
                                            .collected_this_month,
                                        currency,
                                    )}{' '}
                                    of{' '}
                                    {formatCurrency(
                                        landlord.performance.due_this_month,
                                        currency,
                                    )}
                                </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                                <span
                                    className="block h-full rounded-full bg-accent-brand"
                                    style={{
                                        width: `${collectionRate ?? 0}%`,
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Profile &amp; compliance
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">
                                {landlord.type === 'company'
                                    ? 'Registration no.'
                                    : 'ID number'}
                            </dt>
                            <dd className="text-right font-medium">
                                {landlord.id_number ?? '–'}
                            </dd>
                        </div>
                        {compliance_enabled && (
                            <div className="flex justify-between gap-3">
                                <dt className="text-text-tertiary">TIN</dt>
                                <dd className="text-right font-medium">
                                    {landlord.tin ?? '–'}
                                </dd>
                            </div>
                        )}
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Address</dt>
                            <dd className="text-right font-medium">
                                {landlord.address ?? '–'}
                            </dd>
                        </div>
                    </dl>

                    {landlord.notes && (
                        <p className="mt-3 border-t border-border-soft pt-3 text-sm text-text-secondary">
                            {landlord.notes}
                        </p>
                    )}

                    {landlord.id_document && (
                        <a
                            href={landlord.id_document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                        >
                            <FileText className="size-[15px]" />
                            {landlord.id_document.name}
                        </a>
                    )}
                </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <Tabs
                    value={tableFilters.tab}
                    onValueChange={(value) => switchTab(value as LandlordTab)}
                >
                    <TabsList className="flex-wrap">
                        <TabsTrigger value="properties">
                            <Building2 className="size-3.5" />
                            Properties
                        </TabsTrigger>
                        <TabsTrigger value="units">
                            <Building2 className="size-3.5" />
                            Units
                        </TabsTrigger>
                        <TabsTrigger value="tenants">
                            <Users className="size-3.5" />
                            Tenants
                        </TabsTrigger>
                        <TabsTrigger value="payments">
                            <Banknote className="size-3.5" />
                            Payments
                        </TabsTrigger>
                        <TabsTrigger value="maintenance">
                            <Wrench className="size-3.5" />
                            Maintenance
                        </TabsTrigger>
                        <TabsTrigger value="documents">
                            <FileText className="size-3.5" />
                            Documents
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="properties" className="pt-4">
                        <DataTable
                            tableId="landlord-properties"
                            columns={propertyColumns}
                            data={propertiesTable?.data ?? []}
                            pagination={propertiesTable?.meta ?? EMPTY_META}
                            onPageChange={(page) =>
                                loadTable({ tab: 'properties', page })
                            }
                            onPerPageChange={(per_page) =>
                                loadTable({
                                    tab: 'properties',
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
                                    tab: 'properties',
                                    sort: column,
                                    dir,
                                    page: 1,
                                })
                            }
                            onRefresh={() => loadTable({ tab: 'properties' })}
                            isRefreshing={
                                isRefreshing || isInitialLoad.properties
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: Building2,
                                title: 'No properties yet',
                                description:
                                    'Properties owned by this landlord will show up here.',
                            }}
                            toolbar={
                                can('properties.view') && (
                                    <Button asChild variant="outline">
                                        <Link
                                            href={properties.index({
                                                query: {
                                                    landlord_id: [landlord.id],
                                                },
                                            })}
                                        >
                                            Manage properties
                                            <ArrowRight className="size-[15px]" />
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    </TabsContent>

                    <TabsContent value="units" className="pt-4">
                        <DataTable
                            tableId="landlord-units"
                            columns={unitColumns}
                            data={unitsTable?.data ?? []}
                            pagination={unitsTable?.meta ?? EMPTY_META}
                            onPageChange={(page) =>
                                loadTable({ tab: 'units', page })
                            }
                            onPerPageChange={(per_page) =>
                                loadTable({ tab: 'units', per_page, page: 1 })
                            }
                            sort={{
                                column: tableFilters.sort,
                                dir: tableFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadTable({
                                    tab: 'units',
                                    sort: column,
                                    dir,
                                    page: 1,
                                })
                            }
                            onRefresh={() => loadTable({ tab: 'units' })}
                            isRefreshing={isRefreshing || isInitialLoad.units}
                            isFiltered={false}
                            emptyState={{
                                icon: Building2,
                                title: 'No units yet',
                                description:
                                    'Units across this landlord’s properties will show up here.',
                            }}
                            toolbar={
                                can('units.view') && (
                                    <Button asChild variant="outline">
                                        <Link
                                            href={units.all({
                                                query: {
                                                    property_id:
                                                        landlord.property_ids,
                                                },
                                            })}
                                        >
                                            Manage units
                                            <ArrowRight className="size-[15px]" />
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    </TabsContent>

                    <TabsContent value="tenants" className="pt-4">
                        <DataTable
                            tableId="landlord-tenants"
                            columns={tenantColumns}
                            data={tenantsTable?.data ?? []}
                            pagination={tenantsTable?.meta ?? EMPTY_META}
                            onPageChange={(page) =>
                                loadTable({ tab: 'tenants', page })
                            }
                            onPerPageChange={(per_page) =>
                                loadTable({
                                    tab: 'tenants',
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
                                    tab: 'tenants',
                                    sort: column,
                                    dir,
                                    page: 1,
                                })
                            }
                            onRefresh={() => loadTable({ tab: 'tenants' })}
                            isRefreshing={isRefreshing || isInitialLoad.tenants}
                            isFiltered={false}
                            emptyState={{
                                icon: Users,
                                title: 'No tenants currently',
                                description:
                                    'Tenants on an active lease across this portfolio will show up here.',
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="payments" className="pt-4">
                        <DataTable
                            tableId="landlord-payments"
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
                                    'Payments recorded across this portfolio will show up here.',
                            }}
                            toolbar={
                                can('payments.view') && (
                                    <Button asChild variant="outline">
                                        <Link
                                            href={payments.index({
                                                query: {
                                                    property_id:
                                                        landlord.property_ids,
                                                },
                                            })}
                                        >
                                            Manage payments
                                            <ArrowRight className="size-[15px]" />
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    </TabsContent>

                    <TabsContent value="maintenance" className="pt-4">
                        <DataTable
                            tableId="landlord-maintenance"
                            columns={maintenanceColumns}
                            data={maintenanceTable?.data ?? []}
                            pagination={maintenanceTable?.meta ?? EMPTY_META}
                            onPageChange={(page) =>
                                loadTable({ tab: 'maintenance', page })
                            }
                            onPerPageChange={(per_page) =>
                                loadTable({
                                    tab: 'maintenance',
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
                                    tab: 'maintenance',
                                    sort: column,
                                    dir,
                                    page: 1,
                                })
                            }
                            onRefresh={() => loadTable({ tab: 'maintenance' })}
                            isRefreshing={
                                isRefreshing || isInitialLoad.maintenance
                            }
                            isFiltered={false}
                            emptyState={{
                                icon: Wrench,
                                title: 'No maintenance requests yet',
                                description:
                                    'Requests across this portfolio will show up here.',
                            }}
                            toolbar={
                                can('maintenance.view') && (
                                    <Button asChild variant="outline">
                                        <Link
                                            href={maintenance.index({
                                                query: {
                                                    property_id:
                                                        landlord.property_ids,
                                                },
                                            })}
                                        >
                                            Manage maintenance
                                            <ArrowRight className="size-[15px]" />
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    </TabsContent>

                    <TabsContent value="documents" className="pt-4">
                        <DataTable
                            tableId="landlord-documents"
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
                                    'Documents attached to this portfolio’s properties will show up here.',
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
