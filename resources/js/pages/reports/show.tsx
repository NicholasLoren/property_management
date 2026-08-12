import { Head, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTablePaginationMeta } from '@/components/data-table/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import reports from '@/routes/reports';

type ColumnType = 'text' | 'currency' | 'date' | 'number';

type Column = {
    key: string;
    label: string;
    type: ColumnType;
    sortable: boolean;
};

type SummaryItem = { label: string; value: string; type: ColumnType };

type Option = { value: string; label: string };

type UnitOption = Option & { property_id: string };

type Filters = {
    from: string | null;
    to: string | null;
    property_id: string | null;
    unit_id: string | null;
    search: string;
    sort: string;
    dir: 'asc' | 'desc';
    per_page: number;
};

type PageProps = {
    type: string;
    title: string;
    description: string;
    date_filter: boolean;
    filters: Filters;
    properties: Option[];
    units: UnitOption[];
    columns: Column[];
    rows: Record<string, string>[];
    summary: SummaryItem[] | null;
    pagination: DataTablePaginationMeta | null;
};

function formatValue(
    value: string | undefined,
    type: ColumnType,
    currency: string,
    timezone: string,
): string {
    if (value === undefined || value === '') {
        return '–';
    }

    if (type === 'currency') {
        const numeric = Number(value);

        return Number.isFinite(numeric) && value.match(/^-?\d+(\.\d+)?$/)
            ? formatCurrency(numeric, currency)
            : value;
    }

    if (type === 'date') {
        return formatDate(value, timezone);
    }

    return value;
}

export default function ReportShow({
    type,
    title,
    description,
    date_filter: dateFilter,
    filters,
    properties,
    units,
    columns,
    rows,
    summary,
    pagination,
}: PageProps) {
    const { currency, timezone } = usePage().props;
    const [scopeLoading, setScopeLoading] = useState(false);
    const [search, setSearch] = useState(filters.search);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const visibleUnits = filters.property_id
        ? units.filter((unit) => unit.property_id === filters.property_id)
        : units;

    const propertyOptions = [
        { value: 'all', label: 'All properties' },
        ...properties,
    ];
    const unitOptions = [{ value: 'all', label: 'All units' }, ...visibleUnits];

    function reload(partial: Partial<Filters & { page: number }>) {
        const next = { ...filters, ...partial };

        router.get(
            reports.show(type).url,
            {
                from: dateFilter ? next.from : undefined,
                to: dateFilter ? next.to : undefined,
                property_id: next.property_id || undefined,
                unit_id: next.unit_id || undefined,
                search: next.search || undefined,
                sort: next.sort || undefined,
                dir: next.dir,
                per_page: next.per_page,
                page: 'page' in partial ? partial.page : 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setScopeLoading(true),
                onFinish: () => setScopeLoading(false),
            },
        );
    }

    function onSearchChange(value: string) {
        setSearch(value);

        if (searchDebounce.current) {
            clearTimeout(searchDebounce.current);
        }

        searchDebounce.current = setTimeout(() => {
            reload({ search: value, page: 1 });
        }, 300);
    }

    function exportUrl(format: 'pdf' | 'excel') {
        return reports.export(
            { type, format },
            {
                query: {
                    from: dateFilter ? (filters.from ?? undefined) : undefined,
                    to: dateFilter ? (filters.to ?? undefined) : undefined,
                    property_id: filters.property_id || undefined,
                    unit_id: filters.unit_id || undefined,
                },
            },
        ).url;
    }

    const reportColumns = useMemo<ColumnDef<Record<string, string>>[]>(
        () =>
            columns.map((column) => ({
                id: column.key,
                accessorKey: column.key,
                header: column.label,
                meta: {
                    label: column.label,
                    sortKey: column.sortable ? column.key : undefined,
                },
                cell: ({ row }) => (
                    <span
                        className={cn(
                            (column.type === 'currency' ||
                                column.type === 'number') &&
                                'tabular-nums',
                        )}
                    >
                        {formatValue(
                            row.original[column.key],
                            column.type,
                            currency,
                            timezone,
                        )}
                    </span>
                ),
            })),
        [columns, currency, timezone],
    );

    return (
        <>
            <Head title={title} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Reports', href: reports.index() },
                        { title, href: reports.show(type) },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {title}
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        {description}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a href={exportUrl('pdf')}>
                            <Download className="size-[15px]" />
                            PDF
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={exportUrl('excel')}>
                            <FileSpreadsheet className="size-[15px]" />
                            Excel
                        </a>
                    </Button>
                </div>
            </div>

            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-[14px] border border-border-soft bg-card p-4 shadow-sm">
                {dateFilter && (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor="from" className="text-xs">
                                From
                            </Label>
                            <Input
                                id="from"
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) =>
                                    reload({ from: e.target.value, page: 1 })
                                }
                                disabled={scopeLoading}
                                className="w-[160px]"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="to" className="text-xs">
                                To
                            </Label>
                            <Input
                                id="to"
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) =>
                                    reload({ to: e.target.value, page: 1 })
                                }
                                disabled={scopeLoading}
                                className="w-[160px]"
                            />
                        </div>
                    </>
                )}
                <div className="grid gap-1.5">
                    <Label htmlFor="property_id" className="text-xs">
                        Property
                    </Label>
                    <SearchableSelect
                        id="property_id"
                        value={filters.property_id ?? 'all'}
                        onChange={(value) =>
                            reload({
                                property_id:
                                    !value || value === 'all' ? null : value,
                                unit_id: null,
                                page: 1,
                            })
                        }
                        options={propertyOptions}
                        loading={scopeLoading}
                        placeholder="All properties"
                        searchPlaceholder="Search properties…"
                        className="w-[200px]"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="unit_id" className="text-xs">
                        Unit
                    </Label>
                    <SearchableSelect
                        id="unit_id"
                        value={filters.unit_id ?? 'all'}
                        onChange={(value) =>
                            reload({
                                unit_id:
                                    !value || value === 'all' ? null : value,
                                page: 1,
                            })
                        }
                        options={unitOptions}
                        loading={scopeLoading}
                        placeholder="All units"
                        searchPlaceholder="Search units…"
                        className="w-[200px]"
                    />
                </div>
            </div>

            {summary && summary.length > 0 && (
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {summary.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-[14px] border border-border-soft bg-card p-4 shadow-sm"
                        >
                            <div className="text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                {item.label}
                            </div>
                            <div className="mt-1.5 text-lg font-extrabold tracking-tight">
                                {formatValue(
                                    item.value,
                                    item.type,
                                    currency,
                                    timezone,
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <DataTable
                tableId={`report-${type}`}
                columns={reportColumns}
                data={rows}
                pagination={
                    pagination ?? {
                        current_page: 1,
                        last_page: 1,
                        per_page: filters.per_page,
                        total: 0,
                        from: null,
                        to: null,
                    }
                }
                onPageChange={(page) => reload({ page })}
                onPerPageChange={(per_page) => reload({ per_page, page: 1 })}
                sort={{ column: filters.sort, dir: filters.dir }}
                onSortChange={(column, dir) =>
                    reload({ sort: column, dir, page: 1 })
                }
                onRefresh={() => reload({ page: pagination?.current_page })}
                isRefreshing={scopeLoading}
                isFiltered={search !== ''}
                emptyState={{
                    title: 'Nothing to show yet',
                    description:
                        'This report has no data for the current filters.',
                }}
                toolbar={
                    <div className="relative w-[220px]">
                        <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                        <Input
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search this report…"
                            className="pl-9"
                        />
                    </div>
                }
            />
        </>
    );
}
