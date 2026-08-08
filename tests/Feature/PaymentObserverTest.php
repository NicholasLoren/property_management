<?php

namespace Tests\Feature;

use App\Enums\PaymentScheduleStatus;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentObserverTest extends TestCase
{
    use RefreshDatabase;

    public function test_recording_a_partial_payment_marks_the_period_partial(): void
    {
        $lease = Lease::factory()->create();
        $schedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'amount_expected' => 300000,
            'status' => PaymentScheduleStatus::Pending,
        ]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $schedule->id,
            'amount' => 100000,
        ]);

        $this->assertSame(PaymentScheduleStatus::Partial, $schedule->fresh()->status);
    }

    public function test_paying_the_full_amount_marks_the_period_paid(): void
    {
        $lease = Lease::factory()->create();
        $schedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'amount_expected' => 300000,
            'status' => PaymentScheduleStatus::Pending,
        ]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $schedule->id,
            'amount' => 300000,
        ]);

        $this->assertSame(PaymentScheduleStatus::Paid, $schedule->fresh()->status);
    }

    public function test_two_partial_payments_sum_to_paid(): void
    {
        $lease = Lease::factory()->create();
        $schedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'amount_expected' => 300000,
            'status' => PaymentScheduleStatus::Pending,
        ]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $schedule->id,
            'amount' => 150000,
        ]);
        $this->assertSame(PaymentScheduleStatus::Partial, $schedule->fresh()->status);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $schedule->id,
            'amount' => 150000,
        ]);
        $this->assertSame(PaymentScheduleStatus::Paid, $schedule->fresh()->status);
    }

    public function test_deleting_a_payment_reverts_the_period_to_pending(): void
    {
        $lease = Lease::factory()->create();
        $schedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'amount_expected' => 300000,
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $payment = Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $schedule->id,
            'amount' => 300000,
        ]);
        $this->assertSame(PaymentScheduleStatus::Paid, $schedule->fresh()->status);

        $payment->delete();

        $this->assertSame(PaymentScheduleStatus::Pending, $schedule->fresh()->status);
    }

    public function test_moving_a_payment_to_a_different_period_recomputes_both(): void
    {
        $lease = Lease::factory()->create();
        $original = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'amount_expected' => 300000,
            'status' => PaymentScheduleStatus::Pending,
        ]);
        $other = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => $original->period_start->copy()->addMonth(),
            'period_end' => $original->period_end->copy()->addMonth(),
            'amount_expected' => 300000,
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $payment = Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $original->id,
            'amount' => 300000,
        ]);
        $this->assertSame(PaymentScheduleStatus::Paid, $original->fresh()->status);

        $payment->update(['payment_schedule_id' => $other->id]);

        $this->assertSame(PaymentScheduleStatus::Pending, $original->fresh()->status);
        $this->assertSame(PaymentScheduleStatus::Paid, $other->fresh()->status);
    }

    public function test_voided_periods_are_not_reopened_by_a_payment(): void
    {
        $lease = Lease::factory()->create();
        $schedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'amount_expected' => 300000,
            'status' => PaymentScheduleStatus::Voided,
        ]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $schedule->id,
            'amount' => 300000,
        ]);

        $this->assertSame(PaymentScheduleStatus::Voided, $schedule->fresh()->status);
    }
}
