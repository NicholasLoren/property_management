<?php

namespace App\Models;

use App\Enums\BillingPeriod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Historical pricing for a Unit (SRS FR-3.5) — setting a new price closes
 * out the previous row (`effective_to`) rather than updating `amount` in
 * place, so past reports reflect the price at the time.
 *
 * @property int $id
 * @property int $unit_id
 * @property string $amount
 * @property BillingPeriod $billing_period
 * @property Carbon $effective_from
 * @property Carbon|null $effective_to
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['unit_id', 'amount', 'billing_period', 'effective_from', 'effective_to', 'created_by'])]
class UnitPrice extends Model
{
    use LogsActivity;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'billing_period' => BillingPeriod::class,
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['amount', 'billing_period', 'effective_from', 'effective_to'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('unit_price')
            ->setDescriptionForEvent(fn (string $eventName): string => "Price for unit #{$this->unit_id} was {$eventName}");
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
