import { Head, Link, router, usePage } from '@inertiajs/react';
import { Building2, Filter, Plus, Search, X } from 'lucide-react';
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
    getPropertyColumns,
    getPropertyTrashColumns,
} from '@/pages/properties/columns';
import type {
    ActivePropertyRow,
    TrashPropertyRow,
} from '@/pages/properties/columns';
import properties from '@/routes/properties';
import type { PropertyRow } from '@/types/properties';

type Option = { value: string; label: string };

type PageProps = {
    properties: {
        data: (ActivePropertyRow | TrashPropertyRow)[];
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
        type: string[];
        landlord_id: string[];
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    landlords: Option[];
    types: Option[];
};

export default function PropertiesIndex({
    properties: paginator,
    filters,
    counts,
    landlords,
    types,
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
            properties.index().url,
            {
                search: next.search || undefined,
                type: next.type.length ? next.type : undefined,
                landlord_id: next.landlord_id.length
                    ? next.landlord_id
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

    function toggleTypeFilter(value: string, checked: boolean) {
        const type = checked
            ? [...filters.type, value]
            : filters.type.filter((t) => t !== value);
        reload({ type });
    }

    function toggleLandlordFilter(value: string, checked: boolean) {
        const landlord_id = checked
            ? [...filters.landlord_id, value]
            : filters.landlord_id.filter((l) => l !== value);
        reload({ landlord_id });
    }

    function clearAllFilters() {
        reload({ type: [], landlord_id: [] });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, type: [], landlord_id: [], search: '' });
    }

    function moveToTrash(property: PropertyRow) {
        router.delete(properties.destroy(property).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${property.name} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                properties.restore(property).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(property: PropertyRow) {
        router.patch(
            properties.restore(property).url,
            {},
            { preserveScroll: true },
        );
    }

    function forceDelete(property: PropertyRow) {
        if (
            !confirm(
                `Permanently delete ${property.name}? This cannot be undone.`,
            )
        ) {
            return;
        }

        router.delete(properties.forceDelete(property).url, {
            preserveScroll: true,
        });
    }

    function getExportUrl(format: 'pdf' | 'excel') {
        return properties.export(format, {
            query: {
                search: filters.search || undefined,
                type: filters.type.length ? filters.type : undefined,
                landlord_id: filters.landlord_id.length
                    ? filters.landlord_id
                    : undefined,
            },
        }).url;
    }

    const canEditProperties = can('properties.edit');
    const canDeleteProperties = can('properties.delete');

    const activeColumns = useMemo(
        () =>
            getPropertyColumns({
                canEdit: canEditProperties,
                canDelete: canDeleteProperties,
                currency,
                onTrash: moveToTrash,
            }),
        [canEditProperties, canDeleteProperties, currency],
    );

    const trashColumns = useMemo(
        () =>
            getPropertyTrashColumns({
                onRestore: restore,
                onForceDelete: forceDelete,
            }),
        [],
    );

    const activeFilterChips = [
        ...filters.type.map((value) => ({
            group: 'type' as const,
            value,
            label: `Type: ${types.find((t) => t.value === value)?.label ?? value}`,
        })),
        ...filters.landlord_id.map((value) => ({
            group: 'landlord' as const,
            value,
            label: `Landlord: ${landlords.find((l) => l.value === value)?.label ?? value}`,
        })),
    ];

    const isFiltered =
        filters.search !== '' ||
        filters.type.length > 0 ||
        filters.landlord_id.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by name, address, or code…"
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
                        <DropdownMenuLabel>Type</DropdownMenuLabel>
                        {types.map((type) => (
                            <DropdownMenuCheckboxItem
                                key={type.value}
                                checked={filters.type.includes(type.value)}
                                onCheckedChange={(checked) =>
                                    toggleTypeFilter(
                                        type.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {type.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Landlord</DropdownMenuLabel>
                        {landlords.map((landlord) => (
                            <DropdownMenuCheckboxItem
                                key={landlord.value}
                                checked={filters.landlord_id.includes(
                                    landlord.value,
                                )}
                                onCheckedChange={(checked) =>
                                    toggleLandlordFilter(
                                        landlord.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {landlord.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {canDeleteProperties && (
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
                properties.index().url,
                {
                    search: filters.search || undefined,
                    type: filters.type.length ? filters.type : undefined,
                    landlord_id: filters.landlord_id.length
                        ? filters.landlord_id
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
        getExportUrl,
        isFiltered,
        toolbar,
    };

    return (
        <>
            <Head title="Properties" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Properties
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Buildings and houses managed on behalf of landlords.
                    </p>
                </div>
                {can('properties.add') && (
                    <Button asChild>
                        <Link href={properties.create()}>
                            <Plus className="size-[15px]" />
                            Add property
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
                                    chip.group === 'type'
                                        ? toggleTypeFilter(chip.value, false)
                                        : toggleLandlordFilter(
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
                    tableId="properties"
                    columns={activeColumns}
                    data={paginator.data as ActivePropertyRow[]}
                    emptyState={{
                        icon: Building2,
                        title: 'No properties yet',
                        description:
                            'Add your first property to start tracking units, income, and expenses.',
                        action: can('properties.add')
                            ? {
                                  label: 'Add your first property',
                                  href: properties.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="properties-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashPropertyRow[]}
                    emptyState={{
                        icon: Building2,
                        title: 'Trash is empty',
                        description:
                            'Properties you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
