import { useInitials } from '@/hooks/use-initials';
import { avatarTone, avatarToneClass } from '@/lib/avatar-tone';
import { cn } from '@/lib/utils';

type EntityAvatarProps = {
    name: string;
    /** Seeds the deterministic fallback color; typically the record's id. */
    seed: number | string;
    imageUrl?: string | null;
    className?: string;
};

/**
 * A person's avatar: their uploaded photo when present, otherwise a
 * deterministically-colored circle with their initials — used for both
 * Users and Tenants wherever a face needs representing.
 */
export function EntityAvatar({
    name,
    seed,
    imageUrl,
    className,
}: EntityAvatarProps) {
    const getInitials = useInitials();

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className={cn(
                    'size-8 shrink-0 rounded-full object-cover',
                    className,
                )}
            />
        );
    }

    return (
        <span
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-accent-contrast',
                avatarToneClass[avatarTone(seed)],
                className,
            )}
        >
            {getInitials(name)}
        </span>
    );
}
