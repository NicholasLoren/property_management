import { z } from 'zod';

/**
 * Each schema mirrors its app/Http/Requests/Settings/Update*SettingsRequest.php
 * counterpart so the client rejects the same input the server would.
 */
export const generalSettingsSchema = z.object({
    company_name: z
        .string()
        .trim()
        .min(1, 'Company name is required.')
        .max(255),
    support_email: z
        .string()
        .trim()
        .min(1, 'Support email is required.')
        .email('Enter a valid email address.')
        .max(255),
    default_currency: z
        .string()
        .trim()
        .length(3, 'Use a 3-letter currency code, e.g. UGX.')
        .toUpperCase(),
    timezone: z.string().min(1, 'Timezone is required.'),
    trash_retention_days: z.number().int().min(1).max(365),
});

export const brandingSettingsSchema = z.object({
    pdf_header_text: z
        .string()
        .trim()
        .min(1, 'Header text is required.')
        .max(255),
    accent_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color, e.g. #1F6F60.'),
    logo: z.instanceof(File).optional().nullable(),
    logo_remove: z.boolean().optional(),
});

export const SENDER_ID_MAX_LENGTH = 11;

export const smsSettingsSchema = z.object({
    enabled: z.boolean(),
    africastalking_username: z.string().trim().max(255).optional(),
    africastalking_api_key: z.string().max(255).optional(),
    sender_id: z.string().trim().max(SENDER_ID_MAX_LENGTH).optional(),
    sandbox: z.boolean(),
});

export const notificationSettingsSchema = z.object({
    email_enabled: z.boolean(),
    sms_enabled: z.boolean(),
});

export const testSmsSchema = z.object({
    phone: z.string().trim().min(1, 'Phone number is required.').max(20),
});
