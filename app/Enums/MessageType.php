<?php

namespace App\Enums;

enum MessageType: string
{
    case Personal = 'personal';
    case Broadcast = 'broadcast';

    public function label(): string
    {
        return match ($this) {
            self::Personal => 'Personal',
            self::Broadcast => 'Broadcast',
        };
    }
}
