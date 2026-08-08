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
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
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
#[Fillable(['unit_id', 'start_date', 'end_date', 'rent_amount', 'billing_period', 'billing_day', 'custom_interval_months', 'security_deposit', 'status', 'notes'])]
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
            'billing_day' => 'integer',
            'custom_interval_months' => 'integer',
            'security_deposit' => 'decimal:2',
            'status' => LeaseStatus::class,
        ];
    }

    /**
     * The number of months each billing cycle spans, regardless of which
     * `billing_period` preset (or custom interval) is in use — the single
     * place schedule generation reads cadence from.
     */
    public function billingIntervalMonths(): int
    {
        return match ($this->billing_period) {
            BillingPeriod::Monthly => 1,
            BillingPeriod::Quarterly => 3,
            BillingPeriod::Yearly => 12,
            BillingPeriod::Custom => $this->custom_interval_months,
        };
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

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return HasMany<PaymentSchedule, $this>
     */
    public function paymentSchedules(): HasMany
    {
        return $this->hasMany(PaymentSchedule::class);
    }

    /**
     * @return MorphMany<Document, $this>
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
