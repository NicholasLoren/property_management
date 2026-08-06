import { Head, Link, router, usePage } from '@inertiajs/react';
import { FileText, Filter, Plus, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { getLeaseColumns, getLeaseTrashColumns } from '@/pages/leases/columns';
import type { ActiveLeaseRow, TrashLeaseRow } from '@/pages/leases/columns';
import leases from '@/routes/leases';
import type { LeaseRow } from '@/types/leases';

type Option = { value: string; label: string };

type PageProps = {
    leases: {
        data: (ActiveLeaseRow | TrashLeaseRow)[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number | null;
            to: number | null;
        };
    };
    filters: {
        search: string;
        status: string[];
        unit_id: string[];
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    statuses: Option[];
    units: Option[];
};

export default function LeasesIndex({
    leases: paginator,
    filters,
    counts,
    statuses,
    units,
}: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            leases.index().url,
            {
                search: next.search || undefined,
                status: next.status.length ? next.status : undefined,
                unit_id: next.unit_id.length ? next.unit_id : undefined,
                sort: next.sort,
                dir: next.dir,
                per_page: next.per_page,
                tab: next.tab,
            },
            { preserveState: true, preserveScroll: true, replace: true },
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

    function toggleUnitFilter(value: string, checked: boolean) {
        const unit_id = checked
            ? [...filters.unit_id, value]
            : filters.unit_id.filter((u) => u !== value);
        reload({ unit_id });
    }

    function clearAllFilters() {
        reload({ status: [], unit_id: [] });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, status: [], unit_id: [], search: '' });
    }

    function moveToTrash(lease: LeaseRow) {
        router.delete(leases.destroy(lease).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`Lease #${lease.id} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                leases.restore(lease).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(lease: LeaseRow) {
        router.patch(leases.restore(lease).url, {}, { preserveScroll: true });
    }

    function forceDelete(lease: LeaseRow) {
        if (
            !confirm(`Permanently delete lease #${lease.id}? This cannot be undone.`)
        ) {
            return;
        }

        router.delete(leases.forceDelete(lease).url, { preserveScroll: true });
    }

    const canEditLeases = can('leases.edit');
    const canDeleteLeases = can('leases.delete');

    const activeColumns = useMemo(
        () =>
            getLeaseColumns({
                canEdit: canEditLeases,
                canDelete: canDeleteLeases,
                currency,
                onTrash: moveToTrash,
            }),
        [canEditLeases, canDeleteLeases, currency],
    );

    const trashColumns = useMemo(
        () => getLeaseTrashColumns({ onRestore: restore, onForceDelete: forceDelete }),
        [],
    );

    const activeFilterChips = [
        ...filters.status.map((value) => ({
            group: 'status' as const,
            value,
            label: `Status: ${statuses.find((s) => s.value === value)?.label ?? value}`,
        })),
        ...filters.unit_id.map((value) => ({
            group: 'unit' as const,
            value,
            label: `Unit: ${units.find((u) => u.value === value)?.label ?? value}`,
        })),
    ];

    const isFiltered =
        filters.search !== '' ||
        filters.status.length > 0 ||
        filters.unit_id.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search leases…"
                    className="pl-9"
                />
            </div>

            {filters.tab === 'active' && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="size-[15px]" />
                            Filters
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                        {statuses.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status.value}
                                checked={filters.status.includes(status.value)}
                                onCheckedChange={(checked) =>
                                    toggleStatusFilter(
                                        status.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {status.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Unit</DropdownMenuLabel>
                        {units.map((unit) => (
                            <DropdownMenuCheckboxItem
                                key={unit.value}
                                checked={filters.unit_id.includes(unit.value)}
                                onCheckedChange={(checked) =>
                                    toggleUnitFilter(
                                        unit.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {unit.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {canDeleteLeases && (
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
                leases.index().url,
                {
                    search: filters.search || undefined,
                    status: filters.status.length ? filters.status : undefined,
                    unit_id: filters.unit_id.length ? filters.unit_id : undefined,
                    sort: filters.sort,
                    dir: filters.dir,
                    per_page: filters.per_page,
                    tab: filters.tab,
                    page,
                },
                { preserveState: true, preserveScroll: true, replace: true },
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
            <Head title="Leases" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Leases
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Tenancy agreements across your portfolio.
                    </p>
                </div>
                {can('leases.add') && (
                    <Button asChild>
                        <Link href={leases.create()}>
                            <Plus className="size-[15px]" />
                            Add lease
                        </Link>
                    </Button>
                )}
            </div>

            {activeFilterChips.length > 0 && (
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                    {activeFilterChips.map((chip) => (
                        <span
                            key={`${chip.group}-${chip.value}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                        >
                            {chip.label}
                            <button
                                type="button"
                                onClick={() =>
                                    chip.group === 'status'
                                        ? toggleStatusFilter(chip.value, false)
                                        : toggleUnitFilter(chip.value, false)
                                }
                                className="rounded-full p-0.5 hover:bg-black/10"
                            >
                                <X className="size-2.5" />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-xs font-semibold text-text-tertiary hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {filters.tab === 'active' ? (
                <DataTable
                    tableId="leases"
                    columns={activeColumns}
                    data={paginator.data as ActiveLeaseRow[]}
                    emptyState={{
                        icon: FileText,
                        title: 'No leases yet',
                        description:
                            'Add your first lease to start tracking tenancies.',
                        action: can('leases.add')
                            ? {
                                  label: 'Add your first lease',
                                  href: leases.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="leases-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashLeaseRow[]}
                    emptyState={{
                        icon: FileText,
                        title: 'Trash is empty',
                        description:
                            'Leases you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
