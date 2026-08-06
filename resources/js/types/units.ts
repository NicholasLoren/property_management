export type UnitPhoto = { id: number; name: string; url: string };

export type UnitCurrentPrice = {
    amount: string;
    billing_period_label: string;
};

export type UnitRow = {
    id: number;
    name: string;
    unit_type_label: string | null;
    size: string | null;
    status: string;
    status_label: string;
    current_price: UnitCurrentPrice | null;
    features_count: number;
    photo_url: string | null;
    created_at: string | null;
};

export type UnitWithPropertyRow = UnitRow & {
    property: { id: number; name: string } | null;
};
