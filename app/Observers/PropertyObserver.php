<?php

namespace App\Observers;

use App\Enums\PropertyType;
use App\Enums\UnitStatus;
use App\Models\Property;
use App\Services\CodeGenerator;

class PropertyObserver
{
    public function __construct(private readonly CodeGenerator $codes) {}

    /**
     * A `standalone` property (a single house, no separate unit list) still
     * needs exactly one Unit row so pricing/status/tenant logic always
     * lives on Unit, never forked between Property and Unit.
     */
    public function created(Property $property): void
    {
        if ($property->type === PropertyType::Standalone) {
            $unit = $property->units()->create([
                'code' => $this->codes->generate('unit'),
                'name' => $property->name,
                'status' => UnitStatus::Vacant,
            ]);

            if ($this->codes->usesId('unit')) {
                $unit->forceFill(['code' => $this->codes->generate('unit', $unit)])->save();
            }
        }
    }
}
