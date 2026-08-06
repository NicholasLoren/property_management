import { ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { getCroppedImageFile } from '@/lib/crop-image';

type ImageCropDialogProps = {
    file: File | null;
    /** Width and height (in pixels) of the square output image. */
    outputSize: number;
    onCropped: (file: File) => void;
    onCancel: () => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function ImageCropDialog({
    file,
    outputSize,
    onCropped,
    onCancel,
}: ImageCropDialogProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null,
    );
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!file) {
            setImageUrl(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    async function handleApply() {
        if (!imageUrl || !croppedAreaPixels || !file) {
            return;
        }

        setProcessing(true);

        try {
            const cropped = await getCroppedImageFile(
                imageUrl,
                croppedAreaPixels,
                outputSize,
                file.name,
            );
            onCropped(cropped);
        } finally {
            setProcessing(false);
        }
    }

    return (
        <Dialog
            open={!!file}
            onOpenChange={(open) => {
                if (!open) {
                    onCancel();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Position your icon</DialogTitle>
                    <DialogDescription>
                        Drag to reposition, and use the slider to zoom. The
                        square shown is exactly what will be used.
                    </DialogDescription>
                </DialogHeader>

                {imageUrl && (
                    <div className="relative h-72 w-full overflow-hidden rounded-md bg-secondary">
                        <Cropper
                            image={imageUrl}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="rect"
                            showGrid={false}
                            minZoom={MIN_ZOOM}
                            maxZoom={MAX_ZOOM}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={handleCropComplete}
                        />
                    </div>
                )}

                <div className="flex items-center gap-2.5">
                    <ZoomOut className="size-4 shrink-0 text-text-tertiary" />
                    <input
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-accent-brand"
                        aria-label="Zoom"
                    />
                    <ZoomIn className="size-4 shrink-0 text-text-tertiary" />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleApply}
                        disabled={!croppedAreaPixels || processing}
                    >
                        {processing && <Spinner />}
                        Use this crop
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
