import { Link, router } from '@inertiajs/react';
import { Bell, Check } from 'lucide-react';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { formatRelativeTime } from '@/lib/datetime';
import type { NotificationRow } from '@/lib/notifications';
import { describeNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import notifications from '@/routes/notifications';

export function NotificationsMenu({
    unreadCount,
    currency,
}: {
    unreadCount: number;
    currency: string;
}) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationRow[] | null>(null);
    const [loading, setLoading] = useState(false);
    const hasUnread = unreadCount > 0;

    function handleOpenChange(next: boolean) {
        setOpen(next);

        if (!next) {
            return;
        }

        setLoading(true);
        fetch(notifications.recent().url, {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data: { notifications: NotificationRow[] }) => {
                setItems(data.notifications);
            })
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }

    function openNotification(row: NotificationRow) {
        if (row.read_at !== null) {
            if (row.url) {
                router.visit(row.url);
            }

            return;
        }

        setItems(
            (prev) =>
                prev?.map((item) =>
                    item.id === row.id
                        ? { ...item, read_at: new Date().toISOString() }
                        : item,
                ) ?? prev,
        );

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
        setItems(
            (prev) =>
                prev?.map((row) => ({
                    ...row,
                    read_at: row.read_at ?? new Date().toISOString(),
                })) ?? prev,
        );

        router.patch(
            notifications.readAll().url,
            {},
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Notifications"
                    title="Notifications"
                    className="relative flex size-[30px] items-center justify-center rounded-[6px] text-text-secondary hover:bg-secondary hover:text-foreground"
                >
                    <Bell className="size-[15px]" />
                    {hasUnread && (
                        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full border-[1.5px] border-surface bg-destructive" />
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[360px] rounded-lg p-0"
                align="end"
            >
                <div className="flex items-center justify-between px-3 py-2.5">
                    <DropdownMenuLabel className="p-0 text-[13px] font-semibold">
                        Notifications
                    </DropdownMenuLabel>
                    {hasUnread && (
                        <button
                            type="button"
                            onClick={markAllAsRead}
                            className="flex items-center gap-1 text-[12px] font-medium text-accent-strong hover:underline"
                        >
                            <Check className="size-3.5" />
                            Mark all as read
                        </button>
                    )}
                </div>
                <DropdownMenuSeparator className="my-0" />

                <div className="max-h-[360px] overflow-y-auto">
                    {loading && !items ? (
                        <div className="flex items-center justify-center py-10">
                            <Spinner />
                        </div>
                    ) : items && items.length > 0 ? (
                        items.map((row) => {
                            const { icon: Icon, message } =
                                describeNotification(row, currency);
                            const isUnread = row.read_at === null;

                            return (
                                <DropdownMenuItem
                                    key={row.id}
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        openNotification(row);
                                    }}
                                    className={cn(
                                        'flex items-start gap-2.5 rounded-none px-3 py-2.5',
                                        isUnread && 'bg-accent-soft/40',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                                            isUnread
                                                ? 'bg-accent-soft text-accent-strong'
                                                : 'bg-secondary text-text-tertiary',
                                        )}
                                    >
                                        <Icon className="size-3.5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5">
                                            <span
                                                className={cn(
                                                    'text-[12.5px]',
                                                    isUnread
                                                        ? 'font-semibold text-foreground'
                                                        : 'text-text-secondary',
                                                )}
                                            >
                                                {row.type}
                                            </span>
                                            {isUnread && (
                                                <span className="size-1.5 shrink-0 rounded-full bg-accent-strong" />
                                            )}
                                        </span>
                                        <span className="mt-0.5 block text-[12.5px] break-words text-text-secondary">
                                            {message}
                                        </span>
                                        <span className="mt-0.5 block text-[11px] text-text-tertiary">
                                            {formatRelativeTime(row.created_at)}
                                        </span>
                                    </span>
                                </DropdownMenuItem>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                            <Bell className="size-5 text-text-tertiary" />
                            <p className="text-[12.5px] text-text-secondary">
                                No notifications yet
                            </p>
                        </div>
                    )}
                </div>

                <DropdownMenuSeparator className="my-0" />
                <DropdownMenuItem
                    asChild
                    className="justify-center rounded-none py-2.5"
                >
                    <Link
                        href={notifications.index()}
                        className="block w-full text-center text-[12.5px] font-semibold text-accent-strong"
                    >
                        See all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
