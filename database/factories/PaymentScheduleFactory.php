<?php

namespace Database\Factories;

use App\Enums\PaymentScheduleStatus;
use App\Models\Lease;
use App\Models\PaymentSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentSchedule>
 */
class PaymentScheduleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $periodStart = fake()->dateTimeBetween('-6 months', 'now');

        return [
            'lease_id' => Lease::factory(),
            'period_start' => $periodStart,
            'period_end' => (clone $periodStart)->modify('+1 month -1 day'),
            'amount_expected' => fake()->numberBetween(200000, 2000000),
            'status' => PaymentScheduleStatus::Pending,
        ];
    }
}
