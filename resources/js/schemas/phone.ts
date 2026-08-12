import { z } from 'zod';
import { isValidPhone } from '@/lib/phone';

/**
 * Mirrors app/Rules/Phone.php — both sides accept an empty value (presence
 * is enforced separately per-field where required) but reject a non-empty
 * value that doesn't parse to a valid number, matching what the Telephone
 * component itself already stores.
 */
export const phoneField = z
    .string()
    .trim()
    .max(32)
    .refine(isValidPhone, 'Enter a valid phone number.')
    .optional()
    .nullable();

export const requiredPhoneField = z
    .string()
    .trim()
    .min(1, 'Phone number is required.')
    .max(32)
    .refine(isValidPhone, 'Enter a valid phone number.');
