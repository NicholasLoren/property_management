<?php

namespace App\Models;

use App\Enums\PaymentScheduleStatus;
use Database\Factories\PaymentScheduleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One expected billing period for a Lease, generated ahead of time from its
 * `billing_period`/`billing_day` — the source of truth for "is this lease
 * current" that a bare Payment log (just a date, no period) can't answer.
 * `status` never stores "overdue": that's derived (see `scopeOverdue`) so
 * nothing can forget to flip it back once a late payment lands.
 *
 * @property int $id
 * @property int $lease_id
 * @property Carbon $period_start
 * @property Carbon $period_end
 * @property string $amount_expected
 * @property PaymentScheduleStatus $status
 * @property Carbon|null $last_due_reminder_sent_at
 * @property Carbon|null $last_overdue_reminder_sent_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['lease_id', 'period_start', 'period_end', 'amount_expected', 'status'])]
class PaymentSchedule extends Model
{
    /** @use HasFactory<PaymentScheduleFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'amount_expected' => 'decimal:2',
            'status' => PaymentScheduleStatus::class,
            'last_due_reminder_sent_at' => 'datetime',
            'last_overdue_reminder_sent_at' => 'datetime',
        ];
    }

    /**
     * Unpaid (or partially paid) periods whose due date has already passed.
     *
     * @param  Builder<PaymentSchedule>  $query
     * @return Builder<PaymentSchedule>
     */
    public function scopeOverdue(Builder $query): Builder
    {
        return $query
            ->whereIn('payment_schedules.status', [PaymentScheduleStatus::Pending->value, PaymentScheduleStatus::Partial->value])
            ->whereDate('payment_schedules.period_start', '<', now()->toDateString());
    }

    /**
     * @return BelongsTo<Lease, $this>
     */
    public function lease(): BelongsTo
    {
        return $this->belongsTo(Lease::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
