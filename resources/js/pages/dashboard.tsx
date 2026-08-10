import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ChevronRight,
    CreditCard,
    DoorOpen,
    Download,
    History,
    Plus,
    Wrench,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import {
    CategoryBarChart,
    LeaseStatusChart,
    RevenueTrendChart,
} from '@/components/charts/portfolio-charts';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import financials from '@/routes/financials';
import leases from '@/routes/leases';
import maintenance from '@/routes/maintenance';
import properties from '@/routes/properties';
import type {
    CategoryBreakdownRow,
    LeaseStatusRow,
    MonthlyTrendPoint,
} from '@/types/reports';

type Kpis = {
    occupied_units: number;
    total_units: number;
    vacant_units: number;
    occupancy_rate: number;
    rent_collected_mtd: string;
    rent_collected_change_pct: number | null;
    overdue_balance: string;
    overdue_leases_count: number;
    overdue_tenants_count: number;
    maintenance_open_count: number;
    maintenance_urgent_count: number;
    maintenance_in_progress_count: number;
};

type UpcomingRenewal = {
    id: number;
    unit_name: string | null;
    property_name: string | null;
    tenant_names: string[];
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
};

type ActivityItem = {
    id: number;
    description: string;
    log_name: string | null;
    event: string | null;
    causer_name: string | null;
    created_at: string | null;
};

type OpenMaintenanceItem = {
    id: number;
    title: string;
    unit_name: string | null;
    property_name: string | null;
    priority: string;
    priority_label: string;
    status: string;
    status_label: string;
};

type PageProps = {
    kpis: Kpis;
    monthly_trend: MonthlyTrendPoint[];
    expense_by_category: CategoryBreakdownRow[];
    income_by_category: CategoryBreakdownRow[];
    lease_status_distribution: LeaseStatusRow[];
    upcoming_renewals: UpcomingRenewal[];
    activity: ActivityItem[];
    open_maintenance: OpenMaintenanceItem[];
};

const ACTIVITY_ICON_BY_LOG_NAME: Record<
    string,
    ComponentType<{ className?: string }>
> = {
    payment: CreditCard,
    lease: DoorOpen,
    maintenance_request: Wrench,
};

const ACTIVITY_TONE_BY_EVENT: Record<
    string,
    'accent' | 'success' | 'neutral' | 'danger'
> = {
    created: 'success',
    updated: 'accent',
    deleted: 'danger',
    restored: 'success',
};

const ACTIVITY_TONE_CLASS: Record<string, string> = {
    accent: 'bg-accent-soft text-accent-strong',
    success: 'bg-success-soft text-success',
    neutral: 'bg-secondary text-text-secondary',
    danger: 'bg-danger-soft text-destructive',
};

const MAINTENANCE_DOT_CLASS: Record<string, string> = {
    urgent: 'bg-destructive',
    high: 'bg-destructive',
    medium: 'bg-warning',
    low: 'bg-secondary',
};

function greeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'Good morning';
    }

    if (hour < 18) {
        return 'Good afternoon';
    }

    return 'Good evening';
}

function formatRelative(iso: string | null): string {
    if (!iso) {
        return '–';
    }

    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 1) {
        return 'Just now';
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d ago`;
    }

    return `${Math.floor(days / 7)}w ago`;
}

function KpiCard({
    label,
    icon: Icon,
    tone,
    value,
    footer,
}: {
    label: string;
    icon: ComponentType<{ className?: string }>;
    tone?: 'danger' | 'warning';
    value: ReactNode;
    footer: ReactNode;
}) {
    return (
        <div className="rounded-[14px] border border-border-soft bg-card p-4 px-[18px] shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">
                    {label}
                </span>
                <span
                    className={`flex size-7 items-center justify-center rounded-[7px] ${
                        tone === 'danger'
                            ? 'bg-danger-soft text-destructive'
                            : tone === 'warning'
                              ? 'bg-warning-soft text-warning'
                              : 'bg-secondary text-text-secondary'
                    }`}
                >
                    <Icon className="size-[15px]" />
                </span>
            </div>
            <div className="font-display text-[25px] font-extrabold tracking-tight tabular-nums">
                {value}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
                {footer}
            </div>
        </div>
    );
}

export default function Dashboard({
    kpis,
    monthly_trend: monthlyTrend,
    expense_by_category: expenseByCategory,
    income_by_category: incomeByCategory,
    lease_status_distribution: leaseStatusDistribution,
    upcoming_renewals: upcomingRenewals,
    activity,
    open_maintenance: openMaintenance,
}: PageProps) {
    const { auth, currency, timezone } = usePage().props;

    return (
        <>
            <Head title="Dashboard" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {greeting()}, {auth.user.name.split(' ')[0]}
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        Your portfolio at a glance for{' '}
                        {new Date().toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: timezone,
                        })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={financials.index()}>
                            <Download className="size-[15px]" />
                            Export report
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={properties.create()}>
                            <Plus className="size-[15px]" />
                            Add property
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                <KpiCard
                    label="Occupied units"
                    icon={DoorOpen}
                    value={
                        <>
                            {kpis.occupied_units}
                            <span className="text-sm font-semibold text-text-tertiary">
                                {' '}
                                / {kpis.total_units}
                            </span>
                        </>
                    }
                    footer={
                        <>
                            <span className="font-bold text-foreground">
                                {kpis.occupancy_rate}%
                            </span>
                            <span className="text-text-tertiary">
                                occupied · {kpis.vacant_units} vacant
                            </span>
                        </>
                    }
                />
                <KpiCard
                    label="Rent collected (MTD)"
                    icon={CreditCard}
                    value={formatCurrency(kpis.rent_collected_mtd, currency)}
                    footer={
                        kpis.rent_collected_change_pct !== null ? (
                            <>
                                <span
                                    className={`inline-flex items-center gap-0.5 font-bold ${
                                        kpis.rent_collected_change_pct >= 0
                                            ? 'text-success'
                                            : 'text-destructive'
                                    }`}
                                >
                                    {kpis.rent_collected_change_pct >= 0 ? (
                                        <ArrowUp className="size-3" />
                                    ) : (
                                        <ArrowDown className="size-3" />
                                    )}
                                    {Math.abs(kpis.rent_collected_change_pct)}%
                                </span>
                                <span className="text-text-tertiary">
                                    vs. same point last month
                                </span>
                            </>
                        ) : (
                            <span className="text-text-tertiary">
                                No collections last month to compare
                            </span>
                        )
                    }
                />
                <KpiCard
                    label="Overdue balances"
                    icon={CreditCard}
                    tone="danger"
                    value={formatCurrency(kpis.overdue_balance, currency)}
                    footer={
                        <span className="text-text-tertiary">
                            {kpis.overdue_tenants_count} tenant
                            {kpis.overdue_tenants_count === 1 ? '' : 's'} past
                            due · {kpis.overdue_leases_count} lease
                            {kpis.overdue_leases_count === 1 ? '' : 's'}
                        </span>
                    }
                />
                <KpiCard
                    label="Open maintenance"
                    icon={Wrench}
                    tone="warning"
                    value={`${kpis.maintenance_open_count}`}
                    footer={
                        <>
                            {kpis.maintenance_urgent_count > 0 && (
                                <span className="rounded-full bg-danger-soft px-1.5 py-px text-[11px] font-semibold text-destructive">
                                    {kpis.maintenance_urgent_count} urgent
                                </span>
                            )}
                            <span className="text-text-tertiary">
                                {kpis.maintenance_in_progress_count} in progress
                            </span>
                        </>
                    }
                />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
                <div className="flex flex-col gap-4">
                    <RevenueTrendChart
                        data={monthlyTrend}
                        currency={currency}
                    />

                    <div className="rounded-[14px] border border-border-soft bg-card shadow-sm">
                        <div className="flex items-center justify-between px-[18px] pt-4">
                            <div>
                                <h3 className="text-[14.5px] font-bold">
                                    Upcoming lease renewals
                                </h3>
                                <p className="mt-0.5 text-xs text-text-tertiary">
                                    Next 30 days
                                </p>
                            </div>
                            <Link
                                href={leases.index()}
                                className="flex items-center gap-0.5 text-[12.5px] font-semibold text-accent-strong hover:underline"
                            >
                                View all
                                <ChevronRight className="size-[13px]" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto p-[14px] px-[18px]">
                            {upcomingRenewals.length > 0 ? (
                                <table className="w-full border-collapse text-[13px]">
                                    <thead>
                                        <tr>
                                            {[
                                                'Unit',
                                                'Tenant',
                                                'Ends',
                                                'Rent',
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className="border-b border-border-soft pb-2.5 text-left text-[11px] font-semibold tracking-wide text-text-tertiary uppercase"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {upcomingRenewals.map((row) => (
                                            <tr key={row.id}>
                                                <td className="border-b border-border-soft py-3 last:border-0">
                                                    <Link
                                                        href={leases.show(
                                                            row.id,
                                                        )}
                                                        className="hover:text-accent-strong hover:underline"
                                                    >
                                                        {row.unit_name}
                                                        {row.property_name &&
                                                            ` · ${row.property_name}`}
                                                    </Link>
                                                </td>
                                                <td className="border-b border-border-soft py-3 last:border-0">
                                                    {row.tenant_names.join(
                                                        ', ',
                                                    ) || '–'}
                                                </td>
                                                <td className="border-b border-border-soft py-3 tabular-nums last:border-0">
                                                    {new Date(
                                                        row.end_date,
                                                    ).toLocaleDateString(
                                                        undefined,
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            timeZone: timezone,
                                                        },
                                                    )}
                                                </td>
                                                <td className="border-b border-border-soft py-3 tabular-nums last:border-0">
                                                    {formatCurrency(
                                                        row.rent_amount,
                                                        currency,
                                                    )}
                                                    <span className="text-text-tertiary">
                                                        {' '}
                                                        /{' '}
                                                        {row.billing_period_label.toLowerCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="py-4 text-center text-[13px] text-text-tertiary">
                                    No leases ending in the next 30 days.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="rounded-[14px] border border-border-soft bg-card shadow-sm">
                        <div className="px-[18px] pt-4">
                            <h3 className="text-[14.5px] font-bold">
                                Activity
                            </h3>
                        </div>
                        <div className="flex flex-col px-[18px] pt-3.5 pb-[18px]">
                            {activity.length > 0 ? (
                                activity.map((item) => {
                                    const Icon = item.log_name
                                        ? (ACTIVITY_ICON_BY_LOG_NAME[
                                              item.log_name
                                          ] ?? History)
                                        : History;
                                    const tone = item.event
                                        ? (ACTIVITY_TONE_BY_EVENT[item.event] ??
                                          'neutral')
                                        : 'neutral';

                                    return (
                                        <div
                                            key={item.id}
                                            className="flex gap-2.5 border-b border-border-soft py-2.5 first:pt-0 last:border-0 last:pb-0"
                                        >
                                            <span
                                                className={`mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full ${ACTIVITY_TONE_CLASS[tone]}`}
                                            >
                                                <Icon className="size-3.5" />
                                            </span>
                                            <div>
                                                <div className="text-[12.5px] leading-relaxed">
                                                    {item.causer_name && (
                                                        <strong>
                                                            {
                                                                item.causer_name
                                                            }{' '}
                                                        </strong>
                                                    )}
                                                    {item.description}
                                                </div>
                                                <div className="mt-0.5 font-mono text-[11px] text-text-tertiary">
                                                    {formatRelative(
                                                        item.created_at,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="py-4 text-center text-[13px] text-text-tertiary">
                                    No activity recorded yet.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[14px] border border-border-soft bg-card shadow-sm">
                        <div className="px-[18px] pt-4">
                            <h3 className="text-[14.5px] font-bold">
                                Open maintenance
                            </h3>
                        </div>
                        <div className="flex flex-col px-[18px] pt-3.5 pb-[18px]">
                            {openMaintenance.length > 0 ? (
                                openMaintenance.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={maintenance.show(item.id)}
                                        className="flex items-center gap-2.5 border-b border-border-soft py-[9px] last:border-0"
                                    >
                                        <span
                                            className={`size-[7px] shrink-0 rounded-full ${MAINTENANCE_DOT_CLASS[item.priority]}`}
                                        />
                                        <div>
                                            <div className="text-[13px] font-semibold">
                                                {item.title}
                                            </div>
                                            <div className="text-[11.5px] text-text-tertiary">
                                                {item.unit_name}
                                                {item.property_name &&
                                                    ` · ${item.property_name}`}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="py-4 text-center text-[13px] text-text-tertiary">
                                    No open maintenance requests.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <CategoryBarChart
                    title="Expenses by category"
                    subtitle="This month"
                    data={expenseByCategory}
                    currency={currency}
                    hue="var(--destructive)"
                />
                <CategoryBarChart
                    title="Other income by category"
                    subtitle="This month"
                    data={incomeByCategory}
                    currency={currency}
                    hue="var(--success)"
                />
                <LeaseStatusChart data={leaseStatusDistribution} />
            </div>
        </>
    );
}
