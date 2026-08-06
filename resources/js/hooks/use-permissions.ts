import { usePage } from '@inertiajs/react';

/**
 * `can`/`canAny` are plain functions closed over the current user's
 * permissions (shared once per request from HandleInertiaRequests, direct
 * or via role) — not hooks themselves, so they're safe to call inline
 * anywhere in render: JSX, `useMemo` deps, array literals. A new
 * permission never needs a matching code change here to be checked.
 */
export function usePermissions() {
    const { auth } = usePage().props;
    const permissions = auth.permissions;

    function can(permission: string): boolean {
        if (!permission) {
            return true;
        }

        return permissions.includes(permission);
    }

    function canAny(permissionList: string[]): boolean {
        if (!permissionList || permissionList.length === 0) {
            return true;
        }

        return permissionList.some(can);
    }

    return { can, canAny };
}
