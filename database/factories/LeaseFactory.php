<?php

namespace Database\Factories;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Models\Lease;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lease>
 */
class LeaseFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = fake()->dateTimeBetween('-6 months', 'now');

        return [
            'unit_id' => Unit::factory(),
            'start_date' => $startDate,
            'end_date' => (clone $startDate)->modify('+1 year'),
            'rent_amount' => fake()->numberBetween(200000, 2000000),
            'billing_period' => BillingPeriod::Monthly,
            'security_deposit' => fake()->optional()->numberBetween(200000, 2000000),
            'status' => LeaseStatus::Draft,
        ];
    }
}
