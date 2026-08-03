<?php

namespace App\Models;

use App\Enums\MessageType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Not deletable — see routes/messages.php, which has no destroy route at
 * all. Both personal messages and broadcasts use the same shape: a
 * broadcast is just a message with many recipient rows inserted at once.
 *
 * @property int $id
 * @property int|null $sender_id
 * @property MessageType $type
 * @property string $subject
 * @property string $body
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read MessageRecipient|null $pivot
 */
#[Fillable(['sender_id', 'type', 'subject', 'body'])]
class Message extends Model
{
    use LogsActivity;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MessageType::class,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<User, $this, MessageRecipient, 'pivot'>
     */
    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'message_recipients')
            ->using(MessageRecipient::class)
            ->withPivot('read_at')
            ->withTimestamps();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['type', 'subject'])
            ->useLogName('message')
            ->setDescriptionForEvent(fn (string $eventName): string => $eventName === 'created'
                ? "Sent a {$this->type->value} message: \"{$this->subject}\""
                : "Message \"{$this->subject}\" was {$eventName}");
    }
}
