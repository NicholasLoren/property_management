import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/datetime';
import leases from '@/routes/leases';
import maintenance from '@/routes/maintenance';
import tenants from '@/routes/tenants';

export type TenantTabRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

export type PaymentTabRow = {
    id: number;
    lease_id: number;
    amount: string;
    payment_date: string;
    method_label: string;
    status: string;
    status_label: string;
};

export type LeaseTabRow = {
    id: number;
    status: string;
    status_label: string;
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
    tenant_names: string[];
};

export type MaintenanceTabRow = {
    id: number;
    title: string;
    status: string;
    status_label: string;
    priority_label: string;
    cost: string | null;
    scheduled_date: string | null;
    completed_at: string | null;
};

export const PAYMENT_STATUS_CLASS: Record<string, string> = {
    completed: 'bg-success-soft text-success',
    refunded: 'bg-warning-soft text-warning',
    failed: 'bg-destructive/10 text-destructive',
};

export const LEASE_STATUS_CLASS: Record<string, string> = {
    draft: 'bg-secondary text-text-secondary',
    active: 'bg-success-soft text-success',
    ended: 'bg-secondary text-text-secondary',
    terminated: 'bg-destructive/10 text-destructive',
};

export const MAINTENANCE_STATUS_CLASS: Record<string, string> = {
    open: 'bg-warning-soft text-warning',
    in_progress: 'bg-accent-soft text-accent-strong',
    completed: 'bg-success-soft text-success',
    cancelled: 'bg-secondary text-text-secondary',
};

export function getTenantTabColumns(): ColumnDef<TenantTabRow>[] {
    return [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Tenant',
            enableHiding: false,
            meta: { label: 'Tenant', sortKey: 'name' },
            cell: ({ row }) => (
                <Link
                    href={tenants.show(row.original.id)}
                    className="flex items-center gap-2.5 hover:opacity-80"
                >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-text-tertiary">
                        <UserRound className="size-4" />
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                        {row.original.name}
                    </span>
                </Link>
            ),
        },
        {
            id: 'email',
            accessorKey: 'email',
            header: 'Email',
            meta: { label: 'Email', sortKey: 'email' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {row.original.email ?? '–'}
                </span>
            ),
        },
        {
            id: 'phone',
            header: 'Phone',
            meta: { label: 'Phone' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {row.original.phone ?? '–'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="View tenant"
                        asChild
                    >
                        <Link href={tenants.show(row.original.id)}>
                            <Eye className="size-[15px]" />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];
}

export function getPaymentTabColumns(opts: {
    currency: string;
    timezone: string;
}): ColumnDef<PaymentTabRow>[] {
    return [
        {
            id: 'amount',
            accessorKey: 'amount',
            header: 'Amount',
            enableHiding: false,
            meta: { label: 'Amount', sortKey: 'amount' },
            cell: ({ row }) => (
                <span className="text-[13px] font-semibold text-foreground">
                    {formatCurrency(row.original.amount, opts.currency)}
                </span>
            ),
        },
        {
            id: 'payment_date',
            header: 'Date',
            meta: { label: 'Date', sortKey: 'payment_date' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {formatDate(row.original.payment_date, opts.timezone)}
                </span>
            ),
        },
        {
            id: 'method',
            header: 'Method',
            meta: { label: 'Method' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {row.original.method_label}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
            cell: ({ row }) => (
                <Badge className={PAYMENT_STATUS_CLASS[row.original.status]}>
                    {row.original.status_label}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="View lease"
                        asChild
                    >
                        <Link href={leases.show(row.original.lease_id)}>
                            <Eye className="size-[15px]" />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];
}

export function getLeaseTabColumns(opts: {
    currency: string;
    timezone: string;
}): ColumnDef<LeaseTabRow>[] {
    return [
        {
            id: 'tenants',
            header: 'Tenants',
            enableHiding: false,
            meta: { label: 'Tenants' },
            cell: ({ row }) => (
                <span className="text-[13px] font-semibold text-foreground">
                    {row.original.tenant_names.join(', ') || 'No tenants'}
                </span>
            ),
        },
        {
            id: 'dates',
            header: 'Dates',
            meta: { label: 'Dates', sortKey: 'start_date' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {formatDate(row.original.start_date, opts.timezone)} –{' '}
                    {formatDate(row.original.end_date, opts.timezone)}
                </span>
            ),
        },
        {
            id: 'rent_amount',
            header: 'Rent',
            meta: { label: 'Rent', sortKey: 'rent_amount' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {formatCurrency(row.original.rent_amount, opts.currency)} /{' '}
                    {row.original.billing_period_label.toLowerCase()}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
            cell: ({ row }) => (
                <Badge className={LEASE_STATUS_CLASS[row.original.status]}>
                    {row.original.status_label}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="View lease"
                        asChild
                    >
                        <Link href={leases.show(row.original.id)}>
                            <Eye className="size-[15px]" />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];
}

export function getMaintenanceTabColumns(opts: {
    currency: string;
    timezone: string;
}): ColumnDef<MaintenanceTabRow>[] {
    return [
        {
            id: 'title',
            accessorKey: 'title',
            header: 'Request',
            enableHiding: false,
            meta: { label: 'Request' },
            cell: ({ row }) => (
                <div>
                    <div className="text-[13px] font-semibold text-foreground">
                        {row.original.title}
                    </div>
                    <div className="text-xs text-text-tertiary">
                        {row.original.priority_label}
                    </div>
                </div>
            ),
        },
        {
            id: 'schedule',
            header: 'Schedule',
            meta: { label: 'Schedule' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {row.original.scheduled_date &&
                        `Scheduled ${formatDate(row.original.scheduled_date, opts.timezone)}`}
                    {row.original.completed_at &&
                        `Completed ${formatDateTime(row.original.completed_at, opts.timezone)}`}
                    {!row.original.scheduled_date &&
                        !row.original.completed_at &&
                        '–'}
                </span>
            ),
        },
        {
            id: 'cost',
            header: 'Cost',
            meta: { label: 'Cost', sortKey: 'cost' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {row.original.cost !== null
                        ? formatCurrency(row.original.cost, opts.currency)
                        : '–'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
            cell: ({ row }) => (
                <Badge
                    className={MAINTENANCE_STATUS_CLASS[row.original.status]}
                >
                    {row.original.status_label}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="View request"
                        asChild
                    >
                        <Link href={maintenance.show(row.original.id)}>
                            <Eye className="size-[15px]" />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];
}
