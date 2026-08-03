import { Link } from '@inertiajs/react';
import { Inbox, SearchX } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';

export type EmptyStateAction =
    | { label: string; href: string; onClick?: never }
    | { label: string; onClick: () => void; href?: never };

export type EmptyStateConfig = {
    icon?: ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: EmptyStateAction;
};

export function DataTableEmptyState({
    isFiltered,
    emptyState,
}: {
    isFiltered: boolean;
    emptyState: EmptyStateConfig;
}) {
    if (isFiltered) {
        return (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
                <SearchX className="size-7 text-text-tertiary" />
                <p className="text-sm font-medium text-foreground">
                    No results
                </p>
                <p className="max-w-xs text-[13px] text-text-secondary">
                    Nothing matches your search or filters. Try adjusting or
                    clearing them.
                </p>
            </div>
        );
    }

    const Icon = emptyState.icon ?? Inbox;

    return (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
                <Icon className="size-6 text-text-tertiary" />
            </span>
            <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                    {emptyState.title}
                </p>
                <p className="max-w-xs text-[13px] text-text-secondary">
                    {emptyState.description}
                </p>
            </div>
            {emptyState.action &&
                (emptyState.action.href ? (
                    <Button asChild className="mt-1">
                        <Link href={emptyState.action.href}>
                            {emptyState.action.label}
                        </Link>
                    </Button>
                ) : (
                    <Button
                        className="mt-1"
                        onClick={emptyState.action.onClick}
                    >
                        {emptyState.action.label}
                    </Button>
                ))}
        </div>
    );
}
