<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Document;
use App\Models\Property;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'documentable_type' => Property::class,
            'documentable_id' => Property::factory(),
            'title' => fake()->sentence(3),
            'category_id' => Category::factory()->document(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
