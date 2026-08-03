import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Users/{Invite,Update}UserRequest.php. `status`
 * is only actually required on edit (create always starts a user as
 * Invited server-side) — the form only renders it when editing, so it's
 * left optional here rather than branching the schema by mode. The
 * `landlord_*` fields apply to any user (see UserController), the form
 * just only shows them for the Landlord role.
 */
export const userSchema = z.object({
    name: z.string().trim().min(1, 'Name is required.').max(255),
    email: z
        .string()
        .trim()
        .min(1, 'Email is required.')
        .email('Enter a valid email address.')
        .max(255),
    role: z.string().min(1, 'Role is required.'),
    status: z.string().optional(),
    landlord_id_number: z.string().max(255).optional().nullable(),
    landlord_address: z.string().max(255).optional().nullable(),
    landlord_notes: z.string().max(2000).optional().nullable(),
    landlord_id_document: z.instanceof(File).optional().nullable(),
    landlord_id_document_remove: z.boolean().optional(),
});

export type UserFormValues = z.infer<typeof userSchema>;
