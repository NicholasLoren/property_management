<?php

namespace App\Observers;

use App\Enums\LeaseStatus;
use App\Enums\UnitStatus;
use App\Models\Lease;

class LeaseObserver
{
    /**
     * A Unit's status is derived from its leases, not edited independently:
     * it's Occupied while it has any Active lease, Vacant otherwise. This
     * keeps occupancy correct without a separate manual toggle to forget.
     */
    public function saved(Lease $lease): void
    {
        $this->syncUnitStatus($lease);
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
}
