import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import type { CountryCode } from 'libphonenumber-js/min';

export type { CountryCode };

// The app is Uganda-based, so default the Telephone component to Uganda
// rather than an arbitrary/alphabetical first country.
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'UG';

export function isValidPhone(value: string | null | undefined): boolean {
    if (!value) {
        return true;
    }

    return parsePhoneNumberFromString(value)?.isValid() ?? false;
}
