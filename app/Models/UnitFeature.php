<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * A manageable list of unit features (bedroom, bathroom, kitchen, balcony,
 * ...), attached to a Unit with a quantity via `unit_feature_unit` — unlike
 * Amenity (property-level, presence only), a feature counts how many.
 *
 * @property int $id
 * @property string $name
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read UnitFeatureUnit|null $pivot
 */
#[Fillable(['name'])]
class UnitFeature extends Model
{
    /**
     * @return BelongsToMany<Unit, $this, UnitFeatureUnit, 'pivot'>
     */
    public function units(): BelongsToMany
    {
        return $this->belongsToMany(Unit::class, 'unit_feature_unit')
            ->using(UnitFeatureUnit::class)
            ->withPivot('quantity');
    }
}
