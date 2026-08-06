import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, KeyRound, Plus, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import landlords from '@/routes/landlords';
import users from '@/routes/users';

type LandlordRow = {
    id: number;
    name: string;
    email: string;
    properties_count: number;
};

type PageProps = {
    landlords: {
        data: LandlordRow[];
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
    };
};

function LandlordIdentityCell({ landlord }: { landlord: LandlordRow }) {
    return (
        <Link
            href={landlords.show(landlord)}
            className="flex items-center gap-2.5 hover:opacity-80"
        >
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <KeyRound className="size-4" />
            </span>
            <div>
                <div className="text-[13px] font-semibold">{landlord.name}</div>
                <div className="text-xs text-text-tertiary">
                    {landlord.email}
                </div>
            </div>
        </Link>
    );
}

const columns: ColumnDef<LandlordRow>[] = [
    {
        id: 'name',
        accessorKey: 'name',
        header: 'Landlord',
        enableHiding: false,
        meta: { label: 'Landlord', sortKey: 'name' },
        cell: ({ row }) => <LandlordIdentityCell landlord={row.original} />,
    },
    {
        id: 'properties',
        header: 'Properties',
        meta: { label: 'Properties' },
        cell: ({ row }) => (
            <span className="text-sm text-text-secondary">
                {row.original.properties_count}
            </span>
        ),
    },
    {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-end">
                <Button variant="ghost" size="icon" className="size-8" asChild>
                    <Link href={landlords.show(row.original)}>
                        <Eye className="size-[15px]" />
                    </Link>
                </Button>
            </div>
        ),
    },
];

export default function LandlordsIndex({
    landlords: paginator,
    filters,
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
            landlords.index().url,
            {
                search: next.search || undefined,
                dir: next.dir,
                per_page: next.per_page,
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

    const toolbar = (
        <div className="relative w-[260px]">
            <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
            <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search landlords…"
                className="pl-9"
            />
        </div>
    );

    const memoColumns = useMemo(() => columns, []);

    return (
        <>
            <Head title="Landlords" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Landlords
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Owners whose properties you manage.
                    </p>
                </div>
                {can('users.add') && (
                    <Button asChild>
                        <Link href={users.create({ query: { role: 'Landlord' } })}>
                            <Plus className="size-[15px]" />
                            Add landlord
                        </Link>
                    </Button>
                )}
            </div>

            <DataTable
                tableId="landlords"
                columns={memoColumns}
                data={paginator.data}
                pagination={paginator.meta}
                onPageChange={(page) =>
                    router.get(
                        landlords.index().url,
                        {
                            search: filters.search || undefined,
                            dir: filters.dir,
                            per_page: filters.per_page,
                            page,
                        },
                        { preserveState: true, preserveScroll: true, replace: true },
                    )
                }
                onPerPageChange={(per_page) => reload({ per_page })}
                sort={{ column: 'name', dir: filters.dir }}
                onSortChange={(_column, dir) => reload({ dir })}
                isFiltered={filters.search !== ''}
                toolbar={toolbar}
                emptyState={{
                    icon: KeyRound,
                    title: 'No landlords yet',
                    description:
                        'Add your first landlord to start attaching properties to them.',
                    action: can('users.add')
                        ? {
                              label: 'Add your first landlord',
                              href: users.create({ query: { role: 'Landlord' } })
                                  .url,
                          }
                        : undefined,
                }}
            />
        </>
    );
}
