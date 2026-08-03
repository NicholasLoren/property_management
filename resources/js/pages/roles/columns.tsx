import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { avatarTone, badgeToneClass } from '@/lib/avatar-tone';
import roles from '@/routes/roles';
import type { RoleRow } from '@/types/roles';

export type ActiveRoleRow = RoleRow & {
    permissions_count: number;
    users_count: number;
};

export type TrashRoleRow = RoleRow & {
    deleted_at: string | null;
    deleted_by_name: string | null;
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

function RoleIdentityCell({ role }: { role: RoleRow }) {
    return (
        <div className="grid gap-1">
            <div className="flex items-center gap-2">
                <Badge className={badgeToneClass[avatarTone(role.id)]}>
                    {role.name}
                </Badge>
                {role.is_system && (
                    <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                        <ShieldCheck className="size-3" />
                        System role
                    </span>
                )}
            </div>
            {role.description && (
                <p className="max-w-md truncate text-xs text-text-tertiary">
                    {role.description}
                </p>
            )}
        </div>
    );
}

export function getRoleColumns(opts: {
    canEdit: boolean;
    canDelete: boolean;
    onTrash: (role: ActiveRoleRow) => void;
}): ColumnDef<ActiveRoleRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Role',
            enableHiding: false,
            meta: { label: 'Role', sortKey: 'name' },
            cell: ({ row }) => <RoleIdentityCell role={row.original} />,
        },
        {
            id: 'permissions',
            header: 'Permissions',
            meta: { label: 'Permissions' },
            cell: ({ row }) => (
                <span className="text-[12.5px] text-text-secondary">
                    {row.original.permissions_count} permission
                    {row.original.permissions_count === 1 ? '' : 's'}
                </span>
            ),
        },
        {
            id: 'users',
            header: 'Users',
            meta: { label: 'Users', sortKey: 'users' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-text-tertiary tabular-nums">
                    {row.original.users_count}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => {
                const role = row.original;

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
                                <Link href={roles.edit(role)}>
                                    <Pencil className="size-[15px]" />
                                </Link>
                            </Button>
                        )}
                        {opts.canDelete && !role.is_system && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                title="Move to trash"
                                onClick={() => opts.onTrash(role)}
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

export function getRoleTrashColumns(opts: {
    onRestore: (role: TrashRoleRow) => void;
    onForceDelete: (role: TrashRoleRow) => void;
}): ColumnDef<TrashRoleRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Role',
            enableHiding: false,
            meta: { label: 'Role' },
            cell: ({ row }) => <RoleIdentityCell role={row.original} />,
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
                const role = row.original;

                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => opts.onRestore(role)}
                        >
                            <Undo2 className="size-[15px]" />
                            Restore
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => opts.onForceDelete(role)}
                        >
                            Delete forever
                        </Button>
                    </div>
                );
            },
        },
    ];
}
