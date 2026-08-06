<?php

namespace Database\Seeders;

use App\Models\Amenity;
use Illuminate\Database\Seeder;

class AmenitySeeder extends Seeder
{
    /**
     * Seed a starter list of property-level amenities (SRS FR-2.2). More
     * can be added later from the Amenities settings page without a code
     * change.
     */
    public function run(): void
    {
        $amenities = [
            'Parking',
            'Water tank',
            'Security',
            'Generator / backup power',
            'Borehole',
            'Perimeter wall',
            'CCTV',
            'Swimming pool',
        ];

        foreach ($amenities as $name) {
            Amenity::query()->firstOrCreate(['name' => $name]);
        }
    }
}
