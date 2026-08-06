import { Head, Link, router } from '@inertiajs/react';
import {
    DoorOpen,
    FileText,
    Home,
    Plus,
    Search,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import {
    getExtrasColumns,
    getExtrasTrashColumns,
} from '@/pages/extras/columns';
import { sectionRoutes } from '@/pages/extras/section-routes';
import extras from '@/routes/extras';
import type { ExtrasItemRow, ExtrasSection } from '@/types/extras';

const SECTIONS: {
    key: ExtrasSection;
    label: string;
    icon: ComponentType<{ className?: string }>;
    description: string;
}[] = [
    {
        key: 'expense-categories',
        label: 'Expense categories',
        icon: TrendingDown,
        description: 'Categories available when logging an expense.',
    },
    {
        key: 'income-categories',
        label: 'Income categories',
        icon: TrendingUp,
        description: 'Categories available when logging non-rent income.',
    },
    {
        key: 'document-categories',
        label: 'Document categories',
        icon: FileText,
        description: 'Categories available when filing a document.',
    },
    {
        key: 'property-features',
        label: 'Property features',
        icon: Home,
        description: 'The amenities checklist shown on a property.',
    },
    {
        key: 'unit-types',
        label: 'Unit types',
        icon: DoorOpen,
        description: 'The unit type picker shown on a unit.',
    },
];

type PageProps = {
    section: ExtrasSection;
    items: {
        data: ExtrasItemRow[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number | null;
            to: number | null;
        };
    };
    counts: { active: number; trash: number };
    filters: {
        tab: 'active' | 'trash';
        search: string;
        per_page: number;
    };
};

export default function ExtrasIndex({ section, items, counts, filters }: PageProps) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    const active = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0];
    const routes = sectionRoutes(section);

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            extras.index(section).url,
            {
                tab: next.tab,
                search: next.search || undefined,
                per_page: next.per_page,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function onSearchChange(value: string) {
        setSearch(value);

        if (searchDebounce.current) {
            clearTimeout(searchDebounce.current);
        }

        searchDebounce.current = setTimeout(() => {
            reload({ search: value });
        }, 300);
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, search: '' });
    }

    function moveToTrash(item: ExtrasItemRow) {
        router.delete(routes.destroy(item.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast(`${item.label ?? item.name} moved to trash`, {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(routes.restore(item.id), {}, { preserveScroll: true }),
                    },
                });
            },
        });
    }

    function restore(item: ExtrasItemRow) {
        router.patch(routes.restore(item.id), {}, { preserveScroll: true });
    }

    function forceDelete(item: ExtrasItemRow) {
        if (!confirm(`Permanently delete "${item.label ?? item.name}"? This cannot be undone.`)) {
            return;
        }

        router.delete(routes.forceDelete(item.id), { preserveScroll: true });
    }

    const canEdit = can('extras.edit');
    const canDelete = can('extras.delete');
    const canAdd = can('extras.add');

    const activeColumns = useMemo(
        () => getExtrasColumns({ section, canEdit, canDelete, onTrash: moveToTrash }),
        [section, canEdit, canDelete, moveToTrash],
    );

    const trashColumns = useMemo(
        () => getExtrasTrashColumns({ section, onRestore: restore, onForceDelete: forceDelete }),
        [section, restore, forceDelete],
    );

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search…"
                    className="pl-9"
                />
            </div>

            {canDelete && (
                <div className="inline-flex gap-0.5 rounded-full border border-border-soft bg-secondary p-[3px]">
                    {(['active', 'trash'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => switchTab(tab)}
                            className={cn(
                                'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize',
                                filters.tab === tab
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-text-secondary',
                            )}
                        >
                            {tab} ({counts[tab]})
                        </button>
                    ))}
                </div>
            )}
        </>
    );

    const sharedTableProps = {
        pagination: items.meta,
        onPageChange: (page: number) =>
            router.get(
                extras.index(section).url,
                {
                    tab: filters.tab,
                    search: filters.search || undefined,
                    per_page: filters.per_page,
                    page,
                },
                { preserveState: true, preserveScroll: true, replace: true },
            ),
        onPerPageChange: (per_page: number) => reload({ per_page }),
        sort: { column: 'name', dir: 'asc' as const },
        onSortChange: () => {},
        isFiltered: filters.search !== '',
        toolbar,
    };

    return (
        <>
            <Head title="Extras" />

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">Extras</h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Manageable lists that power dropdowns elsewhere in the app.
                </p>
            </div>

            <div className="grid max-w-[1100px] items-start gap-7 md:grid-cols-[220px_1fr]">
                <nav className="flex flex-col gap-0.5 md:sticky md:top-[74px]">
                    {SECTIONS.map((item) => (
                        <Link
                            key={item.key}
                            href={extras.index(item.key)}
                            prefetch
                            className={cn(
                                'flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13.5px] font-medium',
                                section === item.key
                                    ? 'bg-accent-soft font-semibold text-accent-strong'
                                    : 'text-text-secondary hover:bg-secondary hover:text-foreground',
                            )}
                        >
                            <item.icon
                                className={cn(
                                    'size-[15px]',
                                    section === item.key
                                        ? 'text-accent-strong'
                                        : 'text-text-tertiary',
                                )}
                            />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div>
                    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-4">
                        <p className="text-[13px] text-text-secondary">
                            {active.description}
                        </p>
                        {canAdd && (
                            <Button asChild>
                                <Link href={routes.create()}>
                                    <Plus className="size-[15px]" />
                                    Add
                                </Link>
                            </Button>
                        )}
                    </div>

                    {filters.tab === 'active' ? (
                        <DataTable
                            tableId={`extras-${section}`}
                            columns={activeColumns}
                            data={items.data}
                            emptyState={{
                                icon: Sparkles,
                                title: 'Nothing here yet',
                                description: `Add your first entry to ${active.label.toLowerCase()}.`,
                                action: canAdd
                                    ? { label: 'Add your first entry', href: routes.create() }
                                    : undefined,
                            }}
                            {...sharedTableProps}
                        />
                    ) : (
                        <DataTable
                            tableId={`extras-${section}-trash`}
                            columns={trashColumns}
                            data={items.data}
                            emptyState={{
                                icon: Sparkles,
                                title: 'Trash is empty',
                                description: 'Entries you move to trash will show up here.',
                            }}
                            {...sharedTableProps}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
