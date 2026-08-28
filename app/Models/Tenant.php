<?php

namespace App\Models;

use App\Enums\IdentityDocumentType;
use App\Enums\PartyType;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * A renter of record. Deliberately not a User — tenants don't log in, so
 * this is a plain contact/profile record, mirroring LandlordDetail's shape
 * rather than the Landlord (User + role) pattern.
 *
 * @property int $id
 * @property string $name
 * @property PartyType $type
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $id_number
 * @property string|null $tin
 * @property IdentityDocumentType|null $id_document_type
 * @property string|null $address
 * @property string|null $notes
 * @property string|null $contact_person_name
 * @property string|null $contact_person_phone
 * @property string|null $contact_person_email
 * @property Carbon|null $deleted_at
 * @property int|null $deleted_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name', 'type', 'email', 'phone', 'id_number', 'tin', 'id_document_type',
    'address', 'notes', 'contact_person_name', 'contact_person_phone', 'contact_person_email',
])]
class Tenant extends Model implements HasMedia
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory, InteractsWithMedia, LogsActivity, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => PartyType::class,
            'id_document_type' => IdentityDocumentType::class,
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'type', 'email', 'phone'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('tenant')
            ->setDescriptionForEvent(fn (string $eventName): string => "Tenant \"{$this->name}\" was {$eventName}");
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('id_document')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

        $this->addMediaCollection('avatar')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * @return BelongsToMany<Lease, $this>
     */
    public function leases(): BelongsToMany
    {
        return $this->belongsToMany(Lease::class, 'lease_tenant');
    }

    /**
     * The user who moved this tenant to trash.
     *
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return MorphMany<Document, $this>
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
