<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Pivot for unit_feature_unit — a typed class instead of the generic Pivot
 * mainly so `quantity` is a known property to static analysis and IDEs.
 *
 * @property int $unit_id
 * @property int $unit_feature_id
 * @property int $quantity
 */
class UnitFeatureUnit extends Pivot
{
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }
}
