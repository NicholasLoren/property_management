export type DocumentFile = { name: string; url: string };

export type DocumentRow = {
    id: number;
    code: string | null;
    title: string;
    category: string;
    category_label: string;
    documentable_type: string;
    documentable_label: string | null;
    uploaded_by_name: string | null;
    file: DocumentFile | null;
    created_at: string | null;
};
