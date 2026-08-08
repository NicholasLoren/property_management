import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Units/{Store,Update}UnitRequest.php. Price is
 * required here even though UpdateUnitRequest allows it to be omitted —
 * every unit the form touches should end up with a price, including the
 * hidden implicit unit behind a standalone Property (created without one).
 */
export const unitSchema = z.object({
    unit_type_id: z.string().optional().nullable(),
    name: z.string().trim().min(1, 'Name is required.').max(255),
    size: z.string().max(255).optional().nullable(),
    status: z.enum(['vacant', 'occupied']),
    notes: z.string().max(5000).optional().nullable(),
    price_amount: z
        .string()
        .trim()
        .min(1, 'Price is required.')
        .refine(
            (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
            'Enter a valid amount.',
        ),
    price_billing_period: z.enum(['monthly', 'quarterly', 'yearly']),
    features: z.array(
        z.object({
            unit_feature_id: z.number().int().positive(),
            quantity: z.number().int().min(1),
        }),
    ),
    photos: z.array(z.instanceof(File)),
    remove_photo_ids: z.array(z.number().int().positive()),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
