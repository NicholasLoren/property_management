import { Head, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Download,
    FileSpreadsheet,
    Search,
    TrendingDown,
    TrendingUp,
    Wallet,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
    CategoryBarChart,
    LeaseStatusChart,
    RankedBarChart,
    RevenueTrendChart,
} from '@/components/charts/portfolio-charts';
import type { SortState } from '@/components/data-table/data-table';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency } from '@/lib/currency';
import { getFinancialsColumns } from '@/pages/financials/columns';
import financials from '@/routes/financials';
import type {
    CategoryBreakdownRow,
    LeaseStatusRow,
    MonthlyTrendPoint,
    ReportPropertyRow,
    ReportSummary,
} from '@/types/reports';

type Option = { value: string; label: string };

type PageProps = {
    filters: { from: string; to: string; property_id: string | null };
    properties: Option[];
    summary: ReportSummary;
    properties_breakdown: ReportPropertyRow[];
    monthly_trend: MonthlyTrendPoint[];
    expense_by_category: CategoryBreakdownRow[];
    income_by_category: CategoryBreakdownRow[];
    lease_status_distribution: LeaseStatusRow[];
};

function StatTile({
    icon: Icon,
    label,
    value,
    tone = 'default',
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
    tone?: 'default' | 'positive' | 'negative';
}) {
    return (
        <div className="rounded-[14px] border border-border-soft bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-text-tertiary">
                <Icon className="size-4" />
                <span className="text-xs font-semibold tracking-wide uppercase">
                    {label}
                </span>
            </div>
            <div
                className={
                    'mt-2 text-xl font-extrabold tracking-tight ' +
                    (tone === 'positive'
                        ? 'text-success'
                        : tone === 'negative'
                          ? 'text-destructive'
                          : 'text-foreground')
                }
            >
                {value}
            </div>
        </div>
    );
}

export default function FinancialsIndex({
    filters,
    properties,
    summary,
    properties_breakdown: breakdown,
    monthly_trend: monthlyTrend,
    expense_by_category: expenseByCategory,
    income_by_category: incomeByCategory,
    lease_status_distribution: leaseStatusDistribution,
}: PageProps) {
    const { currency } = usePage().props;
    const [scopeLoading, setScopeLoading] = useState(false);
    const [breakdownSearch, setBreakdownSearch] = useState('');
    const [breakdownSort, setBreakdownSort] = useState<SortState>({
        column: 'property_name',
        dir: 'asc',
    });
    const [breakdownPage, setBreakdownPage] = useState(1);
    const [breakdownPerPage, setBreakdownPerPage] = useState(10);

    const financialsColumns = useMemo(
        () => getFinancialsColumns(currency),
        [currency],
    );

    const filteredBreakdown = useMemo(
        () =>
            breakdownSearch === ''
                ? breakdown
                : breakdown.filter((row) =>
                      row.property_name
                          .toLowerCase()
                          .includes(breakdownSearch.toLowerCase()),
                  ),
        [breakdown, breakdownSearch],
    );

    const sortedBreakdown = useMemo(() => {
        const { column, dir } = breakdownSort;
        const factor = dir === 'asc' ? 1 : -1;

        return [...filteredBreakdown].sort((a, b) => {
            const key = column as keyof ReportPropertyRow;
            const aValue = a[key];
            const bValue = b[key];

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return (aValue - bValue) * factor;
            }

            return (
                String(aValue).localeCompare(String(bValue), undefined, {
                    numeric: true,
                }) * factor
            );
        });
    }, [filteredBreakdown, breakdownSort]);

    const breakdownTotal = sortedBreakdown.length;
    const breakdownLastPage = Math.max(
        1,
        Math.ceil(breakdownTotal / breakdownPerPage),
    );
    const breakdownCurrentPage = Math.min(breakdownPage, breakdownLastPage);
    const paginatedBreakdown = sortedBreakdown.slice(
        (breakdownCurrentPage - 1) * breakdownPerPage,
        breakdownCurrentPage * breakdownPerPage,
    );

    const propertyOptions = [
        { value: 'all', label: 'All properties' },
        ...properties,
    ];

    const occupancyByProperty = useMemo(() => {
        const nameCounts = new Map<string, number>();

        for (const row of breakdown) {
            nameCounts.set(
                row.property_name,
                (nameCounts.get(row.property_name) ?? 0) + 1,
            );
        }

        return [...breakdown]
            .sort((a, b) => b.occupancy_rate - a.occupancy_rate)
            .map((row) => ({
                label:
                    (nameCounts.get(row.property_name) ?? 0) > 1
                        ? `${row.property_name} (#${row.property_id})`
                        : row.property_name,
                value: row.occupancy_rate,
            }));
    }, [breakdown]);

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            financials.index().url,
            {
                from: next.from,
                to: next.to,
                property_id: next.property_id || undefined,
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
        return financials.export(format, {
            query: {
                from: filters.from,
                to: filters.to,
                property_id: filters.property_id || undefined,
            },
        }).url;
    }

    const totalIncome =
        Number(summary.rent_collected) + Number(summary.other_income);
    const netTone = Number(summary.net_income) >= 0 ? 'positive' : 'negative';

    return (
        <>
            <Head title="Financials" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        Financials
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Financial and occupancy performance across your
                        portfolio.
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
                <div className="grid gap-1.5">
                    <Label htmlFor="from" className="text-xs">
                        From
                    </Label>
                    <Input
                        id="from"
                        type="date"
                        value={filters.from}
                        onChange={(e) => reload({ from: e.target.value })}
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
                        value={filters.to}
                        onChange={(e) => reload({ to: e.target.value })}
                        disabled={scopeLoading}
                        className="w-[160px]"
                    />
                </div>
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
                            })
                        }
                        options={propertyOptions}
                        loading={scopeLoading}
                        placeholder="All properties"
                        searchPlaceholder="Search properties…"
                        className="w-[220px]"
                    />
                </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatTile
                    icon={TrendingUp}
                    label="Total income"
                    value={formatCurrency(totalIncome, currency)}
                    tone="positive"
                />
                <StatTile
                    icon={TrendingDown}
                    label="Total expenses"
                    value={formatCurrency(summary.total_expense, currency)}
                    tone="negative"
                />
                <StatTile
                    icon={Wallet}
                    label="Net income"
                    value={formatCurrency(summary.net_income, currency)}
                    tone={netTone}
                />
                <StatTile
                    icon={Building2}
                    label="Occupancy"
                    value={`${summary.occupancy_rate}% (${summary.occupied_units}/${summary.total_units})`}
                />
                <StatTile
                    icon={Wallet}
                    label="Expected monthly rent"
                    value={formatCurrency(
                        summary.expected_monthly_rent,
                        currency,
                    )}
                />
                <StatTile
                    icon={Wrench}
                    label="Open maintenance"
                    value={`${summary.maintenance_open}`}
                />
            </div>

            <div className="mb-5 grid gap-4 lg:grid-cols-2">
                <RevenueTrendChart data={monthlyTrend} currency={currency} />
                <LeaseStatusChart data={leaseStatusDistribution} />
            </div>

            <div className="mb-5 grid gap-4 lg:grid-cols-3">
                <CategoryBarChart
                    title="Expenses by category"
                    data={expenseByCategory}
                    currency={currency}
                    hue="var(--destructive)"
                />
                <CategoryBarChart
                    title="Other income by category"
                    data={incomeByCategory}
                    currency={currency}
                    hue="var(--success)"
                />
                <RankedBarChart
                    title="Occupancy by property"
                    subtitle="Highest occupancy first"
                    data={occupancyByProperty}
                    valueFormatter={(value) => `${value}%`}
                    hue="var(--accent-brand)"
                    emptyMessage="No properties to report on."
                />
            </div>

            <DataTable
                tableId="financials-property-breakdown"
                columns={financialsColumns}
                data={paginatedBreakdown}
                pagination={{
                    current_page: breakdownCurrentPage,
                    last_page: breakdownLastPage,
                    per_page: breakdownPerPage,
                    total: breakdownTotal,
                    from:
                        breakdownTotal === 0
                            ? null
                            : (breakdownCurrentPage - 1) * breakdownPerPage + 1,
                    to:
                        breakdownTotal === 0
                            ? null
                            : Math.min(
                                  breakdownCurrentPage * breakdownPerPage,
                                  breakdownTotal,
                              ),
                }}
                onPageChange={setBreakdownPage}
                onPerPageChange={(perPage) => {
                    setBreakdownPerPage(perPage);
                    setBreakdownPage(1);
                }}
                sort={breakdownSort}
                onSortChange={(column, dir) => {
                    setBreakdownSort({ column, dir });
                    setBreakdownPage(1);
                }}
                isFiltered={breakdownSearch !== ''}
                emptyState={{
                    icon: Building2,
                    title: 'No properties to report on',
                    description:
                        'Properties with activity in this date range will show up here.',
                }}
                toolbar={
                    <div className="relative w-[220px]">
                        <Search className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-text-tertiary" />
                        <Input
                            value={breakdownSearch}
                            onChange={(e) => {
                                setBreakdownSearch(e.target.value);
                                setBreakdownPage(1);
                            }}
                            placeholder="Search properties…"
                            className="pl-9"
                        />
                    </div>
                }
            />
        </>
    );
}
