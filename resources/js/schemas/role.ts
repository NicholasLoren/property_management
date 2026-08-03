import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Roles/{Store,Update}RoleRequest.php so the
 * client rejects the same input the server would.
 */
export const ROLE_NAME_MAX_LENGTH = 255;
export const ROLE_DESCRIPTION_MAX_LENGTH = 1000;

export const roleSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Name is required.')
        .max(
            ROLE_NAME_MAX_LENGTH,
            `Name must be ${ROLE_NAME_MAX_LENGTH} characters or fewer.`,
        ),
    description: z
        .string()
        .max(
            ROLE_DESCRIPTION_MAX_LENGTH,
            `Description must be ${ROLE_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
        )
        .optional()
        .nullable(),
    permissions: z.array(z.number().int().positive()),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
