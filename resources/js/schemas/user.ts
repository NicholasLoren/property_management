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
    // Optional on both create (blank = email a set-password link) and edit
    // (blank = leave the current password unchanged). The match-confirmation
    // check and full strength policy are enforced server-side
    // (Password::default() + the `confirmed` rule) — kept out of this schema
    // since useInertiaZodForm requires a plain ZodObject, which rules out a
    // cross-field .refine() here.
    password: z
        .string()
        .optional()
        .refine(
            (value) => !value || value.length >= 8,
            'Password must be at least 8 characters.',
        ),
    password_confirmation: z.string().optional(),
    landlord_id_number: z.string().max(255).optional().nullable(),
    landlord_address: z.string().max(255).optional().nullable(),
    landlord_phone: z.string().max(32).optional().nullable(),
    landlord_notes: z.string().max(2000).optional().nullable(),
    landlord_id_document: z.instanceof(File).optional().nullable(),
    landlord_id_document_remove: z.boolean().optional(),
    avatar: z.instanceof(File).optional().nullable(),
    avatar_remove: z.boolean().optional(),
});

export type UserFormValues = z.infer<typeof userSchema>;
