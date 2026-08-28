import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Search, TrendingDown, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import {
    FilterField,
    FilterMultiPillGroup,
    FilterPillGroup,
    FilterSheet,
} from '@/components/filter-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
    getExpenseColumns,
    getExpenseTrashColumns,
} from '@/pages/expenses/columns';
import type {
    ActiveExpenseRow,
    TrashExpenseRow,
} from '@/pages/expenses/columns';
import { ExpenseDetailsSheet } from '@/pages/expenses/expense-details-sheet';
import expenses from '@/routes/expenses';
import type { ExpenseRow } from '@/types/transactions';

type Option = { value: string; label: string };

type FilterKey = 'property' | 'period';

type Filters = {
    search: string;
    category_id: string[];
    property: string;
    period: string;
    sort: string;
    dir: 'asc' | 'desc';
    per_page: number;
    tab: 'active' | 'trash';
};

type PageProps = {
    expenses: {
        data: (ActiveExpenseRow | TrashExpenseRow)[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number | null;
            to: number | null;
        };
    };
    filters: Filters;
    counts: { active: number; trash: number };
    total: string;
    categories: Option[];
    properties: Option[];
    periods: Option[];
};

const EMPTY_SINGLE_DRAFT: Pick<Filters, FilterKey> = {
    property: 'all',
    period: 'all_time',
};

export default function ExpensesIndex({
    expenses: paginator,
    filters,
    counts,
    total,
    categories,
    properties,
    periods,
}: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [viewingExpenseId, setViewingExpenseId] = useState<number | null>(
        null,
    );
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [draft, setDraft] = useState<
        Pick<Filters, FilterKey | 'category_id'>
    >({
        property: filters.property,
        period: filters.period,
        category_id: filters.category_id,
    });

    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    function reload(partial: Partial<Filters>) {
        const next = { ...filters, ...partial };

        router.get(
            expenses.index().url,
            {
                search: next.search || undefined,
                category_id: next.category_id.length
                    ? next.category_id
                    : undefined,
                property: next.property !== 'all' ? next.property : undefined,
                period: next.period !== 'all_time' ? next.period : undefined,
                sort: next.sort,
                dir: next.dir,
                per_page: next.per_page,
                tab: next.tab,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                // None of these requests change the option lists or the
                // grand-total figure — skip re-fetching those every time.
                only: ['expenses', 'filters', 'counts'],
            },
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

    function toggleCategoryFilter(value: string, checked: boolean) {
        const category_id = checked
            ? [...filters.category_id, value]
            : filters.category_id.filter((c) => c !== value);
        reload({ category_id });
    }

    function clearAllFilters() {
        reload({ category_id: [], ...EMPTY_SINGLE_DRAFT });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, search: '', category_id: [], ...EMPTY_SINGLE_DRAFT });
    }

    function openFilterSheet(open: boolean) {
        if (open) {
            setDraft({
                property: filters.property,
                period: filters.period,
                category_id: filters.category_id,
            });
        }

        setFilterSheetOpen(open);
    }

    function applyFilterSheet() {
        setFilterSheetOpen(false);
        reload(draft);
    }

    function resetFilterSheet() {
        const empty = { ...EMPTY_SINGLE_DRAFT, category_id: [] as string[] };
        setDraft(empty);
        setFilterSheetOpen(false);
        reload(empty);
    }

    function moveToTrash(expense: ExpenseRow) {
        router.delete(expenses.destroy(expense).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast('Expense moved to trash', {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                expenses.restore(expense).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(expense: ExpenseRow) {
        router.patch(
            expenses.restore(expense).url,
            {},
            { preserveScroll: true },
        );
    }

    function forceDelete(expense: ExpenseRow) {
        if (
            !confirm('Permanently delete this expense? This cannot be undone.')
        ) {
            return;
        }

        router.delete(expenses.forceDelete(expense).url, {
            preserveScroll: true,
        });
    }

    const canEdit = can('expenses.edit');
    const canDelete = can('expenses.delete');

    const activeColumns = useMemo(
        () =>
            getExpenseColumns({
                canEdit,
                canDelete,
                currency,
                onTrash: moveToTrash,
                onView: (expense) => setViewingExpenseId(expense.id),
            }),
        [canEdit, canDelete, currency],
    );

    const trashColumns = useMemo(
        () =>
            getExpenseTrashColumns({
                onRestore: restore,
                onForceDelete: forceDelete,
            }),
        [],
    );

    const activeSingleFilterKeys = (['property', 'period'] as const).filter(
        (key) => filters[key] !== (key === 'period' ? 'all_time' : 'all'),
    );

    const filterOptionsByKey: Record<FilterKey, Option[]> = {
        property: properties,
        period: periods,
    };

    function singleFilterLabel(key: FilterKey): string {
        return (
            filterOptionsByKey[key].find((o) => o.value === filters[key])
                ?.label ?? filters[key]
        );
    }

    function removeSingleFilter(key: FilterKey) {
        reload({
            [key]: key === 'period' ? 'all_time' : 'all',
        } as Partial<Filters>);
    }

    const activeFilterChips = [
        ...filters.category_id.map((value) => ({
            key: `category-${value}`,
            label: categories.find((c) => c.value === value)?.label ?? value,
            onRemove: () => toggleCategoryFilter(value, false),
        })),
        ...activeSingleFilterKeys.map((key) => ({
            key,
            label: singleFilterLabel(key),
            onRemove: () => removeSingleFilter(key),
        })),
    ];

    const isFiltered =
        filters.search !== '' ||
        filters.category_id.length > 0 ||
        activeSingleFilterKeys.length > 0;

    const activeFilterCount =
        filters.category_id.length + activeSingleFilterKeys.length;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by description, property, or code…"
                    className="pl-9"
                />
            </div>

            {filters.tab === 'active' && (
                <FilterSheet
                    title="Filter Expenses"
                    open={filterSheetOpen}
                    onOpenChange={openFilterSheet}
                    activeCount={activeFilterCount}
                    onReset={resetFilterSheet}
                    onApply={applyFilterSheet}
                >
                    <FilterField label="Property">
                        <SearchableSelect
                            value={draft.property}
                            onChange={(value) =>
                                setDraft((d) => ({
                                    ...d,
                                    property: value ?? 'all',
                                }))
                            }
                            options={[
                                { value: 'all', label: 'All properties' },
                                ...properties,
                            ]}
                            placeholder="All properties"
                            searchPlaceholder="Search properties…"
                        />
                    </FilterField>
                    <FilterMultiPillGroup
                        label="Category"
                        options={categories}
                        value={draft.category_id}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, category_id: value }))
                        }
                    />
                    <FilterPillGroup
                        label="Period"
                        options={periods}
                        value={draft.period}
                        onChange={(value) =>
                            setDraft((d) => ({ ...d, period: value }))
                        }
                        includeAll={false}
                    />
                </FilterSheet>
            )}

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
        pagination: paginator.meta,
        onPageChange: (page: number) =>
            router.get(
                expenses.index().url,
                {
                    search: filters.search || undefined,
                    category_id: filters.category_id.length
                        ? filters.category_id
                        : undefined,
                    property:
                        filters.property !== 'all'
                            ? filters.property
                            : undefined,
                    period:
                        filters.period !== 'all_time'
                            ? filters.period
                            : undefined,
                    sort: filters.sort,
                    dir: filters.dir,
                    per_page: filters.per_page,
                    tab: filters.tab,
                    page,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['expenses', 'filters', 'counts'],
                },
            ),
        onPerPageChange: (per_page: number) => reload({ per_page }),
        sort: { column: filters.sort, dir: filters.dir },
        onSortChange: (column: string, dir: 'asc' | 'desc') =>
            reload({ sort: column, dir }),
        isFiltered,
        toolbar,
    };

    return (
        <>
            <Head title="Expenses" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Expenses
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Costs across your portfolio · Total{' '}
                        <span className="font-semibold text-destructive">
                            {formatCurrency(total, currency)}
                        </span>
                    </p>
                </div>
                {can('expenses.add') && (
                    <Button asChild>
                        <Link href={expenses.create()}>
                            <Plus className="size-[15px]" />
                            Add expense
                        </Link>
                    </Button>
                )}
            </div>

            {filters.tab === 'active' && activeFilterChips.length > 0 && (
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                    {activeFilterChips.map((chip) => (
                        <span
                            key={chip.key}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                        >
                            {chip.label}
                            <button
                                type="button"
                                onClick={chip.onRemove}
                                className="rounded-full p-0.5 hover:bg-black/10"
                            >
                                <X className="size-2.5" />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-xs font-semibold text-text-tertiary hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {filters.tab === 'active' ? (
                <DataTable
                    tableId="expenses"
                    columns={activeColumns}
                    data={paginator.data as ActiveExpenseRow[]}
                    emptyState={{
                        icon: TrendingDown,
                        title: 'No expenses yet',
                        description: 'Log your first cost against a property.',
                        action: can('expenses.add')
                            ? {
                                  label: 'Add your first expense',
                                  href: expenses.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="expenses-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashExpenseRow[]}
                    emptyState={{
                        icon: TrendingDown,
                        title: 'Trash is empty',
                        description:
                            'Expenses you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}

            <ExpenseDetailsSheet
                expenseId={viewingExpenseId}
                onOpenChange={(open) => !open && setViewingExpenseId(null)}
            />
        </>
    );
}
