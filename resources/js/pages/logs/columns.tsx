import type { ColumnDef } from '@tanstack/react-table';
import { Laptop, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { avatarTone, badgeToneClass } from '@/lib/avatar-tone';

export type LogRow = {
    id: number;
    description: string;
    log_name: string;
    event: string | null;
    causer_name: string | null;
    subject_type: string | null;
    ip: string | null;
    browser: string | null;
    platform: string | null;
    device: string | null;
    created_at: string;
};

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export function getLogColumns(): ColumnDef<LogRow>[] {
    return [
        {
            id: 'description',
            accessorKey: 'description',
            header: 'Event',
            enableHiding: false,
            meta: { label: 'Event' },
            cell: ({ row }) => (
                <div>
                    <div className="text-[13px] font-medium text-foreground">
                        {row.original.description}
                    </div>
                    {row.original.subject_type && (
                        <div className="text-xs text-text-tertiary">
                            {row.original.subject_type}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'log_name',
            accessorKey: 'log_name',
            header: 'Category',
            meta: { label: 'Category' },
            cell: ({ row }) => (
                <Badge
                    className={
                        badgeToneClass[avatarTone(row.original.log_name)]
                    }
                >
                    {row.original.log_name}
                </Badge>
            ),
        },
        {
            id: 'causer',
            header: 'By',
            meta: { label: 'By' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {row.original.causer_name ?? 'System'}
                </span>
            ),
        },
        {
            id: 'device',
            header: 'Device',
            meta: { label: 'Device' },
            cell: ({ row }) => {
                const { browser, platform, device } = row.original;
                const parts = [browser, platform, device].filter(Boolean);

                return (
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                        <Laptop className="size-3.5 shrink-0" />
                        {parts.length > 0 ? parts.join(' · ') : '–'}
                    </span>
                );
            },
        },
        {
            id: 'ip',
            accessorKey: 'ip',
            header: 'IP address',
            meta: { label: 'IP address' },
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-tertiary tabular-nums">
                    <MapPin className="size-3.5 shrink-0" />
                    {row.original.ip ?? '–'}
                </span>
            ),
        },
        {
            id: 'created_at',
            header: 'When',
            enableHiding: false,
            meta: { label: 'When', sortKey: 'created_at' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {formatDateTime(row.original.created_at)}
                </span>
            ),
        },
    ];
}
