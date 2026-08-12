import { Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';

export type ExistingPhoto = { id: number; name: string; url: string };

type PhotoGalleryInputProps = {
    accept?: string;
    maxSizeMb?: number;
    /** Already-uploaded photos (edit mode), each removable individually. */
    existing?: ExistingPhoto[];
    onRemoveExisting?: (id: number) => void;
    /** Newly picked files, not yet uploaded. */
    files: File[];
    onChange: (files: File[]) => void;
    error?: string;
    disabled?: boolean;
};

function NewFileThumb({ file }: { file: File }) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    if (!url) {
        return <div className="size-full animate-pulse bg-secondary" />;
    }

    return <img src={url} alt="" className="size-full object-cover" />;
}

export function PhotoGalleryInput({
    accept = 'image/jpeg,image/png,image/webp',
    maxSizeMb = 5,
    existing = [],
    onRemoveExisting,
    files,
    onChange,
    error,
    disabled,
}: PhotoGalleryInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [rejection, setRejection] = useState<string | null>(null);

    function acceptFiles(picked: FileList | File[]) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const accepted: File[] = [];

        for (const file of Array.from(picked)) {
            if (!acceptedTypes.includes(file.type)) {
                setRejection('That file type isn’t supported.');
                continue;
            }

            if (file.size > maxSizeMb * 1024 * 1024) {
                setRejection(`File is larger than ${maxSizeMb}MB.`);
                continue;
            }

            accepted.push(file);
        }

        if (accepted.length > 0) {
            setRejection(null);
            onChange([...files, ...accepted]);
        }
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files.length > 0) {
            acceptFiles(e.dataTransfer.files);
        }
    }

    function removeNewFile(index: number) {
        onChange(files.filter((_, i) => i !== index));
    }

    return (
        <div className="grid gap-1.5">
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {existing.map((photo) => (
                    <div
                        key={photo.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-border-soft bg-secondary"
                    >
                        <img
                            src={photo.url}
                            alt={photo.name}
                            className="size-full object-cover"
                        />
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onRemoveExisting?.(photo.id)}
                            className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ))}

                {files.map((file, index) => (
                    <div
                        key={`${file.name}-${index}`}
                        className="relative aspect-square overflow-hidden rounded-lg border border-border-soft bg-secondary"
                    >
                        <NewFileThumb file={file} />
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => removeNewFile(index)}
                            className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ))}

                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !disabled && inputRef.current?.click()}
                    className={cn(
                        'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-soft bg-secondary/50 p-2 text-center transition-colors',
                        isDragging && 'border-accent-brand bg-accent-soft',
                        disabled && 'cursor-not-allowed opacity-50',
                    )}
                >
                    <Upload className="size-4 text-text-tertiary" />
                    <p className="text-[11px] text-text-secondary">
                        Add photos
                    </p>
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        acceptFiles(e.target.files);
                    }
                    e.target.value = '';
                }}
            />

            <p className="text-xs text-text-tertiary">
                JPG, PNG or WEBP, up to {maxSizeMb}MB each.
            </p>

            <InputError message={rejection ?? error} />
        </div>
    );
}
