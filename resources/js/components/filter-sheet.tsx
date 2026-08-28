import { Filter } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type FilterOption = { value: string; label: string };

type FilterSheetProps = {
    title: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeCount: number;
    onReset: () => void;
    onApply: () => void;
    children: ReactNode;
};

export function FilterSheet({
    title,
    open,
    onOpenChange,
    activeCount,
    onReset,
    onApply,
    children,
}: FilterSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <Filter className="size-[15px]" />
                    Filters
                    {activeCount > 0 && (
                        <span className="ml-0.5 flex size-[18px] items-center justify-center rounded-full bg-accent-strong text-[10.5px] font-bold text-background">
                            {activeCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent
                side="bottom"
                className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col gap-0 rounded-t-2xl p-0"
            >
                <SheetHeader className="flex-row items-center justify-between border-b border-border-soft px-5 py-4">
                    <SheetTitle className="text-[17px]">{title}</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="flex flex-col gap-5">{children}</div>
                </div>

                <SheetFooter className="flex-row gap-2.5 border-t border-border-soft px-5 py-4">
                    <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={onReset}
                    >
                        Reset
                    </Button>
                    <Button type="button" className="flex-1" onClick={onApply}>
                        Apply Filters
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

type FilterFieldProps = {
    label: string;
    children: ReactNode;
};

/** A labeled slot for a non-pill filter control (e.g. a SearchableSelect),
 * kept visually consistent with FilterPillGroup's label styling. */
export function FilterField({ label, children }: FilterFieldProps) {
    return (
        <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-text-tertiary uppercase">
                {label}
            </p>
            {children}
        </div>
    );
}

type FilterPillGroupProps = {
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    includeAll?: boolean;
};

export function FilterPillGroup({
    label,
    options,
    value,
    onChange,
    includeAll = true,
}: FilterPillGroupProps) {
    const items = includeAll
        ? [{ value: 'all', label: 'All' }, ...options]
        : options;

    return (
        <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-text-tertiary uppercase">
                {label}
            </p>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onChange(item.value)}
                        className={cn(
                            'rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                            value === item.value
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border-soft bg-secondary text-text-secondary',
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

type FilterMultiPillGroupProps = {
    label: string;
    options: FilterOption[];
    value: string[];
    onChange: (value: string[]) => void;
};

/** Like FilterPillGroup, but membership-toggling instead of single-select —
 * an empty selection means "all", matching the single-select 'all' sentinel. */
export function FilterMultiPillGroup({
    label,
    options,
    value,
    onChange,
}: FilterMultiPillGroupProps) {
    function toggle(optionValue: string) {
        onChange(
            value.includes(optionValue)
                ? value.filter((v) => v !== optionValue)
                : [...value, optionValue],
        );
    }

    return (
        <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-text-tertiary uppercase">
                {label}
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onChange([])}
                    className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                        value.length === 0
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border-soft bg-secondary text-text-secondary',
                    )}
                >
                    All
                </button>
                {options.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => toggle(item.value)}
                        className={cn(
                            'rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                            value.includes(item.value)
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border-soft bg-secondary text-text-secondary',
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
