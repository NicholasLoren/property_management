import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Documents/{Store,Update}DocumentRequest.php.
 */
export const documentSchema = z.object({
    documentable_type: z.enum(['property', 'unit', 'tenant', 'lease']),
    documentable_id: z.string().trim().min(1, 'Select a record to attach this to.'),
    title: z.string().trim().min(1, 'Title is required.').max(255),
    category_id: z.string().trim().min(1, 'Category is required.'),
    notes: z.string().max(5000).optional().nullable(),
    file: z.instanceof(File).optional().nullable(),
});

export type DocumentFormValues = z.infer<typeof documentSchema>;
