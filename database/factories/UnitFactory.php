<?php

namespace Database\Factories;

use App\Enums\UnitStatus;
use App\Models\Property;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'property_id' => Property::factory(),
            'name' => 'Unit '.fake()->unique()->bothify('##?'),
            'size' => fake()->optional()->numberBetween(20, 120).' sqm',
            'status' => UnitStatus::Vacant,
        ];
    }
}
