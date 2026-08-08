<?php

namespace App\Observers;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Enums\UnitStatus;
use App\Models\Lease;
use App\Services\PaymentScheduleGenerator;

class LeaseObserver
{
    public function __construct(private readonly PaymentScheduleGenerator $schedules) {}

    /**
     * A Unit's status is derived from its leases, not edited independently:
     * it's Occupied while it has any Active lease, Vacant otherwise. This
     * keeps occupancy correct without a separate manual toggle to forget.
     */
    public function saved(Lease $lease): void
    {
        $this->syncUnitStatus($lease);

        // Idempotent — always resumes from whatever's already generated —
        // so it's safe to call on every save rather than only on the
        // Draft-to-Active transition.
        $this->schedules->generate($lease);

        $this->voidFutureScheduleOnEnd($lease);
    }

    public function deleted(Lease $lease): void
    {
        $this->syncUnitStatus($lease);
    }

    public function restored(Lease $lease): void
    {
        $this->syncUnitStatus($lease);
    }

    private function syncUnitStatus(Lease $lease): void
    {
        $unit = $lease->unit;

        if ($unit === null) {
            return;
        }

        $hasActiveLease = $unit->leases()->where('status', LeaseStatus::Active->value)->exists();

        $unit->update(['status' => $hasActiveLease ? UnitStatus::Occupied : UnitStatus::Vacant]);
    }

    /**
     * Once a lease ends, it no longer owes rent for periods after the move-
     * out date — void those. Periods already overdue *before* the end date
     * are left alone: that's rent genuinely owed for a period the tenant
     * did occupy, not something ending the lease should erase.
     */
    private function voidFutureScheduleOnEnd(Lease $lease): void
    {
        if (! in_array($lease->status, [LeaseStatus::Ended, LeaseStatus::Terminated], true)) {
            return;
        }

        $lease->paymentSchedules()
            ->whereIn('status', [PaymentScheduleStatus::Pending->value, PaymentScheduleStatus::Partial->value])
            ->where('period_start', '>', $lease->end_date)
            ->update(['status' => PaymentScheduleStatus::Voided->value]);
    }
}
