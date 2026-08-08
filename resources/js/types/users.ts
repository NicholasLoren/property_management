import type { UserStatus } from '@/types/auth';

export type UserRow = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
    status: UserStatus;
};
