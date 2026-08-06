export type TenantDocument = { name: string; url: string };

export type TenantActiveLease = {
    id: number;
    unit_name: string | null;
    property_name: string | null;
};

export type TenantRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    active_lease: TenantActiveLease | null;
    created_at: string | null;
};
