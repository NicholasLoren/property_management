import { z } from 'zod';

/**
 * Mirrors app/Http/Requests/Payments/{Store,Update}PaymentRequest.php.
 */
const paymentBaseFields = {
    lease_id: z.string().trim().min(1, 'Lease is required.'),
    tenant_id: z.string().optional().nullable(),
    amount: z
        .string()
        .trim()
        .min(1, 'Amount is required.')
        .refine(
            (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
            'Enter a valid amount.',
        ),
    payment_date: z.string().trim().min(1, 'Payment date is required.'),
    method: z.enum([
        'cash',
        'bank_transfer',
        'mobile_money',
        'cheque',
        'other',
    ]),
    status: z.enum(['completed', 'refunded', 'failed']),
    reference: z.string().max(255).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    receipt: z.instanceof(File).optional().nullable(),
    receipt_remove: z.boolean().optional(),
};

/** Recording a new payment can settle several rent periods at once. */
export const paymentCreateSchema = z.object({
    ...paymentBaseFields,
    payment_schedule_ids: z
        .array(z.string())
        .min(1, 'Select at least one rent period.'),
});

/** Editing an existing payment still ties it to exactly one period. */
export const paymentEditSchema = z.object({
    ...paymentBaseFields,
    payment_schedule_id: z.string().trim().min(1, 'Select a rent period.'),
});

export type PaymentCreateFormValues = z.infer<typeof paymentCreateSchema>;
export type PaymentEditFormValues = z.infer<typeof paymentEditSchema>;
