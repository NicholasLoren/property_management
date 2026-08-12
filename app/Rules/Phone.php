<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use libphonenumber\NumberParseException;
use libphonenumber\PhoneNumberUtil;

/**
 * Validates that a stored phone value is a real, dialable number. Values are
 * expected in E.164 (leading "+" and country code, e.g. "+256701234567") —
 * the format the Telephone component always produces — so no default region
 * is needed to disambiguate a bare national number.
 */
class Phone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute must be a valid phone number.');

            return;
        }

        try {
            $number = PhoneNumberUtil::getInstance()->parse($value, null);
        } catch (NumberParseException) {
            $fail('The :attribute must be a valid phone number.');

            return;
        }

        if (! PhoneNumberUtil::getInstance()->isValidNumber($number)) {
            $fail('The :attribute must be a valid phone number.');
        }
    }
}
