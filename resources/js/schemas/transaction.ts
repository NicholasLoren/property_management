import { z } from 'zod';

/**
 * Shared shape for Expenses and Income — mirrors
 * app/Http/Requests/{Expenses,Incomes}/{Store,Update}*Request.php, which
 * differ only in which Category `type` they validate `category_id` against
 * (checked client-side by the category picker's option list, not this
 * schema).
 */
export const transactionSchema = z.object({
    property_id: z.string().trim().min(1, 'Property is required.'),
    category_id: z.string().trim().min(1, 'Category is required.'),
    amount: z
        .string()
        .trim()
        .min(1, 'Amount is required.')
        .refine(
            (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
            'Enter a valid amount.',
        ),
    transaction_date: z.string().trim().min(1, 'Date is required.'),
    description: z.string().max(5000).optional().nullable(),
    receipt: z.instanceof(File).optional().nullable(),
    receipt_remove: z.boolean().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
