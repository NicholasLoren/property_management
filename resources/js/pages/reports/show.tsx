import { Head, router, usePage } from '@inertiajs/react';
import { ArrowUpDown, Download, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import reports from '@/routes/reports';

type ColumnType = 'text' | 'currency' | 'date' | 'number';

type Column = { key: string; label: string; type: ColumnType };

type SummaryItem = { label: string; value: string; type: ColumnType };

type Option = { value: string; label: string };

type UnitOption = Option & { property_id: string };

type Filters = {
    from: string | null;
    to: string | null;
    property_id: string | null;
    unit_id: string | null;
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
}: PageProps) {
    const { currency, timezone } = usePage().props;
    const [sort, setSort] = useState<{
        key: string;
        dir: 'asc' | 'desc';
    } | null>(null);
    const [scopeLoading, setScopeLoading] = useState(false);

    const visibleUnits = filters.property_id
        ? units.filter((unit) => unit.property_id === filters.property_id)
        : units;

    const propertyOptions = [
        { value: 'all', label: 'All properties' },
        ...properties,
    ];
    const unitOptions = [{ value: 'all', label: 'All units' }, ...visibleUnits];

    function reload(partial: Partial<Filters>) {
        const next = { ...filters, ...partial };

        router.get(
            reports.show(type).url,
            {
                from: dateFilter ? next.from : undefined,
                to: dateFilter ? next.to : undefined,
                property_id: next.property_id || undefined,
                unit_id: next.unit_id || undefined,
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

    function toggleSort(key: string) {
        setSort((prev) =>
            prev?.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' },
        );
    }

    const sortedRows = useMemo(() => {
        if (!sort) {
            return rows;
        }

        const column = columns.find((c) => c.key === sort.key);
        const isNumeric =
            column?.type === 'currency' || column?.type === 'number';

        return [...rows].sort((a, b) => {
            const aVal = a[sort.key] ?? '';
            const bVal = b[sort.key] ?? '';
            const comparison = isNumeric
                ? Number(aVal) - Number(bVal)
                : aVal.localeCompare(bVal);

            return sort.dir === 'asc' ? comparison : -comparison;
        });
    }, [rows, sort, columns]);

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
                                    reload({ from: e.target.value })
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
                                onChange={(e) => reload({ to: e.target.value })}
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

            <div className="overflow-x-auto rounded-[14px] border border-border-soft bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border-soft text-left text-xs font-semibold text-text-tertiary uppercase">
                            {columns.map((column) => (
                                <th key={column.key} className="px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(column.key)}
                                        className="inline-flex items-center gap-1 hover:text-foreground"
                                    >
                                        {column.label}
                                        <ArrowUpDown
                                            className={`size-3 ${sort?.key === column.key ? 'text-accent-strong' : 'opacity-40'}`}
                                        />
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                        {sortedRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-8 text-center text-text-tertiary"
                                >
                                    Nothing to show for this report yet.
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((row, index) => (
                                // Rows have no stable id — they're a computed report projection, not a persisted resource.
                                <tr key={index}>
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={`px-4 py-3 ${column.type === 'currency' || column.type === 'number' ? 'tabular-nums' : ''}`}
                                        >
                                            {formatValue(
                                                row[column.key],
                                                column.type,
                                                currency,
                                                timezone,
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
