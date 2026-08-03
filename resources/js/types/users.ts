import type { UserStatus } from '@/types/auth';

export type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: UserStatus;
};
