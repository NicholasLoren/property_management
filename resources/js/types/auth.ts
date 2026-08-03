export type UserStatus = 'active' | 'invited' | 'suspended';

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    status: UserStatus;
    last_active_at: string | null;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type PermissionActions = {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
};

export type Abilities = {
    users: PermissionActions;
    roles: PermissionActions;
    settings: { edit: boolean };
    logs: { view: boolean };
    messages: { view: boolean; send: boolean; broadcast: boolean };
};

export type Auth = {
    user: User;
    can: Abilities;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
