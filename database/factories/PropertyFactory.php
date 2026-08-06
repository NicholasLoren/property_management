<?php

namespace Database\Factories;

use App\Enums\PropertyType;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Property>
 */
class PropertyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'landlord_id' => User::factory(),
            'name' => fake()->streetName().' House',
            'type' => PropertyType::Standalone,
            'address' => fake()->address(),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
