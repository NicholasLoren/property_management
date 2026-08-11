import { File as FileIcon, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ExistingFile = { name: string; url: string };

type FileDropzoneProps = {
    /** Comma-separated MIME types, passed straight to the file input. */
    accept?: string;
    maxSizeMb?: number;
    value: File | null;
    onChange: (file: File | null) => void;
    /** An already-uploaded file (edit mode), shown until replaced or removed. */
    existing?: ExistingFile | null;
    onRemoveExisting?: () => void;
    error?: string;
    disabled?: boolean;
};

function isImage(file: File | ExistingFile): boolean {
    if ('type' in file) {
        return file.type.startsWith('image/');
    }

    return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

function formatSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
    accept = 'image/jpeg,image/png,image/webp,application/pdf',
    maxSizeMb = 5,
    value,
    onChange,
    existing,
    onRemoveExisting,
    error,
    disabled,
}: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [rejection, setRejection] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!value || !isImage(value)) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(value);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [value]);

    function acceptFile(file: File) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());

        if (!acceptedTypes.includes(file.type)) {
            setRejection('That file type isn’t supported.');
            return;
        }

        if (file.size > maxSizeMb * 1024 * 1024) {
            setRejection(`File is larger than ${maxSizeMb}MB.`);
            return;
        }

        setRejection(null);
        onChange(file);
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];

        if (file) {
            acceptFile(file);
        }
    }

    function handleRemove() {
        onChange(null);
        setRejection(null);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }

    const shownExisting = !value && existing;

    return (
        <div className="grid grid-cols-1 gap-1.5">
            {value || shownExisting ? (
                <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-secondary p-2.5">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt=""
                            className="size-10 shrink-0 rounded object-cover"
                        />
                    ) : shownExisting && isImage(existing) ? (
                        <img
                            src={existing.url}
                            alt=""
                            className="size-10 shrink-0 rounded object-cover"
                        />
                    ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-card text-text-tertiary">
                            <FileIcon className="size-4" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        {shownExisting ? (
                            <a
                                href={existing.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate text-[13px] font-medium text-accent-strong hover:underline"
                            >
                                {existing.name}
                            </a>
                        ) : (
                            <p className="truncate text-[13px] font-medium text-foreground">
                                {value!.name}
                            </p>
                        )}
                        {value && (
                            <p className="text-xs text-text-tertiary">
                                {formatSize(value.size)}
                            </p>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        disabled={disabled}
                        onClick={() =>
                            shownExisting
                                ? onRemoveExisting?.()
                                : handleRemove()
                        }
                    >
                        <X className="size-[15px]" />
                    </Button>
                </div>
            ) : (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !disabled && inputRef.current?.click()}
                    className={cn(
                        'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-border-soft bg-secondary/50 px-4 py-6 text-center transition-colors',
                        isDragging && 'border-accent-brand bg-accent-soft',
                        disabled && 'cursor-not-allowed opacity-50',
                    )}
                >
                    <Upload className="size-5 text-text-tertiary" />
                    <p className="text-[13px] text-text-secondary">
                        Drag a file here, or{' '}
                        <span className="font-semibold text-accent-strong">
                            browse
                        </span>
                    </p>
                    <p className="text-xs text-text-tertiary">
                        JPG, PNG, WEBP or PDF, up to {maxSizeMb}MB
                    </p>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) {
                        acceptFile(file);
                    }
                }}
            />

            <InputError message={rejection ?? error} />
        </div>
    );
}
