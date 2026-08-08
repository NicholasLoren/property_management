import { Head, Link, router, usePage } from '@inertiajs/react';
import { Filter, Plus, Search, TrendingDown, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
    filters: {
        search: string;
        category_id: string[];
        property_id: string[];
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    total: string;
    categories: Option[];
    properties: Option[];
};

export default function ExpensesIndex({
    expenses: paginator,
    filters,
    counts,
    total,
    categories,
    properties,
}: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [viewingExpenseId, setViewingExpenseId] = useState<number | null>(
        null,
    );

    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            expenses.index().url,
            {
                search: next.search || undefined,
                category_id: next.category_id.length
                    ? next.category_id
                    : undefined,
                property_id: next.property_id.length
                    ? next.property_id
                    : undefined,
                sort: next.sort,
                dir: next.dir,
                per_page: next.per_page,
                tab: next.tab,
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

    function toggleCategoryFilter(value: string, checked: boolean) {
        const category_id = checked
            ? [...filters.category_id, value]
            : filters.category_id.filter((c) => c !== value);
        reload({ category_id });
    }

    function togglePropertyFilter(value: string, checked: boolean) {
        const property_id = checked
            ? [...filters.property_id, value]
            : filters.property_id.filter((p) => p !== value);
        reload({ property_id });
    }

    function clearAllFilters() {
        reload({ category_id: [], property_id: [] });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, category_id: [], property_id: [], search: '' });
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

    const activeFilterChips = [
        ...filters.category_id.map((value) => ({
            group: 'category_id' as const,
            value,
            label: categories.find((c) => c.value === value)?.label ?? value,
        })),
        ...filters.property_id.map((value) => ({
            group: 'property' as const,
            value,
            label: properties.find((p) => p.value === value)?.label ?? value,
        })),
    ];

    const isFiltered =
        filters.search !== '' ||
        filters.category_id.length > 0 ||
        filters.property_id.length > 0;

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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="size-[15px]" />
                            Filters
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel>Category</DropdownMenuLabel>
                        {categories.map((category) => (
                            <DropdownMenuCheckboxItem
                                key={category.value}
                                checked={filters.category_id.includes(
                                    category.value,
                                )}
                                onCheckedChange={(checked) =>
                                    toggleCategoryFilter(
                                        category.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {category.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Property</DropdownMenuLabel>
                        {properties.map((property) => (
                            <DropdownMenuCheckboxItem
                                key={property.value}
                                checked={filters.property_id.includes(
                                    property.value,
                                )}
                                onCheckedChange={(checked) =>
                                    togglePropertyFilter(
                                        property.value,
                                        checked === true,
                                    )
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {property.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
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
                    property_id: filters.property_id.length
                        ? filters.property_id
                        : undefined,
                    sort: filters.sort,
                    dir: filters.dir,
                    per_page: filters.per_page,
                    tab: filters.tab,
                    page,
                },
                { preserveState: true, preserveScroll: true, replace: true },
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

            {activeFilterChips.length > 0 && (
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                    {activeFilterChips.map((chip) => (
                        <span
                            key={`${chip.group}-${chip.value}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                        >
                            {chip.label}
                            <button
                                type="button"
                                onClick={() =>
                                    chip.group === 'category_id'
                                        ? toggleCategoryFilter(
                                              chip.value,
                                              false,
                                          )
                                        : togglePropertyFilter(
                                              chip.value,
                                              false,
                                          )
                                }
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
