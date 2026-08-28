import { ChartLine, ChartPie } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    LabelList,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import type {
    CategoryBreakdownRow,
    CollectionRateTrendPoint,
    LeaseStatusRow,
    MonthlyTrendPoint,
} from '@/types/reports';

const LEASE_STATUS_CLASS: Record<string, string> = {
    draft: 'bg-secondary',
    active: 'bg-success',
    ended: 'bg-secondary',
    terminated: 'bg-destructive',
};

// Fixed order, never cycled — identity color for up to 5 pie slices; a 6th+
// category folds into a neutral "Other" bucket rather than generating a hue.
const SERIES_COLORS = [
    'var(--series-1)',
    'var(--series-2)',
    'var(--series-3)',
    'var(--series-4)',
    'var(--series-5)',
];
const OTHER_SLICE_COLOR = 'var(--text-tertiary)';

function ChartCard({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-[14px] border border-border-soft bg-card shadow-sm">
            <div className="px-[18px] pt-4">
                <h3 className="text-[14.5px] font-bold">{title}</h3>
                {subtitle && (
                    <p className="mt-0.5 text-xs text-text-tertiary">
                        {subtitle}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}

export function RevenueTrendChart({
    data,
    currency,
}: {
    data: MonthlyTrendPoint[];
    currency: string;
}) {
    const chartData = data.map((point) => ({
        ...point,
        income: Number(point.income),
        expense: Number(point.expense),
    }));

    return (
        <ChartCard
            title="Revenue trend"
            subtitle="Income vs. expenses, last 12 months"
        >
            <div className="h-[230px] px-2.5 pb-3.5">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 16, left: 8, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id="incomeFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="var(--success)"
                                    stopOpacity={0.12}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="var(--success)"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            vertical={false}
                            stroke="var(--border)"
                        />
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
                            labelFormatter={(_, payload) =>
                                payload?.[0]?.payload?.full_month ?? ''
                            }
                            formatter={(
                                value:
                                    | number
                                    | string
                                    | readonly (number | string)[]
                                    | undefined,
                                name: string | number | undefined,
                            ) => [
                                formatCurrency(Number(value), currency),
                                name === 'income' ? 'Income' : 'Expenses',
                            ]}
                            contentStyle={{
                                background: 'var(--popover)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                fontSize: 12,
                            }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            height={28}
                            iconType="plainline"
                            wrapperStyle={{ fontSize: 12 }}
                            formatter={(value) =>
                                value === 'income' ? 'Income' : 'Expenses'
                            }
                        />
                        <Area
                            type="monotone"
                            dataKey="income"
                            stroke="var(--success)"
                            strokeWidth={2}
                            fill="url(#incomeFill)"
                            dot={false}
                            activeDot={{
                                r: 4,
                                stroke: 'var(--card)',
                                strokeWidth: 2,
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="expense"
                            stroke="var(--destructive)"
                            strokeWidth={2}
                            strokeDasharray="5 4"
                            dot={false}
                            activeDot={{
                                r: 4,
                                stroke: 'var(--card)',
                                strokeWidth: 2,
                            }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
}

/**
 * A short, single-hue horizontal bar list — used for both category
 * breakdowns and the occupancy-by-property chart. Bars are ranked by
 * magnitude (not identity), so one hue shaded by rank is the correct
 * encoding rather than a categorical palette, and each bar carries its own
 * label, so no legend is needed.
 */
export function RankedBarChart({
    title,
    subtitle,
    data,
    valueFormatter,
    labelFormatter,
    hue,
    emptyMessage,
}: {
    title: string;
    subtitle?: string;
    data: { label: string; value: number }[];
    valueFormatter: (value: number) => string;
    /** Shown on the bar itself — kept short; full precision stays in the tooltip. */
    labelFormatter?: (value: number) => string;
    hue: string;
    emptyMessage: string;
}) {
    const top = data.slice(0, 6);
    const maxValue = Math.max(1, ...top.map((row) => row.value));
    const formatLabel = labelFormatter ?? valueFormatter;

    return (
        <ChartCard title={title} subtitle={subtitle}>
            {top.length > 0 ? (
                <div
                    className="px-2.5 pb-3.5"
                    style={{ height: Math.max(140, top.length * 34 + 24) }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={top}
                            layout="vertical"
                            margin={{ top: 8, right: 56, left: 8, bottom: 0 }}
                            barCategoryGap={10}
                        >
                            <XAxis
                                type="number"
                                hide
                                domain={[0, maxValue * 1.15]}
                            />
                            <YAxis
                                dataKey="label"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                width={110}
                                tick={{
                                    fontSize: 11.5,
                                    fill: 'var(--text-secondary)',
                                }}
                            />
                            <ChartTooltip
                                formatter={(
                                    value:
                                        | number
                                        | string
                                        | readonly (number | string)[]
                                        | undefined,
                                ) => [valueFormatter(Number(value)), 'Amount']}
                                contentStyle={{
                                    background: 'var(--popover)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill={hue}
                                radius={[0, 4, 4, 0]}
                                maxBarSize={20}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    formatter={(value) =>
                                        formatLabel(Number(value))
                                    }
                                    style={{
                                        fill: 'var(--text-secondary)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="px-[18px] py-8 text-center text-[13px] text-text-tertiary">
                    {emptyMessage}
                </p>
            )}
        </ChartCard>
    );
}

export function CategoryBarChart({
    title,
    subtitle = 'Top categories for the selected period',
    data,
    currency,
    hue,
}: {
    title: string;
    subtitle?: string;
    data: CategoryBreakdownRow[];
    currency: string;
    hue: string;
}) {
    return (
        <RankedBarChart
            title={title}
            subtitle={subtitle}
            data={data.map((row) => ({
                label: row.category,
                value: Number(row.amount),
            }))}
            valueFormatter={(value) => formatCurrency(value, currency)}
            labelFormatter={(value) => formatCurrencyCompact(value, currency)}
            hue={hue}
            emptyMessage="Nothing recorded for this period."
        />
    );
}

export function LeaseStatusChart({ data }: { data: LeaseStatusRow[] }) {
    const total = data.reduce((sum, row) => sum + row.count, 0);

    return (
        <ChartCard
            title="Lease status"
            subtitle={
                total > 0 ? `${total} lease${total === 1 ? '' : 's'}` : ''
            }
        >
            <div className="px-[18px] py-4">
                {total > 0 ? (
                    <>
                        <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
                            {data
                                .filter((row) => row.count > 0)
                                .map((row) => (
                                    <div
                                        key={row.status}
                                        className={`h-full ${LEASE_STATUS_CLASS[row.status]} first:rounded-l-full last:rounded-r-full`}
                                        style={{
                                            width: `${(row.count / total) * 100}%`,
                                            marginRight: 2,
                                        }}
                                        title={`${row.status_label}: ${row.count}`}
                                    />
                                ))}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
                            {data.map((row) => (
                                <div
                                    key={row.status}
                                    className="flex items-center gap-2 text-[12.5px]"
                                >
                                    <span
                                        className={`size-2.5 shrink-0 rounded-full ${LEASE_STATUS_CLASS[row.status]}`}
                                    />
                                    <span className="text-text-secondary">
                                        {row.status_label}
                                    </span>
                                    <span className="ml-auto font-semibold text-foreground">
                                        {row.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="py-4 text-center text-[13px] text-text-tertiary">
                        No leases recorded yet.
                    </p>
                )}
            </div>
        </ChartCard>
    );
}

/**
 * A compact empty-state for the smaller Insights cards — icon + message,
 * lighter-weight than the full-width chart empty states above.
 */
function InsightEmptyState({
    icon: Icon,
    message,
}: {
    icon: typeof ChartLine;
    message: string;
}) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-text-tertiary">
            <Icon className="size-7 opacity-60" />
            <p className="text-[13px]">{message}</p>
        </div>
    );
}

export function CollectionRateChart({
    data,
}: {
    data: CollectionRateTrendPoint[];
}) {
    const hasData = data.some((point) => point.rate > 0);

    return (
        <ChartCard title="Collection rate" subtitle="Recent months">
            {hasData ? (
                <div className="h-[190px] px-2.5 pb-3.5">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="var(--border)"
                            />
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
                            <YAxis
                                domain={[0, 100]}
                                axisLine={false}
                                tickLine={false}
                                width={34}
                                tick={{
                                    fontSize: 10,
                                    fill: 'var(--text-tertiary)',
                                }}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <ChartTooltip
                                labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.full_month ?? ''
                                }
                                formatter={(
                                    value:
                                        | number
                                        | string
                                        | readonly (number | string)[]
                                        | undefined,
                                ) => [`${value}%`, 'Collection rate']}
                                contentStyle={{
                                    background: 'var(--popover)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                }}
                            />
                            <Bar
                                dataKey="rate"
                                fill="var(--accent-strong)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={28}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <InsightEmptyState
                    icon={ChartLine}
                    message="Not enough data yet"
                />
            )}
        </ChartCard>
    );
}

export function IncomeExpenseMiniChart({
    data,
    currency,
}: {
    data: MonthlyTrendPoint[];
    currency: string;
}) {
    const chartData = data.map((point) => ({
        ...point,
        income: Number(point.income),
        expense: Number(point.expense),
    }));
    const hasData = chartData.some(
        (point) => point.income > 0 || point.expense > 0,
    );

    return (
        <ChartCard title="Income vs Expenses" subtitle="Recent months">
            {hasData ? (
                <div className="h-[190px] px-2.5 pb-3.5">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="var(--border)"
                            />
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
                                labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.full_month ?? ''
                                }
                                formatter={(
                                    value:
                                        | number
                                        | string
                                        | readonly (number | string)[]
                                        | undefined,
                                    name: string | number | undefined,
                                ) => [
                                    formatCurrency(Number(value), currency),
                                    name === 'income' ? 'Income' : 'Expenses',
                                ]}
                                contentStyle={{
                                    background: 'var(--popover)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                height={20}
                                iconType="plainline"
                                wrapperStyle={{ fontSize: 11 }}
                                formatter={(value) =>
                                    value === 'income' ? 'Income' : 'Expenses'
                                }
                            />
                            <Line
                                type="monotone"
                                dataKey="income"
                                stroke="var(--success)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{
                                    r: 4,
                                    stroke: 'var(--card)',
                                    strokeWidth: 2,
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="expense"
                                stroke="var(--destructive)"
                                strokeWidth={2}
                                strokeDasharray="5 4"
                                dot={false}
                                activeDot={{
                                    r: 4,
                                    stroke: 'var(--card)',
                                    strokeWidth: 2,
                                }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <InsightEmptyState
                    icon={ChartLine}
                    message="Not enough data yet"
                />
            )}
        </ChartCard>
    );
}

export function ExpensesByCategoryPie({
    data,
    currency,
}: {
    data: CategoryBreakdownRow[];
    currency: string;
}) {
    const sorted = [...data].sort(
        (a, b) => Number(b.amount) - Number(a.amount),
    );
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const otherTotal = rest.reduce((sum, row) => sum + Number(row.amount), 0);

    const slices = [
        ...top.map((row, i) => ({
            name: row.category,
            value: Number(row.amount),
            color: SERIES_COLORS[i],
        })),
        // "Other categories" (not "Other") — a real category can itself be
        // named "Other", and this overflow bucket must never collide with it.
        ...(otherTotal > 0
            ? [
                  {
                      name: 'Other categories',
                      value: otherTotal,
                      color: OTHER_SLICE_COLOR,
                  },
              ]
            : []),
    ];
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    return (
        <ChartCard title="Expenses by category" subtitle="Last 3 months">
            {slices.length > 0 ? (
                <div className="flex flex-col gap-3 px-[18px] pt-2 pb-[18px]">
                    <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <ChartTooltip
                                    formatter={(
                                        value:
                                            | number
                                            | string
                                            | readonly (number | string)[]
                                            | undefined,
                                        name: string | number | undefined,
                                    ) => [
                                        formatCurrency(Number(value), currency),
                                        name,
                                    ]}
                                    contentStyle={{
                                        background: 'var(--popover)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                                <Pie
                                    data={slices}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius="55%"
                                    outerRadius="90%"
                                    paddingAngle={2}
                                    stroke="var(--card)"
                                    strokeWidth={2}
                                >
                                    {slices.map((slice, i) => (
                                        <Cell
                                            key={`${slice.name}-${i}`}
                                            fill={slice.color}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {slices.map((slice, i) => (
                            <div
                                key={`${slice.name}-${i}`}
                                className="flex items-center gap-2 text-[12px]"
                            >
                                <span
                                    className="size-2.5 shrink-0 rounded-full"
                                    style={{ background: slice.color }}
                                />
                                <span className="truncate text-text-secondary">
                                    {slice.name}
                                </span>
                                <span className="ml-auto shrink-0 font-semibold text-foreground">
                                    {total > 0
                                        ? `${Math.round((slice.value / total) * 100)}%`
                                        : '0%'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <InsightEmptyState
                    icon={ChartPie}
                    message="No expenses recorded yet"
                />
            )}
        </ChartCard>
    );
}
