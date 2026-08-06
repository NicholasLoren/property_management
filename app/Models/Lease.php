<?php

namespace App\Models;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Observers\LeaseObserver;
use Database\Factories\LeaseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * A tenancy agreement for one Unit. `unit_id` is set at creation and never
 * changed afterward (see LeaseObserver) — moving a tenancy to a different
 * unit means ending this lease and creating a new one there.
 *
 * @property int $id
 * @property int $unit_id
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property string $rent_amount
 * @property BillingPeriod $billing_period
 * @property string|null $security_deposit
 * @property LeaseStatus $status
 * @property string|null $notes
 * @property Carbon|null $deleted_at
 * @property int|null $deleted_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['unit_id', 'start_date', 'end_date', 'rent_amount', 'billing_period', 'security_deposit', 'status', 'notes'])]
#[ObservedBy(LeaseObserver::class)]
class Lease extends Model implements HasMedia
{
    /** @use HasFactory<LeaseFactory> */
    use HasFactory, InteractsWithMedia, LogsActivity, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'rent_amount' => 'decimal:2',
            'billing_period' => BillingPeriod::class,
            'security_deposit' => 'decimal:2',
            'status' => LeaseStatus::class,
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['unit_id', 'start_date', 'end_date', 'rent_amount', 'status'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('lease')
            ->setDescriptionForEvent(fn (string $eventName): string => "Lease #{$this->id} was {$eventName}");
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('document')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsToMany<Tenant, $this>
     */
    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'lease_tenant');
    }

    /**
     * The user who moved this lease to trash.
     *
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
