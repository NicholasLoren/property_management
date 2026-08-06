import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, ShieldPlus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { getRoleColumns, getRoleTrashColumns } from '@/pages/roles/columns';
import type { ActiveRoleRow, TrashRoleRow } from '@/pages/roles/columns';
import roles from '@/routes/roles';

type PageProps = {
    roles: {
        data: (ActiveRoleRow | TrashRoleRow)[];
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
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
};

export default function RolesIndex({
    roles: paginator,
    filters,
    counts,
}: PageProps) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            roles.index().url,
            {
                search: next.search || undefined,
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

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, search: '' });
        setSearch('');
    }

    function moveToTrash(role: ActiveRoleRow) {
        router.delete(roles.destroy(role).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${role.name} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                roles.restore(role).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
            onError: (errors) => {
                if (errors.role) {
                    toast.error(errors.role);
                }
            },
        });
    }

    function restore(role: TrashRoleRow) {
        router.patch(roles.restore(role).url, {}, { preserveScroll: true });
    }

    function forceDelete(role: TrashRoleRow) {
        if (
            !confirm(`Permanently delete ${role.name}? This cannot be undone.`)
        ) {
            return;
        }

        router.delete(roles.forceDelete(role).url, { preserveScroll: true });
    }

    function getExportUrl(format: 'pdf' | 'excel') {
        return roles.export(format, {
            query: { search: filters.search || undefined },
        }).url;
    }

    const canEditRoles = can('roles.edit');
    const canDeleteRoles = can('roles.delete');

    const activeColumns = useMemo(
        () =>
            getRoleColumns({
                canEdit: canEditRoles,
                canDelete: canDeleteRoles,
                onTrash: moveToTrash,
            }),
        [canEditRoles, canDeleteRoles],
    );

    const trashColumns = useMemo(
        () =>
            getRoleTrashColumns({
                onRestore: restore,
                onForceDelete: forceDelete,
            }),
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
                    placeholder="Search roles…"
                    className="pl-9"
                />
            </div>

            {canDeleteRoles && (
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
                roles.index().url,
                {
                    search: filters.search || undefined,
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
            <Head title="Roles" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Roles
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Roles and the permissions they grant.
                    </p>
                </div>
                {can('roles.add') && (
                    <Button asChild>
                        <Link href={roles.create()}>
                            <Plus className="size-[15px]" />
                            Add role
                        </Link>
                    </Button>
                )}
            </div>

            {filters.tab === 'active' ? (
                <DataTable
                    tableId="roles"
                    columns={activeColumns}
                    data={paginator.data as ActiveRoleRow[]}
                    emptyState={{
                        icon: ShieldPlus,
                        title: 'No roles yet',
                        description:
                            'Create your first role and choose which permissions it grants.',
                        action: can('roles.add')
                            ? {
                                  label: 'Add your first role',
                                  href: roles.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="roles-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashRoleRow[]}
                    emptyState={{
                        icon: ShieldPlus,
                        title: 'Trash is empty',
                        description:
                            'Roles you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
