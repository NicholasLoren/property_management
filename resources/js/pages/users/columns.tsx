import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Shield, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { avatarTone, avatarToneClass, badgeToneClass } from '@/lib/avatar-tone';
import users from '@/routes/users';
import type { UserRow } from '@/types/users';

export type ActiveUserRow = UserRow & {
    permissions_count: number;
    status_label: string;
    last_active_at: string | null;
};

export type TrashUserRow = UserRow & {
    deleted_at: string | null;
    deleted_by_name: string | null;
};

const STATUS_DOT_CLASS: Record<string, string> = {
    active: 'bg-success',
    invited: 'bg-warning',
    suspended: 'bg-text-tertiary',
};

function formatRelative(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 1) {
        return 'Active now';
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d ago`;
    }

    return `${Math.floor(days / 7)}w ago`;
}

function formatLastActive(iso: string | null, status: string): string {
    if (status === 'invited' || !iso) {
        return 'Never';
    }

    return formatRelative(iso);
}

function UserIdentityCell({
    user,
    getInitials,
}: {
    user: UserRow;
    getInitials: (name: string) => string;
}) {
    return (
        <Link
            href={users.show(user)}
            className="flex items-center gap-2.5 hover:opacity-80"
        >
            <span
                className={`flex size-[34px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-accent-contrast ${avatarToneClass[avatarTone(user.id)]}`}
            >
                {getInitials(user.name)}
            </span>
            <div>
                <div className="text-[13px] font-semibold">{user.name}</div>
                <div className="text-xs text-text-tertiary">{user.email}</div>
            </div>
        </Link>
    );
}

function RoleBadge({ role }: { role: string }) {
    return <Badge className={badgeToneClass[avatarTone(role)]}>{role}</Badge>;
}

export function getUserColumns(opts: {
    getInitials: (name: string) => string;
    canEdit: boolean;
    canDelete: boolean;
    onTrash: (user: ActiveUserRow) => void;
}): ColumnDef<ActiveUserRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'User',
            enableHiding: false,
            meta: { label: 'User', sortKey: 'name' },
            cell: ({ row }) => (
                <UserIdentityCell
                    user={row.original}
                    getInitials={opts.getInitials}
                />
            ),
        },
        {
            id: 'role',
            accessorKey: 'role',
            header: 'Role',
            meta: { label: 'Role', sortKey: 'role' },
            cell: ({ row }) => <RoleBadge role={row.original.role} />,
        },
        {
            id: 'permissions',
            header: 'Permissions',
            meta: { label: 'Permissions' },
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                    <Shield className="size-[13px]" />
                    {row.original.permissions_count} permission
                    {row.original.permissions_count === 1 ? '' : 's'}
                </span>
            ),
        },
        {
            id: 'status',
            accessorKey: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-text-secondary">
                    <span
                        className={`size-[7px] rounded-full ${STATUS_DOT_CLASS[row.original.status]}`}
                    />
                    {row.original.status_label}
                </span>
            ),
        },
        {
            id: 'last_active',
            header: 'Last active',
            meta: { label: 'Last active', sortKey: 'last_active' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {formatLastActive(
                        row.original.last_active_at,
                        row.original.status,
                    )}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;

                if (!opts.canEdit && !opts.canDelete) {
                    return null;
                }

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        {opts.canEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Edit"
                                asChild
                            >
                                <Link href={users.edit(user)}>
                                    <Pencil className="size-[15px]" />
                                </Link>
                            </Button>
                        )}
                        {opts.canDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                title="Move to trash"
                                onClick={() => opts.onTrash(user)}
                            >
                                <Trash2 className="size-[15px]" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];
}

export function getUserTrashColumns(opts: {
    getInitials: (name: string) => string;
    onRestore: (user: TrashUserRow) => void;
    onForceDelete: (user: TrashUserRow) => void;
}): ColumnDef<TrashUserRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'User',
            enableHiding: false,
            meta: { label: 'User' },
            cell: ({ row }) => (
                <UserIdentityCell
                    user={row.original}
                    getInitials={opts.getInitials}
                />
            ),
        },
        {
            id: 'role',
            accessorKey: 'role',
            header: 'Role',
            meta: { label: 'Role' },
            cell: ({ row }) => <RoleBadge role={row.original.role} />,
        },
        {
            id: 'deleted_by',
            header: 'Deleted by',
            meta: { label: 'Deleted by' },
            cell: ({ row }) => (
                <span className="text-sm text-text-secondary">
                    {row.original.deleted_by_name ?? '–'}
                </span>
            ),
        },
        {
            id: 'deleted_at',
            header: 'Deleted',
            meta: { label: 'Deleted' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {row.original.deleted_at
                        ? formatRelative(row.original.deleted_at)
                        : '–'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(user)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(user)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
