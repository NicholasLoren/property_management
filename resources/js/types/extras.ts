export type ExtrasSection =
    | 'expense-categories'
    | 'income-categories'
    | 'document-categories'
    | 'property-features'
    | 'unit-types';

export type ExtrasItemRow = {
    id: number;
    name: string;
    label?: string;
    usage_count: number;
    deleted_at: string | null;
    deleted_by_name: string | null;
};
