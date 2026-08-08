import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    CheckCircle2,
    Pencil,
    UserRound,
    Wallet,
    Wrench,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhotoGrid } from '@/components/ui/photo-grid';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import expenses from '@/routes/expenses';
import maintenance from '@/routes/maintenance';
import units from '@/routes/units';
import type { MaintenancePhoto } from '@/types/maintenance';

type MaintenanceShowRow = {
    id: number;
    title: string;
    description: string | null;
    unit: {
        id: number;
        name: string;
        property_id: number | null;
        property_name: string | null;
    } | null;
    priority: string;
    priority_label: string;
    status: string;
    status_label: string;
    assigned_to_name: string | null;
    cost: string | null;
    scheduled_date: string | null;
    completed_at: string | null;
    notes: string | null;
    linked_expense_id: number | null;
    photos: MaintenancePhoto[];
    created_at: string | null;
};

type PageProps = { maintenanceRequest: MaintenanceShowRow };

const PRIORITY_CLASS: Record<string, string> = {
    low: 'bg-secondary text-text-secondary',
    medium: 'bg-accent-soft text-accent-strong',
    high: 'bg-warning-soft text-warning',
    urgent: 'bg-destructive/10 text-destructive',
};

const STATUS_CLASS: Record<string, string> = {
    open: 'bg-warning-soft text-warning',
    in_progress: 'bg-accent-soft text-accent-strong',
    completed: 'bg-success-soft text-success',
    cancelled: 'bg-secondary text-text-secondary',
};

function StatTile({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-border-soft p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <Icon className="size-4" />
            </span>
            <div>
                <div className="text-xs text-text-tertiary">{label}</div>
                <div className="text-[13px] font-semibold text-foreground">
                    {value}
                </div>
            </div>
        </div>
    );
}

export default function MaintenanceShow({ maintenanceRequest }: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();

    return (
        <>
            <Head title={maintenanceRequest.title} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Maintenance', href: maintenance.index() },
                        {
                            title: maintenanceRequest.title,
                            href: maintenance.show(maintenanceRequest),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {maintenanceRequest.title}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                            className={
                                PRIORITY_CLASS[maintenanceRequest.priority]
                            }
                        >
                            {maintenanceRequest.priority_label}
                        </Badge>
                        <Badge
                            className={STATUS_CLASS[maintenanceRequest.status]}
                        >
                            {maintenanceRequest.status_label}
                        </Badge>
                        {maintenanceRequest.unit && (
                            <Link
                                href={
                                    maintenanceRequest.unit.property_id
                                        ? units.show([
                                              maintenanceRequest.unit
                                                  .property_id,
                                              maintenanceRequest.unit.id,
                                          ])
                                        : '#'
                                }
                                className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-accent-strong hover:underline"
                            >
                                <Building2 className="size-3.5" />
                                {maintenanceRequest.unit.name} —{' '}
                                {maintenanceRequest.unit.property_name}
                            </Link>
                        )}
                    </div>
                </div>
                {can('maintenance.edit') && (
                    <Button variant="outline" asChild>
                        <Link href={maintenance.edit(maintenanceRequest)}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
                <StatTile
                    icon={UserRound}
                    label="Assigned to"
                    value={maintenanceRequest.assigned_to_name ?? 'Unassigned'}
                />
                <StatTile
                    icon={Calendar}
                    label="Scheduled"
                    value={formatDate(
                        maintenanceRequest.scheduled_date,
                        timezone,
                    )}
                />
                <StatTile
                    icon={CheckCircle2}
                    label="Completed"
                    value={formatDate(
                        maintenanceRequest.completed_at,
                        timezone,
                    )}
                />
                <StatTile
                    icon={Wallet}
                    label="Cost"
                    value={
                        maintenanceRequest.cost
                            ? formatCurrency(maintenanceRequest.cost, currency)
                            : '–'
                    }
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                        <Wrench className="size-[15px]" />
                        Description
                    </h2>
                    <p className="text-sm whitespace-pre-line text-text-secondary">
                        {maintenanceRequest.description ??
                            'No description provided.'}
                    </p>

                    {maintenanceRequest.notes && (
                        <div className="mt-4 border-t border-border-soft pt-4">
                            <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                Notes
                            </p>
                            <p className="text-sm whitespace-pre-line text-text-secondary">
                                {maintenanceRequest.notes}
                            </p>
                        </div>
                    )}

                    {maintenanceRequest.photos.length > 0 && (
                        <div className="mt-4 border-t border-border-soft pt-4">
                            <p className="mb-2.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                Photos
                            </p>
                            <PhotoGrid photos={maintenanceRequest.photos} />
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Summary
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Priority</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.priority_label}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Status</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.status_label}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Assigned to</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.assigned_to_name ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Scheduled</dt>
                            <dd className="text-right font-medium">
                                {formatDate(
                                    maintenanceRequest.scheduled_date,
                                    timezone,
                                )}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Completed</dt>
                            <dd className="text-right font-medium">
                                {formatDate(
                                    maintenanceRequest.completed_at,
                                    timezone,
                                )}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Cost</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.cost
                                    ? formatCurrency(
                                          maintenanceRequest.cost,
                                          currency,
                                      )
                                    : '–'}
                            </dd>
                        </div>
                    </dl>

                    {maintenanceRequest.linked_expense_id &&
                        can('expenses.view') && (
                            <Link
                                href={expenses.edit(
                                    maintenanceRequest.linked_expense_id,
                                )}
                                className="mt-3 block border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                            >
                                View linked expense →
                            </Link>
                        )}
                </div>
            </div>
        </>
    );
}
