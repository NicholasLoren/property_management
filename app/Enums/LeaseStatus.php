<?php

namespace App\Enums;

enum LeaseStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Ended = 'ended';
    case Terminated = 'terminated';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active',
            self::Ended => 'Ended',
            self::Terminated => 'Terminated',
        };
    }
}
