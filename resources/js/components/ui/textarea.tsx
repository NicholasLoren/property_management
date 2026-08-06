import * as React from 'react';

import { cn } from '@/lib/utils';

type TextareaProps = React.ComponentProps<'textarea'> & {
    /**
     * When set, renders a live "X / max" character counter beneath the
     * field (turning amber near the limit, red at it) in addition to the
     * native browser-enforced hard cap `maxLength` already gives you.
     */
    maxLength?: number;
};

function Textarea({ className, maxLength, value, ...props }: TextareaProps) {
    const length = typeof value === 'string' ? value.length : 0;
    const nearLimit = maxLength !== undefined && length >= maxLength * 0.9;
    const atLimit = maxLength !== undefined && length >= maxLength;

    return (
        <div className="grid gap-1">
            <textarea
                data-slot="textarea"
                value={value}
                maxLength={maxLength}
                aria-invalid={atLimit ? true : props['aria-invalid']}
                className={cn(
                    'border-input placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                    className,
                )}
                {...props}
            />
            {maxLength !== undefined && (
                <span
                    className={cn(
                        'self-end text-xs text-text-tertiary tabular-nums',
                        nearLimit && 'font-medium text-warning',
                        atLimit && 'text-destructive',
                    )}
                >
                    {length} / {maxLength}
                </span>
            )}
        </div>
    );
}

export { Textarea };
