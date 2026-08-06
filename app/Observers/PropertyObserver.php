<?php

namespace App\Observers;

use App\Enums\PropertyType;
use App\Enums\UnitStatus;
use App\Models\Property;

class PropertyObserver
{
    /**
     * A `standalone` property (a single house, no separate unit list) still
     * needs exactly one Unit row so pricing/status/tenant logic always
     * lives on Unit, never forked between Property and Unit.
     */
    public function created(Property $property): void
    {
        if ($property->type === PropertyType::Standalone) {
            $property->units()->create([
                'name' => $property->name,
                'status' => UnitStatus::Vacant,
            ]);
        }
    }
}
