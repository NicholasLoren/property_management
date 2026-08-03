import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Messages/StoreMessageRequest.php. The
 * `recipient_*` fields are conditionally required server-side
 * (`required_if`) depending on `type`/`recipient_scope` — the form only
 * shows the relevant fields per type, and the server enforces the rest.
 */
export const messageSchema = z.object({
    type: z.enum(['personal', 'broadcast']),
    subject: z
        .string()
        .trim()
        .min(1, 'Subject is required.')
        .max(255, 'Subject must be 255 characters or fewer.'),
    body: z
        .string()
        .trim()
        .min(1, 'Message is required.')
        .max(5000, 'Message must be 5000 characters or fewer.'),
    recipient_user_id: z.number().int().positive().optional().nullable(),
    recipient_scope: z.enum(['all', 'role']).optional().nullable(),
    recipient_role: z.string().min(1).optional().nullable(),
});

export type MessageFormValues = z.infer<typeof messageSchema>;
