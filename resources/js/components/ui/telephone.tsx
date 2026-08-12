import { PhoneInput } from '@/components/ui/phone-input';
import { DEFAULT_PHONE_COUNTRY } from '@/lib/phone';

type TelephoneProps = {
    /** Placed on the national-number input, so `focusFirstError` finds it. */
    id: string;
    /** The single stored E.164 string (or partial/invalid value on submit). */
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
};

export function Telephone({
    id,
    value,
    onChange,
    placeholder,
    disabled,
}: TelephoneProps) {
    return (
        <PhoneInput
            id={id}
            defaultCountry={DEFAULT_PHONE_COUNTRY}
            value={value ?? undefined}
            onChange={(next) => onChange(next ?? '')}
            placeholder={placeholder}
            disabled={disabled}
        />
    );
}
