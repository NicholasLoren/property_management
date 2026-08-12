import { Head, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Bell, Check, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTablePaginationMeta } from '@/components/data-table/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/datetime';
import type { NotificationRow } from '@/lib/notifications';
import { describeNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import notifications from '@/routes/notifications';

type Filters = {
    search: string;
    sort: string;
    dir: 'asc' | 'desc';
    per_page: number;
};

type PageProps = {
    notifications: {
        data: NotificationRow[];
        meta: DataTablePaginationMeta;
    };
    filters: Filters;
};

export default function NotificationsIndex({
    notifications: paginator,
    filters,
}: PageProps) {
    const { timezone, currency, unreadNotificationsCount } = usePage().props;
    const [search, setSearch] = useState(filters.search);
    const [scopeLoading, setScopeLoading] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasUnread = unreadNotificationsCount > 0;

    function reload(partial: Partial<Filters & { page: number }>) {
        const next = { ...filters, ...partial };

        router.get(
            notifications.index().url,
            {
                search: next.search || undefined,
                sort: next.sort,
                dir: next.dir,
                per_page: next.per_page,
                page: 'page' in partial ? partial.page : 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setScopeLoading(true),
                onFinish: () => setScopeLoading(false),
            },
        );
    }

    function onSearchChange(value: string) {
        setSearch(value);

        if (searchDebounce.current) {
            clearTimeout(searchDebounce.current);
        }

        searchDebounce.current = setTimeout(() => {
            reload({ search: value, page: 1 });
        }, 300);
    }

    function openNotification(row: NotificationRow) {
        if (row.read_at !== null) {
            if (row.url) {
                router.visit(row.url);
            }

            return;
        }

        router.patch(
            notifications.read(row.id).url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    if (row.url) {
                        router.visit(row.url);
                    }
                },
            },
        );
    }

    function markAllAsRead() {
        router.patch(notifications.readAll().url, {}, { preserveScroll: true });
    }

    const columns = useMemo<ColumnDef<NotificationRow>[]>(
        () => [
            {
                id: 'type',
                accessorKey: 'type',
                header: 'Notification',
                meta: { label: 'Notification', sortKey: 'type' },
                cell: ({ row }) => {
                    const notif = row.original;
                    const { icon: Icon, message } = describeNotification(
                        notif,
                        currency,
                    );
                    const isUnread = notif.read_at === null;

                    return (
                        <div className="flex items-center gap-2.5">
                            <span
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                                    isUnread
                                        ? 'bg-accent-soft text-accent-strong'
                                        : 'bg-secondary text-text-tertiary',
                                )}
                            >
                                <Icon className="size-[15px]" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={cn(
                                            'text-[13px]',
                                            isUnread
                                                ? 'font-semibold text-foreground'
                                                : 'text-text-secondary',
                                        )}
                                    >
                                        {notif.type}
                                    </span>
                                    {isUnread && (
                                        <span className="size-1.5 shrink-0 rounded-full bg-accent-strong" />
                                    )}
                                </div>
                                <div className="truncate text-[12.5px] text-text-secondary">
                                    {message}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'read_at',
                accessorKey: 'read_at',
                header: 'Status',
                meta: { label: 'Status', sortKey: 'read_at' },
                cell: ({ row }) =>
                    row.original.read_at === null ? (
                        <Badge className="bg-accent-soft text-accent-strong">
                            Unread
                        </Badge>
                    ) : (
                        <Badge variant="outline">Read</Badge>
                    ),
            },
            {
                id: 'created_at',
                accessorKey: 'created_at',
                header: 'Received',
                meta: { label: 'Received', sortKey: 'created_at' },
                cell: ({ row }) => (
                    <span className="text-[13px] text-text-secondary">
                        {formatDateTime(row.original.created_at, timezone)}
                    </span>
                ),
            },
        ],
        [currency, timezone],
    );

    return (
        <>
            <Head title="Notifications" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Notifications
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Rent reminders and other alerts addressed to you.
                    </p>
                </div>
                {hasUnread && (
                    <Button variant="outline" onClick={markAllAsRead}>
                        <Check className="size-[15px]" />
                        Mark all as read
                    </Button>
                )}
            </div>

            <DataTable
                tableId="notifications"
                columns={columns}
                data={paginator.data}
                pagination={paginator.meta}
                onPageChange={(page) => reload({ page })}
                onPerPageChange={(per_page) => reload({ per_page, page: 1 })}
                sort={{ column: filters.sort, dir: filters.dir }}
                onSortChange={(column, dir) =>
                    reload({ sort: column, dir, page: 1 })
                }
                onRowClick={openNotification}
                onRefresh={() => reload({ page: paginator.meta.current_page })}
                isRefreshing={scopeLoading}
                isFiltered={search !== ''}
                emptyState={{
                    icon: Bell,
                    title: 'No notifications yet',
                    description: 'Rent reminders and alerts will show up here.',
                }}
                toolbar={
                    <div className="relative w-[220px]">
                        <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                        <Input
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search notifications…"
                            className="pl-9"
                        />
                    </div>
                }
            />
        </>
    );
}
