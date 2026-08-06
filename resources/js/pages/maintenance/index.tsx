import { Head, Link, router, usePage } from '@inertiajs/react';
import { Filter, Plus, Search, Wrench, X } from 'lucide-react';
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
    getMaintenanceColumns,
    getMaintenanceTrashColumns,
} from '@/pages/maintenance/columns';
import type {
    ActiveMaintenanceRow,
    TrashMaintenanceRow,
} from '@/pages/maintenance/columns';
import maintenance from '@/routes/maintenance';
import type { MaintenanceRow } from '@/types/maintenance';

type Option = { value: string; label: string };

type PageProps = {
    requests: {
        data: (ActiveMaintenanceRow | TrashMaintenanceRow)[];
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
        priority: string[];
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    statuses: Option[];
    priorities: Option[];
};

export default function MaintenanceIndex({
    requests: paginator,
    filters,
    counts,
    statuses,
    priorities,
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
            maintenance.index().url,
            {
                search: next.search || undefined,
                status: next.status.length ? next.status : undefined,
                priority: next.priority.length ? next.priority : undefined,
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

    function togglePriorityFilter(value: string, checked: boolean) {
        const priority = checked
            ? [...filters.priority, value]
            : filters.priority.filter((p) => p !== value);
        reload({ priority });
    }

    function clearAllFilters() {
        reload({ status: [], priority: [] });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, status: [], priority: [], search: '' });
    }

    function moveToTrash(item: MaintenanceRow) {
        router.delete(maintenance.destroy(item).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${item.title} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                maintenance.restore(item).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(item: MaintenanceRow) {
        router.patch(
            maintenance.restore(item).url,
            {},
            { preserveScroll: true },
        );
    }

    function forceDelete(item: MaintenanceRow) {
        if (!confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) {
            return;
        }

        router.delete(maintenance.forceDelete(item).url, {
            preserveScroll: true,
        });
    }

    const canEdit = can('maintenance.edit');
    const canDelete = can('maintenance.delete');

    const activeColumns = useMemo(
        () =>
            getMaintenanceColumns({
                canEdit,
                canDelete,
                currency,
                onTrash: moveToTrash,
            }),
        [canEdit, canDelete, currency],
    );

    const trashColumns = useMemo(
        () => getMaintenanceTrashColumns({ onRestore: restore, onForceDelete: forceDelete }),
        [],
    );

    const activeFilterChips = [
        ...filters.status.map((value) => ({
            group: 'status' as const,
            value,
            label: `Status: ${statuses.find((s) => s.value === value)?.label ?? value}`,
        })),
        ...filters.priority.map((value) => ({
            group: 'priority' as const,
            value,
            label: `Priority: ${priorities.find((p) => p.value === value)?.label ?? value}`,
        })),
    ];

    const isFiltered =
        filters.search !== '' ||
        filters.status.length > 0 ||
        filters.priority.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search maintenance…"
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
                                    toggleStatusFilter(status.value, checked === true)
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {status.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Priority</DropdownMenuLabel>
                        {priorities.map((priority) => (
                            <DropdownMenuCheckboxItem
                                key={priority.value}
                                checked={filters.priority.includes(priority.value)}
                                onCheckedChange={(checked) =>
                                    togglePriorityFilter(priority.value, checked === true)
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {priority.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
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
                maintenance.index().url,
                {
                    search: filters.search || undefined,
                    status: filters.status.length ? filters.status : undefined,
                    priority: filters.priority.length ? filters.priority : undefined,
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
            <Head title="Maintenance" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Maintenance
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Repair and upkeep requests across your portfolio.
                    </p>
                </div>
                {can('maintenance.add') && (
                    <Button asChild>
                        <Link href={maintenance.create()}>
                            <Plus className="size-[15px]" />
                            Add request
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
                                        : togglePriorityFilter(chip.value, false)
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
                    tableId="maintenance"
                    columns={activeColumns}
                    data={paginator.data as ActiveMaintenanceRow[]}
                    emptyState={{
                        icon: Wrench,
                        title: 'No maintenance requests yet',
                        description:
                            'Log your first repair or upkeep request to start tracking it.',
                        action: can('maintenance.add')
                            ? {
                                  label: 'Add your first request',
                                  href: maintenance.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="maintenance-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashMaintenanceRow[]}
                    emptyState={{
                        icon: Wrench,
                        title: 'Trash is empty',
                        description:
                            'Requests you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
