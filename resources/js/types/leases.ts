export type LeaseDocument = { name: string; url: string };

export type LeaseRow = {
    id: number;
    unit_name: string | null;
    property_name: string | null;
    tenant_names: string[];
    status: string;
    status_label: string;
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
};
