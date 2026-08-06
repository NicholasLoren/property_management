<?php

namespace Database\Seeders;

use App\Models\UnitFeature;
use Illuminate\Database\Seeder;

class UnitFeatureSeeder extends Seeder
{
    /**
     * Seed a starter list of unit features (counted per unit, e.g. 2
     * bedrooms), distinct from Amenity which is property-level and
     * presence-only. More can be added later from the Unit Features
     * settings page without a code change.
     */
    public function run(): void
    {
        $features = ['Bedroom', 'Bathroom', 'Kitchen', 'Living room', 'Balcony'];

        foreach ($features as $name) {
            UnitFeature::query()->firstOrCreate(['name' => $name]);
        }
    }
}
