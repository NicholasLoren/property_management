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

/** A short "2h ago" style timestamp, for compact spots like a notifications list. */
export function formatRelativeTime(iso: string | null, fallback = '–'): string {
    if (!iso) {
        return fallback;
    }

    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 1) {
        return 'just now';
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
