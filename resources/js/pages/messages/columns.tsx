import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Megaphone, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import messages from '@/routes/messages';

export type InboxMessageRow = {
    id: number;
    type: 'personal' | 'broadcast';
    type_label: string;
    subject: string;
    sender_name: string;
    read_at: string | null;
    created_at: string;
};

export type SentMessageRow = {
    id: number;
    type: 'personal' | 'broadcast';
    type_label: string;
    subject: string;
    recipients_count: number;
    created_at: string;
};

function formatRelative(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 1) {
        return 'Just now';
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
}

function TypeBadge({ type, label }: { type: string; label: string }) {
    return (
        <Badge
            variant="outline"
            className="gap-1 font-normal text-text-secondary"
        >
            {type === 'broadcast' ? (
                <Megaphone className="size-3" />
            ) : (
                <Send className="size-3" />
            )}
            {label}
        </Badge>
    );
}

export function getInboxColumns(): ColumnDef<InboxMessageRow>[] {
    return [
        {
            id: 'subject',
            accessorKey: 'subject',
            header: 'Subject',
            enableHiding: false,
            meta: { label: 'Subject' },
            cell: ({ row }) => {
                const message = row.original;
                const unread = !message.read_at;

                return (
                    <Link
                        href={messages.show(message)}
                        className="flex flex-col gap-0.5 hover:opacity-80"
                    >
                        <span
                            className={
                                unread
                                    ? 'text-[13px] font-semibold text-foreground'
                                    : 'text-[13px] text-foreground'
                            }
                        >
                            {unread && (
                                <span className="mr-1.5 inline-block size-[7px] rounded-full bg-accent-brand align-middle" />
                            )}
                            {message.subject}
                        </span>
                        <span className="text-xs text-text-tertiary">
                            From {message.sender_name}
                        </span>
                    </Link>
                );
            },
        },
        {
            id: 'type',
            header: 'Type',
            meta: { label: 'Type' },
            cell: ({ row }) => (
                <TypeBadge
                    type={row.original.type}
                    label={row.original.type_label}
                />
            ),
        },
        {
            id: 'created_at',
            header: 'Received',
            meta: { label: 'Received' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {formatRelative(row.original.created_at)}
                </span>
            ),
        },
    ];
}

export function getSentColumns(): ColumnDef<SentMessageRow>[] {
    return [
        {
            id: 'subject',
            accessorKey: 'subject',
            header: 'Subject',
            enableHiding: false,
            meta: { label: 'Subject' },
            cell: ({ row }) => (
                <Link
                    href={messages.show(row.original)}
                    className="text-[13px] font-medium text-foreground hover:opacity-80"
                >
                    {row.original.subject}
                </Link>
            ),
        },
        {
            id: 'type',
            header: 'Type',
            meta: { label: 'Type' },
            cell: ({ row }) => (
                <TypeBadge
                    type={row.original.type}
                    label={row.original.type_label}
                />
            ),
        },
        {
            id: 'recipients_count',
            header: 'Recipients',
            meta: { label: 'Recipients' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {row.original.recipients_count}
                </span>
            ),
        },
        {
            id: 'created_at',
            header: 'Sent',
            meta: { label: 'Sent' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {formatRelative(row.original.created_at)}
                </span>
            ),
        },
    ];
}
