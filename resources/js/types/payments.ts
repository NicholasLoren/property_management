export type PaymentReceipt = { name: string; url: string };

export type PaymentRow = {
    id: number;
    unit_name: string | null;
    property_name: string | null;
    tenant_name: string | null;
    amount: string;
    payment_date: string;
    method_label: string;
    status: string;
    status_label: string;
};
