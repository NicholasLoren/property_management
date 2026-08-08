<?php

namespace App\Models;

use App\Enums\LeaseStatus;
use App\Enums\UnitStatus;
use Database\Factories\UnitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * The one rentable entity in the data model — a `standalone` Property
 * (see Property) has exactly one Unit representing the whole house, hidden
 * from the Units list in the UI; a `multi_unit` Property has many.
 *
 * @property int $id
 * @property string|null $code
 * @property int $property_id
 * @property int|null $unit_type_id
 * @property string $name
 * @property string|null $size
 * @property UnitStatus $status
 * @property string|null $notes
 * @property Carbon|null $deleted_at
 * @property int|null $deleted_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read UnitFeatureUnit|null $pivot
 */
#[Fillable(['code', 'property_id', 'unit_type_id', 'name', 'size', 'status', 'notes'])]
class Unit extends Model implements HasMedia
{
    /** @use HasFactory<UnitFactory> */
    use HasFactory, InteractsWithMedia, LogsActivity, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => UnitStatus::class,
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'status'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('unit')
            ->setDescriptionForEvent(fn (string $eventName): string => "Unit \"{$this->name}\" was {$eventName}");
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<UnitType, $this>
     */
    public function unitType(): BelongsTo
    {
        return $this->belongsTo(UnitType::class);
    }

    /**
     * The user who moved this unit to trash.
     *
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * @return HasMany<UnitPrice, $this>
     */
    public function prices(): HasMany
    {
        return $this->hasMany(UnitPrice::class);
    }

    /**
     * @return HasOne<UnitPrice, $this>
     */
    public function currentPrice(): HasOne
    {
        return $this->hasOne(UnitPrice::class)->whereNull('effective_to');
    }

    /**
     * @return BelongsToMany<UnitFeature, $this, UnitFeatureUnit, 'pivot'>
     */
    public function features(): BelongsToMany
    {
        return $this->belongsToMany(UnitFeature::class, 'unit_feature_unit')
            ->using(UnitFeatureUnit::class)
            ->withPivot('quantity');
    }

    /**
     * @return HasMany<Lease, $this>
     */
    public function leases(): HasMany
    {
        return $this->hasMany(Lease::class);
    }

    /**
     * @return HasOne<Lease, $this>
     */
    public function currentLease(): HasOne
    {
        return $this->hasOne(Lease::class)->where('status', LeaseStatus::Active);
    }

    /**
     * @return HasMany<MaintenanceRequest, $this>
     */
    public function maintenanceRequests(): HasMany
    {
        return $this->hasMany(MaintenanceRequest::class);
    }

    /**
     * @return MorphMany<Document, $this>
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
