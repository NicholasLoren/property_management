import { AlertTriangle, Bell, CalendarClock } from 'lucide-react';
import type { ComponentType } from 'react';

export type NotificationRow = {
    id: string;
    type: string;
    data: Record<string, unknown>;
    url: string | null;
    read_at: string | null;
    created_at: string | null;
};

const iconByType: Record<string, ComponentType<{ className?: string }>> = {
    rent_due_soon: CalendarClock,
    rent_overdue: AlertTriangle,
};

export function describeNotification(
    row: NotificationRow,
    currency: string,
): { icon: ComponentType<{ className?: string }>; message: string } {
    const kind = String(row.data.type ?? '');
    const unitLabel = String(row.data.unit_label ?? 'a unit');
    const amount = row.data.amount_expected
        ? `${currency} ${Number(row.data.amount_expected).toLocaleString()}`
        : null;

    if (kind === 'rent_due_soon') {
        return {
            icon: iconByType.rent_due_soon,
            message: amount
                ? `Rent of ${amount} for ${unitLabel} is due soon.`
                : `Rent for ${unitLabel} is due soon.`,
        };
    }

    if (kind === 'rent_overdue') {
        return {
            icon: iconByType.rent_overdue,
            message: amount
                ? `Rent of ${amount} for ${unitLabel} is overdue.`
                : `Rent for ${unitLabel} is overdue.`,
        };
    }

    return { icon: Bell, message: row.type };
}
