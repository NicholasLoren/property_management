import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, UserRound, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import {
    FilterField,
    FilterPillGroup,
    FilterSheet,
} from '@/components/filter-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import {
    getTenantColumns,
    getTenantTrashColumns,
} from '@/pages/tenants/columns';
import type { ActiveTenantRow, TrashTenantRow } from '@/pages/tenants/columns';
import tenants from '@/routes/tenants';
import type { TenantRow } from '@/types/tenants';

type Option = { value: string; label: string };

type FilterKey = 'property' | 'payment_status' | 'billing_period' | 'status';

type Filters = {
    search: string;
    dir: 'asc' | 'desc';
    per_page: number;
    tab: 'active' | 'trash';
    property: string;
    payment_status: string;
    billing_period: string;
    status: string;
};

type PageProps = {
    tenants: {
        data: (ActiveTenantRow | TrashTenantRow)[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number | null;
            to: number | null;
        };
    };
    filters: Filters;
    counts: { active: number; trash: number };
    properties: Option[];
    paymentStatuses: Option[];
    billingPeriods: Option[];
    tenantStatuses: Option[];
};

const EMPTY_DRAFT: Pick<Filters, FilterKey> = {
    property: 'all',
    payment_status: 'all',
    billing_period: 'all',
    status: 'all',
};

export default function TenantsIndex({
    tenants: paginator,
    filters,
    counts,
    properties,
    paymentStatuses,
    billingPeriods,
    tenantStatuses,
}: PageProps) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [draft, setDraft] = useState<Pick<Filters, FilterKey>>({
        property: filters.property,
        payment_status: filters.payment_status,
        billing_period: filters.billing_period,
        status: filters.status,
    });

    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    function reload(partial: Partial<Filters>) {
        const next = { ...filters, ...partial };

        router.get(
            tenants.index().url,
            {
                search: next.search || undefined,
                dir: next.dir,
                per_page: next.per_page,
                tab: next.tab,
                property: next.property !== 'all' ? next.property : undefined,
                payment_status:
                    next.payment_status !== 'all'
                        ? next.payment_status
                        : undefined,
                billing_period:
                    next.billing_period !== 'all'
                        ? next.billing_period
                        : undefined,
                status: next.status !== 'all' ? next.status : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                // Filter/sort/search/tab changes never change the option
                // lists (property, statuses, billing periods) — skip
                // re-fetching those on every such request.
                only: ['tenants', 'filters', 'counts'],
            },
        );
    }

    function onSearchChange(value: string) {
        setSearch(value);

        if (searchDebounce.current) {
            clearTimeout(searchDebounce.current);
        }

        searchDebounce.current = setTimeout(() => {
            reload({ search: value });
        }, 300);
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, search: '', ...EMPTY_DRAFT });
    }

    function openFilterSheet(open: boolean) {
        if (open) {
            setDraft({
                property: filters.property,
                payment_status: filters.payment_status,
                billing_period: filters.billing_period,
                status: filters.status,
            });
        }

        setFilterSheetOpen(open);
    }

    function applyFilterSheet() {
        setFilterSheetOpen(false);
        reload(draft);
    }

    // Reset applies immediately (clears + closes) rather than only clearing
    // the in-sheet draft — otherwise dismissing the sheet via Escape/overlay
    // instead of "Apply Filters" would silently keep the old filters active
    // even though the pills visually showed "All".
    function resetFilterSheet() {
        setDraft(EMPTY_DRAFT);
        setFilterSheetOpen(false);
        reload(EMPTY_DRAFT);
    }

    function removeFilter(key: FilterKey) {
        reload({ [key]: 'all' } as Partial<Filters>);
    }

    const optionsByKey: Record<FilterKey, Option[]> = {
        property: properties,
        payment_status: paymentStatuses,
        billing_period: billingPeriods,
        status: tenantStatuses,
    };

    function optionLabel(key: FilterKey, value: string): string {
        return optionsByKey[key].find((o) => o.value === value)?.label ?? value;
    }

    function moveToTrash(tenant: TenantRow) {
        router.delete(tenants.destroy(tenant).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${tenant.name} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                tenants.restore(tenant).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(tenant: TenantRow) {
        router.patch(tenants.restore(tenant).url, {}, { preserveScroll: true });
    }

    function forceDelete(tenant: TenantRow) {
        if (
            !confirm(
                `Permanently delete ${tenant.name}? This cannot be undone.`,
            )
        ) {
            return;
        }

        router.delete(tenants.forceDelete(tenant).url, {
            preserveScroll: true,
        });
    }

    const canEditTenants = can('tenants.edit');
    const canDeleteTenants = can('tenants.delete');

    const activeColumns = useMemo(
        () =>
            getTenantColumns({
                canEdit: canEditTenants,
                canDelete: canDeleteTenants,
                onTrash: moveToTrash,
            }),
        [canEditTenants, canDeleteTenants],
    );

    const trashColumns = useMemo(
        () =>
            getTenantTrashColumns({
                onRestore: restore,
                onForceDelete: forceDelete,
            }),
        [],
    );

    const activeFilterKeys = (
        ['property', 'payment_status', 'billing_period', 'status'] as const
    ).filter((key) => filters[key] !== 'all');

    const isFiltered = filters.search !== '' || activeFilterKeys.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search tenants…"
                    className="pl-9"
                />
            </div>

            {filters.tab === 'active' && (
                <FilterSheet
                    title="Filter Tenants"
                    open={filterSheetOpen}
                    onOpenChange={openFilterSheet}
                    activeCount={activeFilterKeys.length}
                    onReset={resetFilterSheet}
                    onApply={applyFilterSheet}
                >
                    <FilterField label="Property">
                        <SearchableSelect
                            value={draft.property}
                            onChange={(value) =>
                                setDraft((d) => ({
                                    ...d,
                                    property: value ?? 'all',
                                }))
                            }
                            options={[
                                { value: 'all', label: 'All properties' },
                                ...properties,
                            ]}
                            placeholder="All properties"
                            searchPlaceholder="Search properties…"
                        />
                    </FilterField>
                    <FilterPillGroup
                        label="Payment Status"
                        options={paymentStatuses}
                        value={draft.payment_status}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, payment_status: value }))
                        }
                    />
                    <FilterPillGroup
                        label="Billing Period"
                        options={billingPeriods}
                        value={draft.billing_period}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, billing_period: value }))
                        }
                    />
                    <FilterPillGroup
                        label="Tenant Status"
                        options={tenantStatuses}
                        value={draft.status}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, status: value }))
                        }
                    />
                </FilterSheet>
            )}

            {canDeleteTenants && (
                <div className="inline-flex gap-0.5 rounded-full border border-border-soft bg-secondary p-[3px]">
                    {(['active', 'trash'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => switchTab(tab)}
                            className={cn(
                                'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize',
                                filters.tab === tab
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-text-secondary',
                            )}
                        >
                            {tab} ({counts[tab]})
                        </button>
                    ))}
                </div>
            )}
        </>
    );

    const sharedTableProps = {
        pagination: paginator.meta,
        onPageChange: (page: number) =>
            router.get(
                tenants.index().url,
                {
                    search: filters.search || undefined,
                    dir: filters.dir,
                    per_page: filters.per_page,
                    tab: filters.tab,
                    property:
                        filters.property !== 'all'
                            ? filters.property
                            : undefined,
                    payment_status:
                        filters.payment_status !== 'all'
                            ? filters.payment_status
                            : undefined,
                    billing_period:
                        filters.billing_period !== 'all'
                            ? filters.billing_period
                            : undefined,
                    status:
                        filters.status !== 'all' ? filters.status : undefined,
                    page,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['tenants', 'filters', 'counts'],
                },
            ),
        onPerPageChange: (per_page: number) => reload({ per_page }),
        sort: { column: 'name', dir: filters.dir },
        onSortChange: (_column: string, dir: 'asc' | 'desc') => reload({ dir }),
        isFiltered,
        toolbar,
    };

    return (
        <>
            <Head title="Tenants" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Tenants
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        People renting units across your portfolio.
                    </p>
                </div>
                {can('tenants.add') && (
                    <Button asChild>
                        <Link href={tenants.create()}>
                            <Plus className="size-[15px]" />
                            Add tenant
                        </Link>
                    </Button>
                )}
            </div>

            {filters.tab === 'active' && activeFilterKeys.length > 0 && (
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                    {activeFilterKeys.map((key) => (
                        <span
                            key={key}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                        >
                            {optionLabel(key, filters[key])}
                            <button
                                type="button"
                                onClick={() => removeFilter(key)}
                                className="rounded-full p-0.5 hover:bg-black/10"
                            >
                                <X className="size-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {filters.tab === 'active' ? (
                <DataTable
                    tableId="tenants"
                    columns={activeColumns}
                    data={paginator.data as ActiveTenantRow[]}
                    emptyState={{
                        icon: UserRound,
                        title: 'No tenants yet',
                        description:
                            'Add your first tenant to start attaching them to leases.',
                        action: can('tenants.add')
                            ? {
                                  label: 'Add your first tenant',
                                  href: tenants.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="tenants-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashTenantRow[]}
                    emptyState={{
                        icon: UserRound,
                        title: 'Trash is empty',
                        description:
                            'Tenants you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
