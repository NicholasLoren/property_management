import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Properties/{Store,Update}PropertyRequest.php.
 */
export const propertySchema = z.object({
    landlord_id: z.string().trim().min(1, 'Landlord is required.'),
    name: z.string().trim().min(1, 'Name is required.').max(255),
    type: z.enum(['standalone', 'multi_unit']),
    address: z.string().trim().min(1, 'Address is required.').max(255),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    amenity_ids: z.array(z.number().int().positive()),
    photos: z.array(z.instanceof(File)),
    remove_photo_ids: z.array(z.number().int().positive()),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;
