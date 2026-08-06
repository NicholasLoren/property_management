<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Completed = 'completed';
    case Refunded = 'refunded';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Completed => 'Completed',
            self::Refunded => 'Refunded',
            self::Failed => 'Failed',
        };
    }
}
