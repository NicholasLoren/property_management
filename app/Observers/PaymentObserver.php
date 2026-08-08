<?php

namespace App\Observers;

use App\Enums\PaymentScheduleStatus;
use App\Models\Payment;
use App\Models\PaymentSchedule;

class PaymentObserver
{
    /**
     * A schedule row's status is derived from the payments recorded
     * against it, not edited independently — settled once the sum of its
     * payments reaches the expected amount, partial otherwise. Mirrors
     * how LeaseObserver derives Unit occupancy from its leases.
     */
    public function saved(Payment $payment): void
    {
        $this->syncScheduleById($payment->payment_schedule_id);

        // Editing a payment can move it to a different rent period — the
        // period it left behind needs its status recomputed too, or it's
        // left showing paid/partial for a payment that's no longer theirs.
        $previousScheduleId = $payment->getOriginal('payment_schedule_id');

        if ($previousScheduleId !== null && $previousScheduleId !== $payment->payment_schedule_id) {
            $this->syncScheduleById($previousScheduleId);
        }
    }

    public function deleted(Payment $payment): void
    {
        $this->syncScheduleById($payment->payment_schedule_id);
    }

    public function restored(Payment $payment): void
    {
        $this->syncScheduleById($payment->payment_schedule_id);
    }

    /**
     * Always re-queries by ID rather than trusting `$payment->paymentSchedule`
     * — that relation can be stale-cached from before `payment_schedule_id`
     * changed, when the same Payment instance is reused across a save.
     */
    private function syncScheduleById(?int $scheduleId): void
    {
        if ($scheduleId === null) {
            return;
        }

        $schedule = PaymentSchedule::query()->whereKey($scheduleId)->first();

        if ($schedule === null || in_array($schedule->status, [PaymentScheduleStatus::Voided, PaymentScheduleStatus::WrittenOff], true)) {
            return;
        }

        $paid = $schedule->payments()->sum('amount');

        $status = match (true) {
            $paid <= 0 => PaymentScheduleStatus::Pending,
            $paid < $schedule->amount_expected => PaymentScheduleStatus::Partial,
            default => PaymentScheduleStatus::Paid,
        };

        if ($status !== $schedule->status) {
            $schedule->update(['status' => $status]);
        }
    }
}
