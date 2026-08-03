import { Head, router } from '@inertiajs/react';
import { ScrollText, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/ui/input';
import { getLogColumns } from '@/pages/logs/columns';
import type { LogRow } from '@/pages/logs/columns';
import logs from '@/routes/logs';

type PageProps = {
    logs: {
        data: LogRow[];
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

export default function LogsIndex({ logs: paginator, filters }: PageProps) {
    const [search, setSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            logs.index().url,
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

    const columns = useMemo(() => getLogColumns(), []);
    const isFiltered = filters.search !== '';

    const toolbar = (
        <div className="relative w-[260px]">
            <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
            <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search activity…"
                className="pl-9"
            />
        </div>
    );

    return (
        <>
            <Head title="Activity log" />

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Activity log
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Every action taken in Steward, kept for auditing — this list
                    can’t be edited or deleted.
                </p>
            </div>

            <DataTable
                tableId="logs"
                columns={columns}
                data={paginator.data}
                pagination={paginator.meta}
                onPageChange={(page) =>
                    router.get(
                        logs.index().url,
                        {
                            search: filters.search || undefined,
                            dir: filters.dir,
                            per_page: filters.per_page,
                            page,
                        },
                        {
                            preserveState: true,
                            preserveScroll: true,
                            replace: true,
                        },
                    )
                }
                onPerPageChange={(per_page) => reload({ per_page })}
                sort={{ column: 'created_at', dir: filters.dir }}
                onSortChange={(_column, dir) => reload({ dir })}
                isFiltered={isFiltered}
                emptyState={{
                    icon: ScrollText,
                    title: 'No activity yet',
                    description:
                        'Actions taken across Steward will show up here.',
                }}
                toolbar={toolbar}
            />
        </>
    );
}
