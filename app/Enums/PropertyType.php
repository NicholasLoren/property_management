<?php

namespace App\Enums;

enum PropertyType: string
{
    case Standalone = 'standalone';
    case MultiUnit = 'multi_unit';

    public function label(): string
    {
        return match ($this) {
            self::Standalone => 'Standalone',
            self::MultiUnit => 'Multi-Unit',
        };
    }
}
