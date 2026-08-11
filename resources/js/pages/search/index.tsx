import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SearchResult, SearchResultType } from '@/lib/search-results';
import {
    SEARCH_SECTION_META,
    SEARCH_SECTION_ORDER,
} from '@/lib/search-results';

type PageProps = {
    query: string;
    results: Partial<Record<SearchResultType, SearchResult[]>>;
};

function ResultList({ items }: { items: SearchResult[] }) {
    return (
        <div className="divide-y divide-border-soft rounded-[14px] border border-border-soft bg-card shadow-sm">
            {items.map((item) => {
                const Icon = SEARCH_SECTION_META[item.type].icon;

                return (
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
                );
            })}
        </div>
    );
}

export default function SearchIndex({ query, results }: PageProps) {
    const [search, setSearch] = useState(query);
    const [activeTab, setActiveTab] = useState('all');
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

    const typesWithResults = SEARCH_SECTION_ORDER.filter(
        (type) => (results[type]?.length ?? 0) > 0,
    );
    const totalResults = typesWithResults.reduce(
        (sum, type) => sum + (results[type]?.length ?? 0),
        0,
    );

    // Fall back to "All" if the active tab's type has no results for the
    // current query (e.g. a narrower search cleared out that type).
    const effectiveTab =
        activeTab !== 'all' &&
        !typesWithResults.includes(activeTab as SearchResultType)
            ? 'all'
            : activeTab;

    return (
        <>
            <Head title="Search" />

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Search
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Find properties, units, tenants, landlords, and users across
                    your portfolio.
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
                <Tabs value={effectiveTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">
                            All
                            <span className="text-text-tertiary">
                                {totalResults}
                            </span>
                        </TabsTrigger>
                        {typesWithResults.map((type) => {
                            const { label, icon: Icon } =
                                SEARCH_SECTION_META[type];

                            return (
                                <TabsTrigger key={type} value={type}>
                                    <Icon className="size-3.5" />
                                    {label}
                                    <span className="text-text-tertiary">
                                        {results[type]?.length}
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <TabsContent
                        value="all"
                        className="grid grid-cols-1 gap-6 pt-4"
                    >
                        {typesWithResults.map((type) => (
                            <div key={type}>
                                <h2 className="mb-2.5 text-[13px] font-semibold text-text-secondary">
                                    {SEARCH_SECTION_META[type].label}
                                </h2>
                                <ResultList items={results[type] ?? []} />
                            </div>
                        ))}
                    </TabsContent>

                    {typesWithResults.map((type) => (
                        <TabsContent key={type} value={type} className="pt-4">
                            <ResultList items={results[type] ?? []} />
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </>
    );
}
