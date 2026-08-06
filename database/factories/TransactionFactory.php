<?php

namespace Database\Factories;

use App\Enums\TransactionType;
use App\Models\Category;
use App\Models\Property;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'property_id' => Property::factory(),
            'type' => TransactionType::Expense,
            'category_id' => Category::factory()->expense(),
            'amount' => fake()->numberBetween(10000, 500000),
            'transaction_date' => fake()->dateTimeBetween('-3 months', 'now'),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
