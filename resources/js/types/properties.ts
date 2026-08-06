export type PropertyPhoto = { id: number; name: string; url: string };

export type UnitsSummary = { total: number; vacant: number; occupied: number };

export type PriceRange = { low: string | null; high: string | null };

export type PropertyRow = {
    id: number;
    code: string | null;
    name: string;
    type: string;
    type_label: string;
    address: string;
    landlord_id: number;
    landlord_name: string | null;
    units_count: number;
    units_summary: UnitsSummary;
    price_range: PriceRange;
    photo_url: string | null;
    created_at: string | null;
};
