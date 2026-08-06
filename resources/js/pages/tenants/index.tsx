import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, UserRound } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import {
    getTenantColumns,
    getTenantTrashColumns,
} from '@/pages/tenants/columns';
import type {
    ActiveTenantRow,
    TrashTenantRow,
} from '@/pages/tenants/columns';
import tenants from '@/routes/tenants';
import type { TenantRow } from '@/types/tenants';

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
    filters: {
        search: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
};

export default function TenantsIndex({
    tenants: paginator,
    filters,
    counts,
}: PageProps) {
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
            tenants.index().url,
            {
                search: next.search || undefined,
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

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, search: '' });
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
            !confirm(`Permanently delete ${tenant.name}? This cannot be undone.`)
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
        () => getTenantTrashColumns({ onRestore: restore, onForceDelete: forceDelete }),
        [],
    );

    const isFiltered = filters.search !== '';

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
                    page,
                },
                { preserveState: true, preserveScroll: true, replace: true },
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
