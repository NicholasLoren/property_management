export type AvatarTone = 1 | 2 | 3 | 4 | 5;

/**
 * Deterministic tone (1-5) derived from a seed, so the same person always
 * renders with the same avatar color.
 */
export function avatarTone(seed: number | string): AvatarTone {
    const value = String(seed);
    let hash = 0;

    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    return ((hash % 5) + 1) as AvatarTone;
}

export const avatarToneClass: Record<AvatarTone, string> = {
    1: 'bg-tone-1',
    2: 'bg-tone-2',
    3: 'bg-tone-3',
    4: 'bg-tone-4',
    5: 'bg-tone-5',
};

/**
 * Soft badge variant of the same tone scale, for labels (e.g. role badges)
 * whose set of values is open-ended and can't use a fixed color map.
 */
export const badgeToneClass: Record<AvatarTone, string> = {
    1: 'bg-tone-1/15 text-tone-1 border-transparent',
    2: 'bg-tone-2/15 text-tone-2 border-transparent',
    3: 'bg-tone-3/15 text-tone-3 border-transparent',
    4: 'bg-tone-4/15 text-tone-4 border-transparent',
    5: 'bg-tone-5/15 text-tone-5 border-transparent',
};
