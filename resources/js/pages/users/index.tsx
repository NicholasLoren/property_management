import { Head, Link, router, usePage } from '@inertiajs/react';
import { Filter, Plus, Search, UserPlus, X } from 'lucide-react';
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
import { useInitials } from '@/hooks/use-initials';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { getUserColumns, getUserTrashColumns } from '@/pages/users/columns';
import type { ActiveUserRow, TrashUserRow } from '@/pages/users/columns';
import users from '@/routes/users';
import type { UserRow } from '@/types/users';

type Option = { value: string; label: string };

type PageProps = {
    users: {
        data: (ActiveUserRow | TrashUserRow)[];
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
        role: string[];
        status: string[];
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    roles: Option[];
    statuses: Option[];
};

export default function UsersIndex({
    users: paginator,
    filters,
    counts,
    roles,
    statuses,
}: PageProps) {
    const { name } = usePage().props;
    const { can } = usePermissions();
    const getInitials = useInitials();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep the input in sync when the server resets `search` (e.g. switching
    // tabs) without fighting the debounce above during normal typing.
    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            users.index().url,
            {
                search: next.search || undefined,
                role: next.role.length ? next.role : undefined,
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

    function toggleRoleFilter(value: string, checked: boolean) {
        const role = checked
            ? [...filters.role, value]
            : filters.role.filter((r) => r !== value);
        reload({ role });
    }

    function toggleStatusFilter(value: string, checked: boolean) {
        const status = checked
            ? [...filters.status, value]
            : filters.status.filter((s) => s !== value);
        reload({ status });
    }

    function clearAllFilters() {
        reload({ role: [], status: [] });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, role: [], status: [], search: '' });
    }

    function moveToTrash(user: UserRow) {
        router.delete(users.destroy(user).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${user.name} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                users.restore(user).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(user: UserRow) {
        router.patch(users.restore(user).url, {}, { preserveScroll: true });
    }

    function forceDelete(user: UserRow) {
        if (
            !confirm(`Permanently delete ${user.name}? This cannot be undone.`)
        ) {
            return;
        }

        router.delete(users.forceDelete(user).url, { preserveScroll: true });
    }

    function getExportUrl(format: 'pdf' | 'excel') {
        return users.export(format, {
            query: {
                search: filters.search || undefined,
                role: filters.role.length ? filters.role : undefined,
                status: filters.status.length ? filters.status : undefined,
            },
        }).url;
    }

    const canEditUsers = can('users.edit');
    const canDeleteUsers = can('users.delete');

    const activeColumns = useMemo(
        () =>
            getUserColumns({
                getInitials,
                canEdit: canEditUsers,
                canDelete: canDeleteUsers,
                onTrash: moveToTrash,
            }),
        [getInitials, canEditUsers, canDeleteUsers],
    );

    const trashColumns = useMemo(
        () =>
            getUserTrashColumns({
                getInitials,
                onRestore: restore,
                onForceDelete: forceDelete,
            }),
        [getInitials],
    );

    const activeFilterChips = [
        ...filters.role.map((value) => ({
            group: 'role' as const,
            value,
            label: `Role: ${roles.find((r) => r.value === value)?.label ?? value}`,
        })),
        ...filters.status.map((value) => ({
            group: 'status' as const,
            value,
            label: `Status: ${statuses.find((s) => s.value === value)?.label ?? value}`,
        })),
    ];

    const isFiltered =
        filters.search !== '' ||
        filters.role.length > 0 ||
        filters.status.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search users…"
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
                        <DropdownMenuLabel>Role</DropdownMenuLabel>
                        {roles.map((role) => (
                            <DropdownMenuCheckboxItem
                                key={role.value}
                                checked={filters.role.includes(role.value)}
                                onCheckedChange={(checked) =>
                                    toggleRoleFilter(
                                        role.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {role.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
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

            {canDeleteUsers && (
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
                users.index().url,
                {
                    search: filters.search || undefined,
                    role: filters.role.length ? filters.role : undefined,
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
        getExportUrl,
        isFiltered,
        toolbar,
    };

    return (
        <>
            <Head title="Users" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Users
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Staff and landlord accounts with access to {name}.
                    </p>
                </div>
                {can('users.add') && (
                    <Button asChild>
                        <Link href={users.create()}>
                            <Plus className="size-[15px]" />
                            Invite user
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
                                    chip.group === 'role'
                                        ? toggleRoleFilter(chip.value, false)
                                        : toggleStatusFilter(chip.value, false)
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
                    tableId="users"
                    columns={activeColumns}
                    data={paginator.data as ActiveUserRow[]}
                    emptyState={{
                        icon: UserPlus,
                        title: 'No users yet',
                        description:
                            'Invite your first teammate or landlord to get started.',
                        action: can('users.add')
                            ? {
                                  label: 'Invite your first user',
                                  href: users.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="users-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashUserRow[]}
                    emptyState={{
                        icon: UserPlus,
                        title: 'Trash is empty',
                        description:
                            'Users you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}

            <div className="mt-10 border-t border-border-soft pt-4.5 text-center text-[11.5px] text-text-tertiary">
                {name} · deleted users are kept for 30 days and can be
                restored from the Trash tab
            </div>
        </>
    );
}
