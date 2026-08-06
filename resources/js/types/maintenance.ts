export type MaintenancePhoto = { id: number; name: string; url: string };

export type MaintenanceRow = {
    id: number;
    title: string;
    unit_name: string | null;
    property_name: string | null;
    priority: string;
    priority_label: string;
    status: string;
    status_label: string;
    assigned_to_name: string | null;
    cost: string | null;
    scheduled_date: string | null;
    created_at: string | null;
};
