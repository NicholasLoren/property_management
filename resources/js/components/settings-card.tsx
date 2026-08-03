import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SettingsCard({
    title,
    description,
    className,
    children,
}: {
    title?: string;
    description?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                'mb-4 rounded-[14px] border border-border-soft bg-card shadow-sm',
                className,
            )}
        >
            {title && (
                <div className="px-[18px] pt-4">
                    <h3 className="text-[14.5px] font-bold">{title}</h3>
                    {description && (
                        <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <div
                className={cn(
                    'px-[18px] pb-[18px]',
                    title ? 'pt-4' : 'pt-[18px]',
                )}
            >
                {children}
            </div>
        </div>
    );
}

export function SettingsRow({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-5 border-b border-border-soft py-3.5 last:border-0">
            <div>
                <div className="text-[13px] font-semibold">{label}</div>
                {description && (
                    <div className="mt-0.5 max-w-[380px] text-xs text-text-tertiary">
                        {description}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}
