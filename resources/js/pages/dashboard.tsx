import { Head, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ChevronRight,
    CreditCard,
    DoorOpen,
    Download,
    Plus,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';

const COLLECTIONS_6M = [
    { month: 'Mar', amount: 265000 },
    { month: 'Apr', amount: 278300 },
    { month: 'May', amount: 289600 },
    { month: 'Jun', amount: 300100 },
    { month: 'Jul', amount: 304900 },
    { month: 'Aug', amount: 312480 },
];

const COLLECTIONS_1Y = [
    { month: 'Sep', amount: 231000 },
    { month: 'Oct', amount: 238500 },
    { month: 'Nov', amount: 226800 },
    { month: 'Dec', amount: 242100 },
    { month: 'Jan', amount: 249300 },
    { month: 'Feb', amount: 255900 },
    ...COLLECTIONS_6M,
];

const RENEWALS = [
    {
        unit: 'Alderwood Residences · 4B',
        tenant: 'Marisol Vega',
        ends: 'Aug 14, 2026',
        rent: 1850,
    },
    {
        unit: 'Brightgate Flats · 2A',
        tenant: 'Jonah Kessler',
        ends: 'Aug 19, 2026',
        rent: 1620,
    },
    {
        unit: 'Meridian Court · 11',
        tenant: 'Aisha Bello',
        ends: 'Aug 27, 2026',
        rent: 2100,
    },
];

const ACTIVITY: {
    tone: 'accent' | 'success' | 'neutral' | 'danger';
    icon: ComponentType<{ className?: string }>;
    text: ReactNode;
    time: string;
}[] = [
    {
        tone: 'accent',
        icon: DoorOpen,
        text: (
            <>
                <strong>Marcus Lee</strong> logged in from Chicago, IL
            </>
        ),
        time: '14m ago',
    },
    {
        tone: 'success',
        icon: CreditCard,
        text: (
            <>
                <strong>Sofia Marchetti</strong> recorded a payment of{' '}
                <strong>$1,850</strong> for Unit 4B
            </>
        ),
        time: '32m ago',
    },
    {
        tone: 'neutral',
        icon: DoorOpen,
        text: (
            <>
                <strong>System</strong> generated 42 rent invoices via scheduled
                job
            </>
        ),
        time: '1h ago · schedule:run',
    },
    {
        tone: 'danger',
        icon: Wrench,
        text: (
            <>
                <strong>Priya Shah</strong> moved tenant{' '}
                <strong>Tom Reyes</strong> to trash
            </>
        ),
        time: '2h ago',
    },
];

const MAINTENANCE = [
    {
        dot: 'bg-destructive',
        title: 'Water heater leak',
        desc: 'Meridian Court · Unit 11',
    },
    {
        dot: 'bg-warning',
        title: 'HVAC not cooling',
        desc: 'Alderwood Residences · 2C',
    },
    {
        dot: 'bg-warning',
        title: 'Broken window latch',
        desc: 'Brightgate Flats · 1A',
    },
];

const ACTIVITY_TONE_CLASS: Record<string, string> = {
    accent: 'bg-accent-soft text-accent-strong',
    success: 'bg-success-soft text-success',
    neutral: 'bg-secondary text-text-secondary',
    danger: 'bg-danger-soft text-destructive',
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

export default function Dashboard() {
    const { name, currency, timezone } = usePage().props;
    const [range, setRange] = useState<'6m' | '1y'>('6m');
    const data = range === '6m' ? COLLECTIONS_6M : COLLECTIONS_1Y;

    return (
        <>
            <Head title="Dashboard" />

            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-5">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {greeting()}, Priya
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
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.info(
                                'Reporting is not connected yet. This button is a placeholder.',
                            )
                        }
                    >
                        <Download className="size-[15px]" />
                        Export report
                    </Button>
                    <Button
                        onClick={() =>
                            toast.info(
                                'Properties are not connected yet. This button is a placeholder.',
                            )
                        }
                    >
                        <Plus className="size-[15px]" />
                        Add property
                    </Button>
                </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                <KpiCard
                    label="Occupied units"
                    icon={DoorOpen}
                    value={
                        <>
                            214
                            <span className="text-sm font-semibold text-text-tertiary">
                                {' '}
                                / 238
                            </span>
                        </>
                    }
                    footer={
                        <>
                            <span className="inline-flex items-center gap-0.5 font-bold text-success">
                                <ArrowUp className="size-3" />
                                2.1%
                            </span>
                            <span className="text-text-tertiary">
                                89.9% occupancy
                            </span>
                        </>
                    }
                />
                <KpiCard
                    label="Rent collected (MTD)"
                    icon={CreditCard}
                    value={formatCurrency(312480, currency)}
                    footer={
                        <>
                            <span className="inline-flex items-center gap-0.5 font-bold text-success">
                                <ArrowUp className="size-3" />
                                4.6%
                            </span>
                            <span className="text-text-tertiary">
                                vs. last month
                            </span>
                        </>
                    }
                />
                <KpiCard
                    label="Overdue balances"
                    icon={CreditCard}
                    tone="danger"
                    value={formatCurrency(18240, currency)}
                    footer={
                        <>
                            <span className="inline-flex items-center gap-0.5 font-bold text-success">
                                <ArrowDown className="size-3" />
                                12%
                            </span>
                            <span className="text-text-tertiary">
                                9 tenants past due
                            </span>
                        </>
                    }
                />
                <KpiCard
                    label="Open maintenance"
                    icon={Wrench}
                    tone="warning"
                    value="14"
                    footer={
                        <>
                            <span className="rounded-full bg-danger-soft px-1.5 py-px text-[11px] font-semibold text-destructive">
                                3 urgent
                            </span>
                            <span className="text-text-tertiary">
                                11 in progress
                            </span>
                        </>
                    }
                />
            </div>

            <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
                <div className="flex flex-col gap-4">
                    <div className="rounded-[14px] border border-border-soft bg-card shadow-sm">
                        <div className="flex items-start justify-between px-[18px] pt-4">
                            <div>
                                <h3 className="text-[14.5px] font-bold">
                                    Collections trend
                                </h3>
                                <p className="mt-0.5 text-xs text-text-tertiary">
                                    Rent collected, last{' '}
                                    {range === '6m' ? '6 months' : 'year'}
                                </p>
                            </div>
                            <div className="inline-flex gap-0.5 rounded-full border border-border-soft bg-secondary p-[3px]">
                                {(['6m', '1y'] as const).map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setRange(key)}
                                        className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${
                                            range === key
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-text-secondary'
                                        }`}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[210px] px-2.5 pb-3.5">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={data}
                                    margin={{
                                        top: 24,
                                        right: 16,
                                        left: 8,
                                        bottom: 0,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="collectionsFill"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="var(--accent-strong)"
                                                stopOpacity={0.22}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="var(--accent-strong)"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fontSize: 10,
                                            fill: 'var(--text-tertiary)',
                                        }}
                                        dy={8}
                                    />
                                    <ChartTooltip
                                        formatter={(
                                            value:
                                                | number
                                                | string
                                                | readonly (number | string)[]
                                                | undefined,
                                        ) => [
                                            formatCurrency(
                                                Number(value),
                                                currency,
                                            ),
                                            'Collected',
                                        ]}
                                        contentStyle={{
                                            background: 'var(--popover)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 8,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="var(--accent-strong)"
                                        strokeWidth={2.5}
                                        fill="url(#collectionsFill)"
                                        dot={false}
                                        activeDot={{ r: 4.5 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

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
                            <button
                                type="button"
                                className="flex items-center gap-0.5 text-[12.5px] font-semibold text-accent-strong hover:underline"
                                onClick={() =>
                                    toast.info('Leases are not connected yet.')
                                }
                            >
                                View all
                                <ChevronRight className="size-[13px]" />
                            </button>
                        </div>
                        <div className="overflow-x-auto p-[14px] px-[18px]">
                            <table className="w-full border-collapse text-[13px]">
                                <thead>
                                    <tr>
                                        {[
                                            'Unit',
                                            'Tenant',
                                            'Ends',
                                            'Rent',
                                            '',
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
                                    {RENEWALS.map((row) => (
                                        <tr key={row.unit}>
                                            <td className="border-b border-border-soft py-3 last:border-0">
                                                {row.unit}
                                            </td>
                                            <td className="border-b border-border-soft py-3 last:border-0">
                                                {row.tenant}
                                            </td>
                                            <td className="border-b border-border-soft py-3 tabular-nums last:border-0">
                                                {row.ends}
                                            </td>
                                            <td className="border-b border-border-soft py-3 tabular-nums last:border-0">
                                                {formatCurrency(
                                                    row.rent,
                                                    currency,
                                                )}
                                            </td>
                                            <td className="border-b border-border-soft py-3 text-right last:border-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        toast.success(
                                                            `Renewal reminder sent to ${row.tenant}.`,
                                                        )
                                                    }
                                                >
                                                    Send renewal
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                            {ACTIVITY.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex gap-2.5 border-b border-border-soft py-2.5 first:pt-0 last:border-0 last:pb-0"
                                >
                                    <span
                                        className={`mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full ${ACTIVITY_TONE_CLASS[item.tone]}`}
                                    >
                                        <item.icon className="size-3.5" />
                                    </span>
                                    <div>
                                        <div className="text-[12.5px] leading-relaxed">
                                            {item.text}
                                        </div>
                                        <div className="mt-0.5 font-mono text-[11px] text-text-tertiary">
                                            {item.time}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[14px] border border-border-soft bg-card shadow-sm">
                        <div className="px-[18px] pt-4">
                            <h3 className="text-[14.5px] font-bold">
                                Open maintenance
                            </h3>
                        </div>
                        <div className="flex flex-col px-[18px] pt-3.5 pb-[18px]">
                            {MAINTENANCE.map((item) => (
                                <div
                                    key={item.title}
                                    className="flex items-center gap-2.5 border-b border-border-soft py-[9px] last:border-0"
                                >
                                    <span
                                        className={`size-[7px] shrink-0 rounded-full ${item.dot}`}
                                    />
                                    <div>
                                        <div className="text-[13px] font-semibold">
                                            {item.title}
                                        </div>
                                        <div className="text-[11.5px] text-text-tertiary">
                                            {item.desc}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 border-t border-border-soft pt-4.5 text-center text-[11.5px] text-text-tertiary">
                {name} · placeholder data, not yet connected to Properties,
                Leases, or Payments
            </div>
        </>
    );
}
