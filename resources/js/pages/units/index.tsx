import { Head, Link, router, usePage } from '@inertiajs/react';
import { DoorOpen, Filter, Plus, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { getUnitColumns, getUnitTrashColumns } from '@/pages/units/columns';
import type { ActiveUnitRow, TrashUnitRow } from '@/pages/units/columns';
import properties from '@/routes/properties';
import units from '@/routes/units';
import type { UnitRow } from '@/types/units';

type Option = { value: string; label: string };

type PropertyContext = { id: number; name: string };

type PageProps = {
    property: PropertyContext;
    units: {
        data: (ActiveUnitRow | TrashUnitRow)[];
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
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    statuses: Option[];
};

export default function UnitsIndex({
    property,
    units: paginator,
    filters,
    counts,
    statuses,
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
            units.index(property).url,
            {
                search: next.search || undefined,
                status: next.status.length ? next.status : undefined,
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

    function clearAllFilters() {
        reload({ status: [] });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, status: [], search: '' });
    }

    function editUnit(unit: UnitRow) {
        router.visit(units.edit([property.id, unit.id]).url);
    }

    function moveToTrash(unit: UnitRow) {
        router.delete(units.destroy([property.id, unit.id]).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${unit.name} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                units.restore([property.id, unit.id]).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(unit: UnitRow) {
        router.patch(
            units.restore([property.id, unit.id]).url,
            {},
            { preserveScroll: true },
        );
    }

    function forceDelete(unit: UnitRow) {
        if (
            !confirm(`Permanently delete ${unit.name}? This cannot be undone.`)
        ) {
            return;
        }

        router.delete(units.forceDelete([property.id, unit.id]).url, {
            preserveScroll: true,
        });
    }

    const canEditUnits = can('units.edit');
    const canDeleteUnits = can('units.delete');

    const activeColumns = useMemo(
        () =>
            getUnitColumns({
                propertyId: property.id,
                canEdit: canEditUnits,
                canDelete: canDeleteUnits,
                currency,
                onEdit: editUnit,
                onTrash: moveToTrash,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [property.id, canEditUnits, canDeleteUnits, currency],
    );

    const trashColumns = useMemo(
        () =>
            getUnitTrashColumns({
                propertyId: property.id,
                onRestore: restore,
                onForceDelete: forceDelete,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [property.id],
    );

    const activeFilterChips = filters.status.map((value) => ({
        value,
        label: `Status: ${statuses.find((s) => s.value === value)?.label ?? value}`,
    }));

    const isFiltered = filters.search !== '' || filters.status.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by name or code…"
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
                    <DropdownMenuContent align="start" className="w-56">
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
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {canDeleteUnits && (
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
                units.index(property).url,
                {
                    search: filters.search || undefined,
                    status: filters.status.length ? filters.status : undefined,
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
            <Head title={`Units · ${property.name}`} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Properties', href: properties.index() },
                        {
                            title: property.name,
                            href: properties.show(property),
                        },
                        { title: 'Units', href: units.index(property) },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Units
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Rentable units within {property.name}.
                    </p>
                </div>
                {can('units.add') && (
                    <Button asChild>
                        <Link href={units.create(property)}>
                            <Plus className="size-[15px]" />
                            Add unit
                        </Link>
                    </Button>
                )}
            </div>

            {activeFilterChips.length > 0 && (
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                    {activeFilterChips.map((chip) => (
                        <span
                            key={chip.value}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                        >
                            {chip.label}
                            <button
                                type="button"
                                onClick={() =>
                                    toggleStatusFilter(chip.value, false)
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
                    tableId="units"
                    columns={activeColumns}
                    data={paginator.data as ActiveUnitRow[]}
                    emptyState={{
                        icon: DoorOpen,
                        title: 'No units yet',
                        description:
                            'Add the first unit in this property to start tracking pricing and occupancy.',
                        action: can('units.add')
                            ? {
                                  label: 'Add your first unit',
                                  href: units.create(property).url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="units-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashUnitRow[]}
                    emptyState={{
                        icon: DoorOpen,
                        title: 'Trash is empty',
                        description:
                            'Units you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
