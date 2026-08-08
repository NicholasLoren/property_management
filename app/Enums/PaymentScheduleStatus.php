<?php

namespace App\Enums;

enum PaymentScheduleStatus: string
{
    case Pending = 'pending';
    case Partial = 'partial';
    case Paid = 'paid';
    case Voided = 'voided';
    case WrittenOff = 'written_off';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Partial => 'Partial',
            self::Paid => 'Paid',
            self::Voided => 'Voided',
            self::WrittenOff => 'Written off',
        };
    }
}
