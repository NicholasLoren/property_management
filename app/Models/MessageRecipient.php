<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Carbon;

/**
 * Pivot for message_recipients — a typed class instead of the generic Pivot
 * mainly so `read_at` is a known property to static analysis and IDEs.
 *
 * @property int $message_id
 * @property int $user_id
 * @property Carbon|null $read_at
 */
class MessageRecipient extends Pivot
{
    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }
}
