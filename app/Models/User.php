<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property UserStatus $status
 * @property Carbon|null $last_active_at
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int, Role> $roles
 * @property-read MessageRecipient|null $pivot
 */
#[Fillable(['name', 'email', 'password', 'status'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements HasMedia
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, InteractsWithMedia, LogsActivity, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'status'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('user')
            ->setDescriptionForEvent(fn (string $eventName): string => "User \"{$this->name}\" was {$eventName}");
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('avatar')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'last_active_at' => 'datetime',
            'status' => UserStatus::class,
        ];
    }

    /**
     * The user who moved this account to trash.
     *
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * @return HasOne<LandlordDetail, $this>
     */
    public function landlordDetail(): HasOne
    {
        return $this->hasOne(LandlordDetail::class);
    }

    /**
     * @return HasMany<Property, $this>
     */
    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'landlord_id');
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    /**
     * @return BelongsToMany<Message, $this, MessageRecipient, 'pivot'>
     */
    public function receivedMessages(): BelongsToMany
    {
        return $this->belongsToMany(Message::class, 'message_recipients')
            ->using(MessageRecipient::class)
            ->withPivot('read_at')
            ->withTimestamps();
    }

    public function unreadMessagesCount(): int
    {
        return $this->receivedMessages()->wherePivotNull('read_at')->count();
    }
}
