import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Extras/{Store,Update}CategoryRequest.php and
 * ...AmenityRequest.php — both are just a required unique `name`.
 */
export const nameOnlySchema = z.object({
    name: z.string().trim().min(1, 'Name is required.').max(255),
});

/**
 * Mirrors app/Http/Requests/Extras/{Store,Update}UnitTypeRequest.php.
 */
export const unitTypeSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Name is required.')
        .max(255)
        .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only.'),
    label: z.string().trim().min(1, 'Label is required.').max(255),
});

export type NameOnlyFormValues = z.infer<typeof nameOnlySchema>;
export type UnitTypeFormValues = z.infer<typeof unitTypeSchema>;
