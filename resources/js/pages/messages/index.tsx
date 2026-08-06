import { Head, Link, router, usePage } from '@inertiajs/react';
import { Inbox, Plus, Search, Send as SendIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { getInboxColumns, getSentColumns } from '@/pages/messages/columns';
import type { InboxMessageRow, SentMessageRow } from '@/pages/messages/columns';
import messages from '@/routes/messages';

type PageProps = {
    messages: {
        data: (InboxMessageRow | SentMessageRow)[];
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
        tab: 'inbox' | 'sent';
        per_page: number;
    };
    counts: { inbox: number; sent: number };
};

export default function MessagesIndex({
    messages: paginator,
    filters,
    counts,
}: PageProps) {
    const { name } = usePage().props;
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            messages.index().url,
            {
                search: next.search || undefined,
                tab: next.tab,
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

    function switchTab(tab: 'inbox' | 'sent') {
        reload({ tab, search: '' });
        setSearch('');
    }

    const inboxColumns = useMemo(() => getInboxColumns(), []);
    const sentColumns = useMemo(() => getSentColumns(), []);
    const isFiltered = filters.search !== '';

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search messages…"
                    className="pl-9"
                />
            </div>

            <div className="inline-flex gap-0.5 rounded-full border border-border-soft bg-secondary p-[3px]">
                {(['inbox', 'sent'] as const).map((tab) => (
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
        </>
    );

    const sharedTableProps = {
        pagination: paginator.meta,
        onPageChange: (page: number) =>
            router.get(
                messages.index().url,
                {
                    search: filters.search || undefined,
                    tab: filters.tab,
                    per_page: filters.per_page,
                    page,
                },
                { preserveState: true, preserveScroll: true, replace: true },
            ),
        onPerPageChange: (per_page: number) => reload({ per_page }),
        sort: { column: 'created_at', dir: 'desc' as const },
        onSortChange: () => {},
        isFiltered,
        toolbar,
    };

    return (
        <>
            <Head title="Messages" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Messages
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Personal messages and broadcasts sent within {name}.
                    </p>
                </div>
                {can('messages.send') && (
                    <Button asChild>
                        <Link href={messages.create()}>
                            <Plus className="size-[15px]" />
                            New message
                        </Link>
                    </Button>
                )}
            </div>

            {filters.tab === 'inbox' ? (
                <DataTable
                    tableId="messages-inbox"
                    columns={inboxColumns}
                    data={paginator.data as InboxMessageRow[]}
                    emptyState={{
                        icon: Inbox,
                        title: 'No messages yet',
                        description:
                            'Personal messages and broadcasts sent to you will show up here.',
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="messages-sent"
                    columns={sentColumns}
                    data={paginator.data as SentMessageRow[]}
                    emptyState={{
                        icon: SendIcon,
                        title: 'No messages sent yet',
                        description: 'Messages you send will show up here.',
                        action: can('messages.send')
                            ? {
                                  label: 'Send your first message',
                                  href: messages.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
