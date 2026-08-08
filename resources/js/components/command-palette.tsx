import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    DoorOpen,
    IdCard,
    KeyRound,
    Loader2,
    Plus,
    Search,
    Users as UsersIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import users from '@/routes/users';

type SearchResultType = 'property' | 'unit' | 'tenant' | 'landlord' | 'user';

type SearchResult = {
    type: SearchResultType;
    id: number;
    title: string;
    subtitle: string | null;
    url: string;
};

const SECTION_META: Record<
    SearchResultType,
    { label: string; icon: ComponentType<{ className?: string }> }
> = {
    property: { label: 'Properties', icon: Building2 },
    unit: { label: 'Units', icon: DoorOpen },
    tenant: { label: 'Tenants', icon: UsersIcon },
    landlord: { label: 'Landlords', icon: KeyRound },
    user: { label: 'Users', icon: IdCard },
};

const SECTION_ORDER: SearchResultType[] = [
    'property',
    'unit',
    'tenant',
    'landlord',
    'user',
];

export function CommandPalette({
    canManageUsers,
}: {
    canManageUsers: boolean;
}) {
    const { name } = usePage().props;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setOpen((value) => !value);
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, []);

    function close() {
        setOpen(false);
        setQuery('');
        setResults([]);
        setLoading(false);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (abortRef.current) {
            abortRef.current.abort();
        }
    }

    function handleQueryChange(value: string) {
        setQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (value.trim().length === 0) {
            setResults([]);
            setLoading(false);

            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(() => {
            if (abortRef.current) {
                abortRef.current.abort();
            }

            const controller = new AbortController();
            abortRef.current = controller;

            fetch(`/search/quick?q=${encodeURIComponent(value)}`, {
                signal: controller.signal,
            })
                .then((response) => response.json())
                .then((data: { results: SearchResult[] }) => {
                    setResults(data.results);
                })
                .catch((error) => {
                    if (error.name !== 'AbortError') {
                        setResults([]);
                    }
                })
                .finally(() => setLoading(false));
        }, 250);
    }

    const trimmedQuery = query.trim();
    const hasQuery = trimmedQuery.length > 0;
    const hasResults = results.length > 0;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-80 items-center gap-2.5 rounded-[6px] border border-border-soft bg-secondary px-2.5 py-[7px] text-left text-[13px] text-text-tertiary transition-colors hover:border-text-tertiary"
            >
                <Search className="size-[15px] shrink-0" />
                <span className="flex-1">
                    Search properties, tenants, leases…
                </span>
                <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px] text-text-tertiary">
                    ⌘K
                </kbd>
            </button>

            <Dialog
                open={open}
                onOpenChange={(next) => (next ? setOpen(true) : close())}
            >
                <DialogContent className="top-[16%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 [&>button]:hidden">
                    <DialogTitle className="sr-only">Search {name}</DialogTitle>
                    <div className="flex items-center gap-2.5 border-b border-border-soft px-4 py-3.5">
                        <Search className="size-4 text-text-tertiary" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            placeholder="Search properties, tenants, leases, or run a command…"
                            className="flex-1 border-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-text-tertiary"
                        />
                        {loading ? (
                            <Loader2 className="size-4 shrink-0 animate-spin text-text-tertiary" />
                        ) : (
                            <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px] text-text-tertiary">
                                Esc
                            </kbd>
                        )}
                    </div>

                    <div className="max-h-90 overflow-y-auto p-2">
                        {!hasQuery && (
                            <>
                                <p className="px-2.5 pt-2 pb-1 text-[10.5px] font-bold tracking-[0.07em] text-text-tertiary uppercase">
                                    Quick actions
                                </p>
                                {canManageUsers && (
                                    <Link
                                        href={users.index()}
                                        onClick={close}
                                        className="flex items-center gap-2.5 rounded-[6px] p-2 hover:bg-secondary"
                                    >
                                        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-text-secondary">
                                            <IdCard className="size-[15px]" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[13px] font-semibold text-foreground">
                                                Invite user
                                            </span>
                                            <span className="block text-[11.5px] text-text-tertiary">
                                                Send a staff or landlord
                                                invitation
                                            </span>
                                        </span>
                                    </Link>
                                )}
                                <div className="flex cursor-default items-center gap-2.5 rounded-[6px] p-2 opacity-60">
                                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-text-secondary">
                                        <Plus className="size-[15px]" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[13px] font-semibold text-foreground">
                                            Add property
                                        </span>
                                        <span className="block text-[11.5px] text-text-tertiary">
                                            Not available yet
                                        </span>
                                    </span>
                                </div>
                            </>
                        )}

                        {hasQuery && !loading && !hasResults && (
                            <p className="px-2.5 py-6 text-center text-[13px] text-text-tertiary">
                                No results found for “{trimmedQuery}”
                            </p>
                        )}

                        {hasQuery &&
                            SECTION_ORDER.map((type) => {
                                const items = results.filter(
                                    (result) => result.type === type,
                                );

                                if (items.length === 0) {
                                    return null;
                                }

                                const { label, icon: Icon } =
                                    SECTION_META[type];

                                return (
                                    <div key={type}>
                                        <p className="px-2.5 pt-3 pb-1 text-[10.5px] font-bold tracking-[0.07em] text-text-tertiary uppercase">
                                            {label}
                                        </p>
                                        {items.map((item) => (
                                            <Link
                                                key={`${item.type}-${item.id}`}
                                                href={item.url}
                                                onClick={close}
                                                className="flex items-center gap-2.5 rounded-[6px] p-2 hover:bg-secondary"
                                            >
                                                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-text-secondary">
                                                    <Icon className="size-[15px]" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-foreground">
                                                        {item.title}
                                                    </span>
                                                    {item.subtitle && (
                                                        <span className="block truncate text-[11.5px] text-text-tertiary">
                                                            {item.subtitle}
                                                        </span>
                                                    )}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                );
                            })}

                        {hasQuery && hasResults && (
                            <Link
                                href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
                                onClick={close}
                                className="mt-2 block rounded-[6px] p-2 text-center text-[12.5px] font-semibold text-accent-strong hover:bg-secondary"
                            >
                                View all results for “{trimmedQuery}”
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-3.5 border-t border-border-soft px-4 py-2.5 text-[11px] text-text-tertiary">
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px]">
                                ↑↓
                            </kbd>
                            navigate
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px]">
                                ↵
                            </kbd>
                            select
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px]">
                                esc
                            </kbd>
                            close
                        </span>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
