import { Head, Link, router, usePage } from '@inertiajs/react';
import { CreditCard, Filter, Plus, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
    getPaymentColumns,
    getPaymentTrashColumns,
} from '@/pages/payments/columns';
import type {
    ActivePaymentRow,
    TrashPaymentRow,
} from '@/pages/payments/columns';
import payments from '@/routes/payments';
import type { PaymentRow } from '@/types/payments';

type Option = { value: string; label: string };

type PageProps = {
    payments: {
        data: (ActivePaymentRow | TrashPaymentRow)[];
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
        status: string[];
        sort: string;
        dir: 'asc' | 'desc';
        per_page: number;
        tab: 'active' | 'trash';
    };
    counts: { active: number; trash: number };
    total_collected: string;
    statuses: Option[];
};

export default function PaymentsIndex({
    payments: paginator,
    filters,
    counts,
    total_collected,
    statuses,
}: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search);
    const [syncedSearch, setSyncedSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    if (filters.search !== syncedSearch) {
        setSyncedSearch(filters.search);
        setSearch(filters.search);
    }

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            payments.index().url,
            {
                search: next.search || undefined,
                status: next.status.length ? next.status : undefined,
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

    function toggleStatusFilter(value: string, checked: boolean) {
        const status = checked
            ? [...filters.status, value]
            : filters.status.filter((s) => s !== value);
        reload({ status });
    }

    function switchTab(tab: 'active' | 'trash') {
        reload({ tab, status: [], search: '' });
    }

    function moveToTrash(payment: PaymentRow) {
        router.delete(payments.destroy(payment).url, {
            preserveScroll: true,
            onSuccess: () => {
                toast('Payment moved to trash', {
                    action: {
                        label: 'Undo',
                        onClick: () =>
                            router.patch(
                                payments.restore(payment).url,
                                {},
                                { preserveScroll: true },
                            ),
                    },
                });
            },
        });
    }

    function restore(payment: PaymentRow) {
        router.patch(payments.restore(payment).url, {}, { preserveScroll: true });
    }

    function forceDelete(payment: PaymentRow) {
        if (!confirm('Permanently delete this payment? This cannot be undone.')) {
            return;
        }

        router.delete(payments.forceDelete(payment).url, { preserveScroll: true });
    }

    const canEdit = can('payments.edit');
    const canDelete = can('payments.delete');

    const activeColumns = useMemo(
        () =>
            getPaymentColumns({ canEdit, canDelete, currency, onTrash: moveToTrash }),
        [canEdit, canDelete, currency],
    );

    const trashColumns = useMemo(
        () => getPaymentTrashColumns({ onRestore: restore, onForceDelete: forceDelete }),
        [],
    );

    const isFiltered = filters.search !== '' || filters.status.length > 0;

    const toolbar = (
        <>
            <div className="relative w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search payments…"
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
                    <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                        {statuses.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status.value}
                                checked={filters.status.includes(status.value)}
                                onCheckedChange={(checked) =>
                                    toggleStatusFilter(status.value, checked === true)
                                }
                                onSelect={(e) => e.preventDefault()}
                            >
                                {status.label}
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
                payments.index().url,
                {
                    search: filters.search || undefined,
                    status: filters.status.length ? filters.status : undefined,
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
            <Head title="Payments" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Payments
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Rent payments recorded against leases · Total collected{' '}
                        <span className="font-semibold text-foreground">
                            {formatCurrency(total_collected, currency)}
                        </span>
                    </p>
                </div>
                {can('payments.add') && (
                    <Button asChild>
                        <Link href={payments.create()}>
                            <Plus className="size-[15px]" />
                            Record payment
                        </Link>
                    </Button>
                )}
            </div>

            {filters.status.length > 0 && (
                <div className="mb-3.5 flex flex-wrap items-center gap-2">
                    {filters.status.map((value) => (
                        <span
                            key={value}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-2.5 text-xs font-semibold text-accent-strong"
                        >
                            {statuses.find((s) => s.value === value)?.label ?? value}
                            <button
                                type="button"
                                onClick={() => toggleStatusFilter(value, false)}
                                className="rounded-full p-0.5 hover:bg-black/10"
                            >
                                <X className="size-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {filters.tab === 'active' ? (
                <DataTable
                    tableId="payments"
                    columns={activeColumns}
                    data={paginator.data as ActivePaymentRow[]}
                    emptyState={{
                        icon: CreditCard,
                        title: 'No payments yet',
                        description: 'Record your first rent payment against a lease.',
                        action: can('payments.add')
                            ? {
                                  label: 'Record your first payment',
                                  href: payments.create().url,
                              }
                            : undefined,
                    }}
                    {...sharedTableProps}
                />
            ) : (
                <DataTable
                    tableId="payments-trash"
                    columns={trashColumns}
                    data={paginator.data as TrashPaymentRow[]}
                    emptyState={{
                        icon: CreditCard,
                        title: 'Trash is empty',
                        description: 'Payments you move to trash will show up here.',
                    }}
                    {...sharedTableProps}
                />
            )}
        </>
    );
}
