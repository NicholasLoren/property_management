import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Maintenance/{Store,Update}MaintenanceRequestRequest.php.
 */
export const maintenanceSchema = z.object({
    unit_id: z.string().trim().min(1, 'Unit is required.'),
    title: z.string().trim().min(1, 'Title is required.').max(255),
    description: z.string().max(5000).optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']),
    assigned_to: z.string().optional().nullable(),
    cost: z
        .string()
        .optional()
        .nullable()
        .refine(
            (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
            'Enter a valid amount.',
        ),
    scheduled_date: z.string().optional().nullable(),
    completed_at: z.string().optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    photos: z.array(z.instanceof(File)),
    remove_photo_ids: z.array(z.number().int().positive()),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
