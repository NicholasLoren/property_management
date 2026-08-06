import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Tenants/{Store,Update}TenantRequest.php.
 */
export const tenantSchema = z.object({
    name: z.string().trim().min(1, 'Name is required.').max(255),
    email: z
        .string()
        .trim()
        .email('Enter a valid email.')
        .max(255)
        .optional()
        .nullable()
        .or(z.literal('')),
    phone: z.string().max(50).optional().nullable(),
    id_number: z.string().max(255).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    id_document: z.instanceof(File).optional().nullable(),
    id_document_remove: z.boolean().optional(),
});

export type TenantFormValues = z.infer<typeof tenantSchema>;
