import type { VisibilityState } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

function storageKey(tableId: string): string {
    return `datatable:${tableId}:columns`;
}

function readStoredVisibility(tableId: string): VisibilityState {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(storageKey(tableId));

        return raw ? (JSON.parse(raw) as VisibilityState) : {};
    } catch {
        return {};
    }
}

/**
 * Column visibility is a per-browser display preference, not server state,
 * so it's persisted to localStorage (keyed per table) rather than the URL.
 */
export function useColumnVisibility(tableId: string) {
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        () => readStoredVisibility(tableId),
    );

    useEffect(() => {
        window.localStorage.setItem(
            storageKey(tableId),
            JSON.stringify(columnVisibility),
        );
    }, [tableId, columnVisibility]);

    return [columnVisibility, setColumnVisibility] as const;
}
