import { Head, Link, usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import expenses from '@/routes/expenses';
import maintenance from '@/routes/maintenance';
import type { MaintenancePhoto } from '@/types/maintenance';

type MaintenanceShowRow = {
    id: number;
    title: string;
    description: string | null;
    unit: { id: number; name: string; property_name: string | null } | null;
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

export default function MaintenanceShow({ maintenanceRequest }: PageProps) {
    const { currency } = usePage().props;
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
                    <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline">
                            {maintenanceRequest.priority_label}
                        </Badge>
                        <Badge variant="outline">
                            {maintenanceRequest.status_label}
                        </Badge>
                        <span className="text-[13px] text-text-secondary">
                            {maintenanceRequest.unit?.name} —{' '}
                            {maintenanceRequest.unit?.property_name}
                        </span>
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

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Details
                    </h2>
                    <p className="text-sm text-text-secondary">
                        {maintenanceRequest.description ?? 'No description provided.'}
                    </p>

                    {maintenanceRequest.notes && (
                        <p className="mt-3 border-t border-border-soft pt-3 text-sm text-text-secondary">
                            {maintenanceRequest.notes}
                        </p>
                    )}

                    {maintenanceRequest.photos.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-soft pt-4 sm:grid-cols-4">
                            {maintenanceRequest.photos.map((photo) => (
                                <a
                                    key={photo.id}
                                    href={photo.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block aspect-square overflow-hidden rounded-lg border border-border-soft"
                                >
                                    <img
                                        src={photo.url}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Summary
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Assigned to</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.assigned_to_name ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Scheduled</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.scheduled_date ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Completed</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.completed_at ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Cost</dt>
                            <dd className="text-right font-medium">
                                {maintenanceRequest.cost
                                    ? formatCurrency(maintenanceRequest.cost, currency)
                                    : '–'}
                            </dd>
                        </div>
                    </dl>

                    {maintenanceRequest.linked_expense_id && can('expenses.view') && (
                        <Link
                            href={expenses.edit(maintenanceRequest.linked_expense_id)}
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
