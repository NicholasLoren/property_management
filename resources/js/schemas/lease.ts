import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Leases/{Store,Update}LeaseRequest.php. `unit_id`
 * is required for a new lease and read-only (but still present) when
 * editing one — a lease's unit never changes after creation.
 */
export const leaseSchema = z.object({
    unit_id: z.string().trim().min(1, 'Unit is required.'),
    tenant_ids: z.array(z.number().int().positive()).min(1, 'Add at least one tenant.'),
    start_date: z.string().trim().min(1, 'Start date is required.'),
    end_date: z.string().trim().min(1, 'End date is required.'),
    rent_amount: z
        .string()
        .trim()
        .min(1, 'Rent amount is required.')
        .refine(
            (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
            'Enter a valid amount.',
        ),
    billing_period: z.enum(['monthly', 'quarterly', 'yearly']),
    security_deposit: z
        .string()
        .optional()
        .nullable()
        .refine(
            (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
            'Enter a valid amount.',
        ),
    status: z.enum(['draft', 'active', 'ended', 'terminated']),
    notes: z.string().max(5000).optional().nullable(),
    document: z.instanceof(File).optional().nullable(),
    document_remove: z.boolean().optional(),
});

export type LeaseFormValues = z.infer<typeof leaseSchema>;
