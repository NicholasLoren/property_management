import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
    value: string;
    label: string;
    description?: string;
};

type SearchableSelectProps = {
    value: string | null;
    onChange: (value: string | null) => void;
    /** Static option list, filtered client-side as the user types. */
    options?: SearchableSelectOption[];
    /**
     * Async mode: fetch options for the current query (e.g. hitting a JSON
     * endpoint). Takes over from `options` and is debounced automatically.
     */
    onSearch?: (query: string) => Promise<SearchableSelectOption[]>;
    debounceMs?: number;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    /**
     * External fetch in flight (e.g. the page is reloading after this
     * field's value changed) — distinct from the internal `onSearch`
     * spinner. Disables the trigger and swaps its icon for a spinner.
     */
    loading?: boolean;
    className?: string;
    id?: string;
};

export function SearchableSelect({
    value,
    onChange,
    options: staticOptions,
    onSearch,
    debounceMs = 300,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    emptyMessage = 'No results found.',
    disabled = false,
    loading = false,
    className,
    id,
}: SearchableSelectProps) {
    const isAsync = Boolean(onSearch);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [asyncOptions, setAsyncOptions] = useState<SearchableSelectOption[]>(
        [],
    );
    const [searching, setSearching] = useState(false);
    // Every option seen so far (static list, or accumulated async results),
    // kept so the trigger can still resolve the selected label after the
    // search query changes and the original option scrolls out of results.
    const [knownOptions, setKnownOptions] = useState<SearchableSelectOption[]>(
        staticOptions ?? [],
    );

    const options = isAsync ? asyncOptions : (staticOptions ?? []);

    useEffect(() => {
        if (options.length === 0) {
            return;
        }

        setKnownOptions((previous) => {
            const byValue = new Map(previous.map((o) => [o.value, o]));

            for (const option of options) {
                byValue.set(option.value, option);
            }

            return Array.from(byValue.values());
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options]);

    useEffect(() => {
        if (!isAsync || !open || !onSearch) {
            return;
        }

        setSearching(true);

        const handle = setTimeout(() => {
            onSearch(query)
                .then((results) => setAsyncOptions(results))
                .finally(() => setSearching(false));
        }, debounceMs);

        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, open, isAsync, debounceMs]);

    const selected = knownOptions.find((o) => o.value === value) ?? null;

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    setQuery('');
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled || loading}
                    className={cn(
                        'w-full justify-between font-normal',
                        !selected && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="truncate">
                        {selected ? selected.label : placeholder}
                    </span>
                    {loading ? (
                        <Loader2 className="ml-2 size-4 shrink-0 animate-spin opacity-50" />
                    ) : (
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
            >
                <Command shouldFilter={!isAsync}>
                    <CommandInput
                        value={query}
                        onValueChange={setQuery}
                        placeholder={searchPlaceholder}
                    />
                    <CommandList>
                        {searching ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Searching…
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>{emptyMessage}</CommandEmpty>
                                <CommandGroup>
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.label}
                                            keywords={
                                                option.description
                                                    ? [option.description]
                                                    : undefined
                                            }
                                            onSelect={() => {
                                                onChange(
                                                    option.value === value
                                                        ? null
                                                        : option.value,
                                                );
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    'size-4',
                                                    value === option.value
                                                        ? 'opacity-100'
                                                        : 'opacity-0',
                                                )}
                                            />
                                            <span className="flex min-w-0 flex-1 flex-col">
                                                <span className="truncate">
                                                    {option.label}
                                                </span>
                                                {option.description && (
                                                    <span className="truncate text-xs text-muted-foreground">
                                                        {option.description}
                                                    </span>
                                                )}
                                            </span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
