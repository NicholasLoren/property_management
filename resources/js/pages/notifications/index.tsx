import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Bell, CalendarClock, Check } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import notifications from '@/routes/notifications';

type NotificationRow = {
    id: string;
    type: string;
    data: Record<string, unknown>;
    read_at: string | null;
    created_at: string | null;
};

type PageProps = {
    notifications: {
        data: NotificationRow[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number | null;
            to: number | null;
        };
    };
};

const iconByType: Record<string, ComponentType<{ className?: string }>> = {
    rent_due_soon: CalendarClock,
    rent_overdue: AlertTriangle,
};

function describe(
    row: NotificationRow,
    currency: string,
): { icon: ComponentType<{ className?: string }>; message: string } {
    const kind = String(row.data.type ?? '');
    const unitLabel = String(row.data.unit_label ?? 'a unit');
    const amount = row.data.amount_expected
        ? `${currency} ${Number(row.data.amount_expected).toLocaleString()}`
        : null;

    if (kind === 'rent_due_soon') {
        return {
            icon: iconByType.rent_due_soon,
            message: amount
                ? `Rent of ${amount} for ${unitLabel} is due soon.`
                : `Rent for ${unitLabel} is due soon.`,
        };
    }

    if (kind === 'rent_overdue') {
        return {
            icon: iconByType.rent_overdue,
            message: amount
                ? `Rent of ${amount} for ${unitLabel} is overdue.`
                : `Rent for ${unitLabel} is overdue.`,
        };
    }

    return { icon: Bell, message: row.type };
}

export default function NotificationsIndex({
    notifications: paginator,
}: PageProps) {
    const { timezone, currency, unreadNotificationsCount } = usePage().props;
    const hasUnread = unreadNotificationsCount > 0;

    function markAsRead(id: string) {
        router.patch(
            notifications.read(id).url,
            {},
            { preserveScroll: true },
        );
    }

    function markAllAsRead() {
        router.patch(
            notifications.readAll().url,
            {},
            { preserveScroll: true },
        );
    }

    function goToPage(page: number) {
        router.get(
            notifications.index().url,
            { page },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

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

            {paginator.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-soft py-16 text-center">
                    <Bell className="size-6 text-text-tertiary" />
                    <p className="text-[13px] font-semibold">
                        No notifications yet
                    </p>
                    <p className="text-[13px] text-text-secondary">
                        Rent reminders and alerts will show up here.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border-soft">
                    {paginator.data.map((row) => {
                        const { icon: Icon, message } = describe(
                            row,
                            currency,
                        );
                        const isUnread = row.read_at === null;

                        return (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() =>
                                    isUnread && markAsRead(row.id)
                                }
                                className={cn(
                                    'flex w-full items-start gap-3 border-b border-border-soft px-4 py-3.5 text-left last:border-b-0 hover:bg-secondary',
                                    isUnread && 'bg-accent-soft/40',
                                )}
                            >
                                <span
                                    className={cn(
                                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                                        isUnread
                                            ? 'bg-accent-soft text-accent-strong'
                                            : 'bg-secondary text-text-tertiary',
                                    )}
                                >
                                    <Icon className="size-[15px]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                'text-[13px]',
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
                                    <span className="mt-0.5 block text-[13px] text-text-secondary">
                                        {message}
                                    </span>
                                    <span className="mt-1 block text-xs text-text-tertiary">
                                        {formatDateTime(
                                            row.created_at,
                                            timezone,
                                        )}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {paginator.meta.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between text-[13px] text-text-secondary">
                    <span>
                        {paginator.meta.from}–{paginator.meta.to} of{' '}
                        {paginator.meta.total}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={paginator.meta.current_page <= 1}
                            onClick={() =>
                                goToPage(paginator.meta.current_page - 1)
                            }
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={
                                paginator.meta.current_page >=
                                paginator.meta.last_page
                            }
                            onClick={() =>
                                goToPage(paginator.meta.current_page + 1)
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
