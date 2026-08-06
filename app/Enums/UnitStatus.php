<?php

namespace App\Enums;

enum UnitStatus: string
{
    case Vacant = 'vacant';
    case Occupied = 'occupied';

    public function label(): string
    {
        return match ($this) {
            self::Vacant => 'Vacant',
            self::Occupied => 'Occupied',
        };
    }
}
