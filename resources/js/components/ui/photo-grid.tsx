import { useState } from 'react';
import { PhotoLightbox  } from '@/components/ui/photo-lightbox';
import type {LightboxPhoto} from '@/components/ui/photo-lightbox';
import { cn } from '@/lib/utils';

type PhotoGridProps = {
    photos: LightboxPhoto[];
    className?: string;
};

/**
 * A grid of photo thumbnails that opens the shared in-app lightbox on
 * click, instead of the old pattern of linking each thumbnail to a new
 * browser tab.
 */
export function PhotoGrid({ photos, className }: PhotoGridProps) {
    const [index, setIndex] = useState(0);
    const [open, setOpen] = useState(false);

    if (photos.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5',
                className,
            )}
        >
            {photos.map((photo, i) => (
                <button
                    key={photo.id}
                    type="button"
                    onClick={() => {
                        setIndex(i);
                        setOpen(true);
                    }}
                    aria-label={`View ${photo.name}`}
                    className="aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-border-soft bg-secondary transition-opacity hover:opacity-90"
                >
                    <img
                        src={photo.url}
                        alt={photo.name}
                        className="size-full object-cover"
                    />
                </button>
            ))}

            <PhotoLightbox
                photos={photos}
                index={index}
                open={open}
                onOpenChange={setOpen}
                onIndexChange={setIndex}
            />
        </div>
    );
}
