/**
 * Renders an ISO timestamp in the company's configured timezone rather
 * than the viewing browser's local zone, so every user sees the same
 * wall-clock time for a given moment.
 */
export function formatDate(
    iso: string | null,
    timezone?: string,
    fallback = '–',
): string {
    if (!iso) {
        return fallback;
    }

    return new Date(iso).toLocaleDateString(undefined, {
        dateStyle: 'medium',
        timeZone: timezone,
    });
}

export function formatDateTime(
    iso: string | null,
    timezone?: string,
    fallback = '–',
): string {
    if (!iso) {
        return fallback;
    }

    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone,
    });
}
