export type PermissionOption = { id: number; name: string; label: string };

export type PermissionCategoryOption = {
    id: number;
    name: string;
    label: string;
    permissions: PermissionOption[];
};

export type RoleRow = {
    id: number;
    name: string;
    description: string | null;
    is_system: boolean;
    permission_ids: number[];
};
