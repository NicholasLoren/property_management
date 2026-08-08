import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    DoorOpen,
    IdCard,
    KeyRound,
    Search,
    Users as UsersIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Input } from '@/components/ui/input';

type SearchResultType = 'property' | 'unit' | 'tenant' | 'landlord' | 'user';

type SearchResult = {
    type: SearchResultType;
    id: number;
    title: string;
    subtitle: string | null;
    url: string;
};

type PageProps = {
    query: string;
    results: Partial<Record<SearchResultType, SearchResult[]>>;
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

export default function SearchIndex({ query, results }: PageProps) {
    const [search, setSearch] = useState(query);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    function reload(value: string) {
        router.get(
            '/search',
            { q: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function onSearchChange(value: string) {
        setSearch(value);

        if (searchDebounce.current) {
            clearTimeout(searchDebounce.current);
        }

        searchDebounce.current = setTimeout(() => {
            reload(value);
        }, 300);
    }

    const totalResults = SECTION_ORDER.reduce(
        (sum, type) => sum + (results[type]?.length ?? 0),
        0,
    );

    return (
        <>
            <Head title="Search" />

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Search
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Find properties, units, tenants, landlords, and users
                    across your portfolio.
                </p>
            </div>

            <div className="relative mb-6 max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    autoFocus
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search properties, tenants, leases…"
                    className="pl-9"
                />
            </div>

            {query.trim() === '' && (
                <p className="text-[13px] text-text-tertiary">
                    Start typing to search across your portfolio.
                </p>
            )}

            {query.trim() !== '' && totalResults === 0 && (
                <p className="text-[13px] text-text-tertiary">
                    No results found for “{query}”.
                </p>
            )}

            {query.trim() !== '' && totalResults > 0 && (
                <div className="grid gap-6">
                    {SECTION_ORDER.map((type) => {
                        const items = results[type];

                        if (!items || items.length === 0) {
                            return null;
                        }

                        const { label, icon: Icon } = SECTION_META[type];

                        return (
                            <div key={type}>
                                <h2 className="mb-2.5 text-[13px] font-semibold text-text-secondary">
                                    {label}
                                </h2>
                                <div className="divide-y divide-border-soft rounded-[14px] border border-border-soft bg-card shadow-sm">
                                    {items.map((item) => (
                                        <Link
                                            key={`${item.type}-${item.id}`}
                                            href={item.url}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-secondary"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-secondary text-text-secondary">
                                                <Icon className="size-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                                                    {item.title}
                                                </span>
                                                {item.subtitle && (
                                                    <span className="block truncate text-[12px] text-text-tertiary">
                                                        {item.subtitle}
                                                    </span>
                                                )}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
