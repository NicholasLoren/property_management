import { Head, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Download,
    FileSpreadsheet,
    TrendingDown,
    TrendingUp,
    Wallet,
    Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import {
    CategoryBarChart,
    LeaseStatusChart,
    RankedBarChart,
    RevenueTrendChart,
} from '@/components/charts/portfolio-charts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';
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

    function reload(partial: Partial<typeof filters>) {
        const next = { ...filters, ...partial };

        router.get(
            financials.index().url,
            {
                from: next.from,
                to: next.to,
                property_id: next.property_id || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
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
                        className="w-[160px]"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="property_id" className="text-xs">
                        Property
                    </Label>
                    <Select
                        value={filters.property_id ?? 'all'}
                        onValueChange={(value) =>
                            reload({
                                property_id: value === 'all' ? null : value,
                            })
                        }
                    >
                        <SelectTrigger id="property_id" className="w-[220px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All properties</SelectItem>
                            {properties.map((property) => (
                                <SelectItem
                                    key={property.value}
                                    value={property.value}
                                >
                                    {property.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                    data={[...breakdown]
                        .sort((a, b) => b.occupancy_rate - a.occupancy_rate)
                        .map((row) => ({
                            label: row.property_name,
                            value: row.occupancy_rate,
                        }))}
                    valueFormatter={(value) => `${value}%`}
                    hue="var(--accent-brand)"
                    emptyMessage="No properties to report on."
                />
            </div>

            <div className="overflow-x-auto rounded-[14px] border border-border-soft bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border-soft text-left text-xs font-semibold text-text-tertiary uppercase">
                            <th className="px-4 py-3">Property</th>
                            <th className="px-4 py-3">Rent collected</th>
                            <th className="px-4 py-3">Other income</th>
                            <th className="px-4 py-3">Expenses</th>
                            <th className="px-4 py-3">Net income</th>
                            <th className="px-4 py-3">Occupancy</th>
                            <th className="px-4 py-3">Open maintenance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                        {breakdown.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-6 text-center text-text-tertiary"
                                >
                                    No properties to report on.
                                </td>
                            </tr>
                        ) : (
                            breakdown.map((row) => (
                                <tr key={row.property_name}>
                                    <td className="px-4 py-3 font-medium">
                                        {row.property_name}
                                    </td>
                                    <td className="px-4 py-3 text-success">
                                        {formatCurrency(
                                            row.rent_collected,
                                            currency,
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-success">
                                        {formatCurrency(
                                            row.other_income,
                                            currency,
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-destructive">
                                        {formatCurrency(
                                            row.total_expense,
                                            currency,
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">
                                        {formatCurrency(
                                            row.net_income,
                                            currency,
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.occupancy_rate}%
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.maintenance_open}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
