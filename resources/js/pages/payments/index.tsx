import { Head, Link, router, usePage } from '@inertiajs/react';
import { CreditCard, Plus, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import {
    FilterField,
    FilterMultiPillGroup,
    FilterPillGroup,
    FilterSheet,
} from '@/components/filter-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
    getPaymentColumns,
    getPaymentTrashColumns,
} from '@/pages/payments/columns';
import type {
    ActivePaymentRow,
    TrashPaymentRow,
} from '@/pages/payments/columns';
import payments from '@/routes/payments';
import type { PaymentRow } from '@/types/payments';

type Option = { value: string; label: string };

type FilterKey = 'property' | 'method' | 'period';

type Filters = {
    search: string;
    status: string[];
    sort: string;
    dir: 'asc' | 'desc';
    per_page: number;
    tab: 'active' | 'trash';
    property: string;
    property_id: string[];
    tenant_id: string | null;
    method: string;
    period: string;
};

type PageProps = {
    payments: {
        data: (ActivePaymentRow | TrashPaymentRow)[];
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
    total_collected: string;
    statuses: Option[];
    properties: Option[];
    methods: Option[];
    periods: Option[];
};

const EMPTY_SINGLE_DRAFT: Pick<Filters, FilterKey> = {
    property: 'all',
    method: 'all',
    period: 'all_time',
};

export default function PaymentsIndex({
    payments: paginator,
    filters,
    counts,
    total_collected,
    statuses,
    properties,
    methods,
    periods,
}: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [draft, setDraft] = useState<Pick<Filters, FilterKey | 'status'>>({
        property: filters.property,
        method: filters.method,
        period: filters.period,
        status: filters.status,
    });

    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    function reload(partial: Partial<Filters>) {
        const next = { ...filters, ...partial };

        router.get(
            payments.index().url,
            {
                search: next.search || undefined,
                status: next.status.length ? next.status : undefined,
                sort: next.sort,
                dir: next.dir,
                per_page: next.per_page,
                tab: next.tab,
                property: next.property !== 'all' ? next.property : undefined,
                property_id: next.property_id.length
                    ? next.property_id
                    : undefined,
                tenant_id: next.tenant_id ?? undefined,
                method: next.method !== 'all' ? next.method : undefined,
                period: next.period !== 'all_time' ? next.period : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                // None of these requests change the option lists or the
                // grand-total figure — skip re-fetching those every time.
                only: ['payments', 'filters', 'counts'],
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

    function toggleStatusFilter(value: string, checked: boolean) {
        const status = checked
            ? [...filters.status, value]
            : filters.status.filter((s) => s !== value);
        reload({ status });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, search: '', status: [], ...EMPTY_SINGLE_DRAFT });
    }

    function openFilterSheet(open: boolean) {
        if (open) {
            setDraft({
                property: filters.property,
                method: filters.method,
                period: filters.period,
                status: filters.status,
            });
        }

        setFilterSheetOpen(open);
    }

    function applyFilterSheet() {
        setFilterSheetOpen(false);
        reload(draft);
    }

    function resetFilterSheet() {
        const empty = { ...EMPTY_SINGLE_DRAFT, status: [] as string[] };
        setDraft(empty);
        setFilterSheetOpen(false);
        reload(empty);
    }

    function moveToTrash(payment: PaymentRow) {
        router.delete(payments.destroy(payment).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast('Payment moved to trash', {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                payments.restore(payment).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(payment: PaymentRow) {
        router.patch(
            payments.restore(payment).url,
            {},
            { preserveScroll: true },
        );
    }

    function forceDelete(payment: PaymentRow) {
        if (
            !confirm('Permanently delete this payment? This cannot be undone.')
        ) {
            return;
        }

        router.delete(payments.forceDelete(payment).url, {
            preserveScroll: true,
        });
    }

    const canEdit = can('payments.edit');
    const canDelete = can('payments.delete');

    const activeColumns = useMemo(
        () =>
            getPaymentColumns({
                canEdit,
                canDelete,
                currency,
                onTrash: moveToTrash,
            }),
        [canEdit, canDelete, currency],
    );

    const trashColumns = useMemo(
        () =>
            getPaymentTrashColumns({
                onRestore: restore,
                onForceDelete: forceDelete,
            }),
        [],
    );

    const activeSingleFilterKeys = (
        ['property', 'method', 'period'] as const
    ).filter((key) => filters[key] !== (key === 'period' ? 'all_time' : 'all'));

    const isFiltered =
        filters.search !== '' ||
        filters.status.length > 0 ||
        activeSingleFilterKeys.length > 0;

    const filterOptionsByKey: Record<FilterKey, Option[]> = {
        property: properties,
        method: methods,
        period: periods,
    };

    function singleFilterLabel(key: FilterKey): string {
        return (
            filterOptionsByKey[key].find((o) => o.value === filters[key])
                ?.label ?? filters[key]
        );
    }

    function removeSingleFilter(key: FilterKey) {
        reload({
            [key]: key === 'period' ? 'all_time' : 'all',
        } as Partial<Filters>);
    }

    const activeFilterCount =
        filters.status.length + activeSingleFilterKeys.length;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search payments…"
                    className="pl-9"
                />
            </div>

            {filters.tab === 'active' && (
                <FilterSheet
                    title="Filter Payments"
                    open={filterSheetOpen}
                    onOpenChange={openFilterSheet}
                    activeCount={activeFilterCount}
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
                        label="Payment Method"
                        options={methods}
                        value={draft.method}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, method: value }))
                        }
                    />
                    <FilterMultiPillGroup
                        label="Status"
                        options={statuses}
                        value={draft.status}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, status: value }))
                        }
                    />
                    <FilterPillGroup
                        label="Period"
                        options={periods}
                        value={draft.period}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, period: value }))
                        }
                        includeAll={false}
                    />
                </FilterSheet>
            )}

            {canDelete && (
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
                payments.index().url,
                {
                    search: filters.search || undefined,
                    status: filters.status.length ? filters.status : undefined,
                    sort: filters.sort,
                    dir: filters.dir,
                    per_page: filters.per_page,
                    tab: filters.tab,
                    property:
                        filters.property !== 'all'
                            ? filters.property
                            : undefined,
                    property_id: filters.property_id.length
                        ? filters.property_id
                        : undefined,
                    tenant_id: filters.tenant_id ?? undefined,
                    method:
                        filters.method !== 'all' ? filters.method : undefined,
                    period:
                        filters.period !== 'all_time'
                            ? filters.period
                            : undefined,
                    page,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['payments', 'filters', 'counts'],
                },
            ),
        onPerPageChange: (per_page: number) => reload({ per_page }),
        sort: { column: filters.sort, dir: filters.dir },
        onSortChange: (column: string, dir: 'asc' | 'desc') =>
            reload({ sort: column, dir }),
        isFiltered,
        toolbar,
    };

    return (
        <>
            <Head title="Payments" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Payments
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Rent payments recorded against leases · Total collected{' '}
                        <span className="font-semibold text-foreground">
                            {formatCurrency(total_collected, currency)}
                        </span>
                    </p>
                </div>
                {can('payments.add') && (
                    <Button asChild>
                        <Link href={payments.create()}>
                            <Plus className="size-[15px]" />
                            Record payment
                        </Link>
                    </Button>
                )}
            </div>

            {filters.tab === 'active' &&
                (filters.status.length > 0 ||
                    activeSingleFilterKeys.length > 0) && (
                    <div className="mb-3.5 flex flex-wrap items-center gap-2">
                        {filters.status.map((value) => (
                            <span
                                key={`status-${value}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                            >
                                {statuses.find((s) => s.value === value)
                                    ?.label ?? value}
                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleStatusFilter(value, false)
                                    }
                                    className="rounded-full p-0.5 hover:bg-black/10"
                                >
                                    <X className="size-2.5" />
                                </button>
                            </span>
                        ))}
                        {activeSingleFilterKeys.map((key) => (
                            <span
                                key={key}
                                className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                            >
                                {singleFilterLabel(key)}
                                <button
                                    type="button"
                                    onClick={() => removeSingleFilter(key)}
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
                    tableId="payments"
                    columns={activeColumns}
                    data={paginator.data as ActivePaymentRow[]}
                    emptyState={{
                        icon: CreditCard,
                        title: 'No payments yet',
                        description:
                            'Record your first rent payment against a lease.',
                        action: can('payments.add')
                            ? {
                                  label: 'Record your first payment',
                                  href: payments.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="payments-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashPaymentRow[]}
                    emptyState={{
                        icon: CreditCard,
                        title: 'Trash is empty',
                        description:
                            'Payments you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
