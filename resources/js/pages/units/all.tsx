import { Head, router, usePage } from '@inertiajs/react';
import { DoorOpen, Filter, Search, X } from 'lucide-react';
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
import {
    getAllUnitColumns,
    getAllUnitTrashColumns,
} from '@/pages/units/all-columns';
import type {
    ActiveUnitWithPropertyRow,
    TrashUnitWithPropertyRow,
} from '@/pages/units/all-columns';
import units from '@/routes/units';
import type { UnitWithPropertyRow } from '@/types/units';

type Option = { value: string; label: string };

type PageProps = {
    units: {
        data: (ActiveUnitWithPropertyRow | TrashUnitWithPropertyRow)[];
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
        property_id: string[];
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    statuses: Option[];
    properties: Option[];
};

export default function AllUnitsIndex({
    units: paginator,
    filters,
    counts,
    statuses,
    properties,
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
            units.all().url,
            {
                search: next.search || undefined,
                status: next.status.length ? next.status : undefined,
                property_id: next.property_id.length
                    ? next.property_id
                    : undefined,
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

    function togglePropertyFilter(value: string, checked: boolean) {
        const property_id = checked
            ? [...filters.property_id, value]
            : filters.property_id.filter((p) => p !== value);
        reload({ property_id });
    }

    function clearAllFilters() {
        reload({ status: [], property_id: [] });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, status: [], property_id: [], search: '' });
    }

    function editUnit(unit: UnitWithPropertyRow) {
        if (!unit.property) {
            return;
        }

        router.visit(units.edit([unit.property.id, unit.id]).url);
    }

    function moveToTrash(unit: UnitWithPropertyRow) {
        if (!unit.property) {
            return;
        }

        router.delete(units.destroy([unit.property.id, unit.id]).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${unit.name} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                units.restore([unit.property!.id, unit.id]).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(unit: UnitWithPropertyRow) {
        if (!unit.property) {
            return;
        }

        router.patch(
            units.restore([unit.property.id, unit.id]).url,
            {},
            { preserveScroll: true },
        );
    }

    function forceDelete(unit: UnitWithPropertyRow) {
        if (!unit.property) {
            return;
        }

        if (
            !confirm(`Permanently delete ${unit.name}? This cannot be undone.`)
        ) {
            return;
        }

        router.delete(units.forceDelete([unit.property.id, unit.id]).url, {
            preserveScroll: true,
        });
    }

    const canEditUnits = can('units.edit');
    const canDeleteUnits = can('units.delete');

    const activeColumns = useMemo(
        () =>
            getAllUnitColumns({
                canEdit: canEditUnits,
                canDelete: canDeleteUnits,
                currency,
                onEdit: editUnit,
                onTrash: moveToTrash,
            }),

        [canEditUnits, canDeleteUnits, currency],
    );

    const trashColumns = useMemo(
        () =>
            getAllUnitTrashColumns({
                onRestore: restore,
                onForceDelete: forceDelete,
            }),

        [],
    );

    const activeFilterChips = [
        ...filters.status.map((value) => ({
            group: 'status' as const,
            value,
            label: `Status: ${statuses.find((s) => s.value === value)?.label ?? value}`,
        })),
        ...filters.property_id.map((value) => ({
            group: 'property' as const,
            value,
            label: `Property: ${properties.find((p) => p.value === value)?.label ?? value}`,
        })),
    ];

    const isFiltered =
        filters.search !== '' ||
        filters.status.length > 0 ||
        filters.property_id.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search units or properties…"
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
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Property</DropdownMenuLabel>
                        {properties.map((property) => (
                            <DropdownMenuCheckboxItem
                                key={property.value}
                                checked={filters.property_id.includes(
                                    property.value,
                                )}
                                onCheckedChange={(checked) =>
                                    togglePropertyFilter(
                                        property.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {property.label}
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
                units.all().url,
                {
                    search: filters.search || undefined,
                    status: filters.status.length ? filters.status : undefined,
                    property_id: filters.property_id.length
                        ? filters.property_id
                        : undefined,
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
            <Head title="Units" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Units
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Every rentable unit across your properties.
                    </p>
                </div>
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
                                        : togglePropertyFilter(
                                              chip.value,
                                              false,
                                          )
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
                    tableId="all-units"
                    columns={activeColumns}
                    data={paginator.data as ActiveUnitWithPropertyRow[]}
                    emptyState={{
                        icon: DoorOpen,
                        title: 'No units yet',
                        description:
                            'Units you add to a property will show up here.',
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="all-units-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashUnitWithPropertyRow[]}
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
