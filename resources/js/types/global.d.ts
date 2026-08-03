import type { Auth } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            unreadMessagesCount: number;
            [key: string]: unknown;
        };
    }
}

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData, TValue> {
        /** Shown in the column-visibility dropdown; falls back to the column id. */
        label?: string;
        /** Server-side sort key. Omit to make the column unsortable. */
        sortKey?: string;
    }
}
