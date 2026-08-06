<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Lease;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lease_id' => Lease::factory(),
            'amount' => fake()->numberBetween(200000, 2000000),
            'payment_date' => fake()->dateTimeBetween('-3 months', 'now'),
            'method' => PaymentMethod::MobileMoney,
            'status' => PaymentStatus::Completed,
        ];
    }
}
