<?php

namespace Database\Factories;

use App\Enums\CategoryType;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => CategoryType::Expense,
            'name' => fake()->unique()->words(2, true),
        ];
    }

    /**
     * @return static
     */
    public function expense(): static
    {
        return $this->state(['type' => CategoryType::Expense]);
    }

    /**
     * @return static
     */
    public function income(): static
    {
        return $this->state(['type' => CategoryType::Income]);
    }

    /**
     * @return static
     */
    public function document(): static
    {
        return $this->state(['type' => CategoryType::Document]);
    }
}
