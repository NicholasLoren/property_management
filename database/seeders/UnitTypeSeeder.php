<?php

namespace Database\Seeders;

use App\Models\UnitType;
use Illuminate\Database\Seeder;

class UnitTypeSeeder extends Seeder
{
    /**
     * Seed a starter list of unit types, common to the Ugandan rental
     * market this system targets. More can be added later from the Unit
     * Types settings page without a code change.
     */
    public function run(): void
    {
        $types = [
            ['name' => 'apartment', 'label' => 'Apartment'],
            ['name' => 'bedsitter', 'label' => 'Bedsitter'],
            ['name' => 'single_room', 'label' => 'Single room'],
            ['name' => 'shop', 'label' => 'Shop'],
            ['name' => 'office', 'label' => 'Office'],
            ['name' => 'house', 'label' => 'House'],
        ];

        foreach ($types as $type) {
            UnitType::query()->firstOrCreate(
                ['name' => $type['name']],
                ['label' => $type['label']],
            );
        }
    }
}
