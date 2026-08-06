import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type CarouselPhoto = { id: number; name: string; url: string };

type PhotoCarouselProps = {
    photos: CarouselPhoto[];
    className?: string;
};

export function PhotoCarousel({ photos, className }: PhotoCarouselProps) {
    const [index, setIndex] = useState(0);

    if (photos.length === 0) {
        return (
            <div
                className={cn(
                    'flex aspect-[4/3] items-center justify-center rounded-xl bg-secondary text-text-tertiary',
                    className,
                )}
            >
                <Building2 className="size-10" />
            </div>
        );
    }

    const photo = photos[index];

    function goTo(next: number) {
        setIndex((next + photos.length) % photos.length);
    }

    return (
        <div className={cn('group relative aspect-[4/3]', className)}>
            <img
                src={photo.url}
                alt={photo.name}
                className="size-full rounded-xl object-cover"
            />

            {photos.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(index - 1)}
                        aria-label="Previous photo"
                        className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(index + 1)}
                        aria-label="Next photo"
                        className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                        <ChevronRight className="size-4" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                        {photos.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setIndex(i)}
                                aria-label={`Go to photo ${i + 1}`}
                                className={cn(
                                    'size-1.5 rounded-full bg-white/60 transition-all',
                                    i === index && 'w-4 bg-white',
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
