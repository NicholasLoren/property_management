export type TransactionReceipt = { name: string; url: string };

export type ExpenseRow = {
    id: number;
    code: string | null;
    property_name: string | null;
    category: string;
    category_label: string;
    amount: string;
    transaction_date: string;
    description: string | null;
    is_from_maintenance: boolean;
};

export type IncomeRow = {
    id: number;
    code: string | null;
    property_name: string | null;
    category: string;
    category_label: string;
    amount: string;
    transaction_date: string;
    description: string | null;
};
