import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type LightboxPhoto = { id: number | string; name: string; url: string };

type PhotoLightboxProps = {
    photos: LightboxPhoto[];
    index: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onIndexChange: (index: number) => void;
};

/**
 * Full-screen in-app photo viewer — the "opens in a lighthouse [lightbox],
 * not a new tab" gallery for units/properties/maintenance photos.
 */
export function PhotoLightbox({
    photos,
    index,
    open,
    onOpenChange,
    onIndexChange,
}: PhotoLightboxProps) {
    const count = photos.length;
    const photo = photos[index];

    const goTo = useCallback(
        (next: number) => {
            if (count === 0) {
                return;
            }

            onIndexChange(((next % count) + count) % count);
        },
        [count, onIndexChange],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'ArrowLeft') {
                goTo(index - 1);
            } else if (event.key === 'ArrowRight') {
                goTo(index + 1);
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, index, goTo]);

    if (!photo) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 border-0 bg-black/95 p-0 sm:rounded-none [&>button]:hidden">

                <DialogTitle className="sr-only">{photo.name}</DialogTitle>

                <div className="flex items-center justify-between px-4 py-3 text-white/80">
                    <span className="font-mono text-xs">
                        {index + 1} / {count}
                    </span>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        aria-label="Close"
                        className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 hover:text-white"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
                    <img
                        src={photo.url}
                        alt={photo.name}
                        className="max-h-full max-w-full rounded-lg object-contain"
                    />

                    {count > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => goTo(index - 1)}
                                aria-label="Previous photo"
                                className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                            >
                                <ChevronLeft className="size-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(index + 1)}
                                aria-label="Next photo"
                                className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                            >
                                <ChevronRight className="size-5" />
                            </button>
                        </>
                    )}
                </div>

                {count > 1 && (
                    <div className="flex justify-center gap-1.5 overflow-x-auto px-4 pb-4">
                        {photos.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => onIndexChange(i)}
                                aria-label={`Go to photo ${i + 1}`}
                                className={cn(
                                    'size-12 shrink-0 overflow-hidden rounded-md opacity-50 ring-white transition-opacity hover:opacity-80',
                                    i === index && 'opacity-100 ring-2',
                                )}
                            >
                                <img
                                    src={p.url}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
