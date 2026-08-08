<?php

namespace Tests\Feature;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Models\Lease;
use App\Models\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PaymentScheduleGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_activating_a_lease_generates_aligned_monthly_periods_through_year_end(): void
    {
        Carbon::setTestNow('2026-03-15');

        $lease = Lease::factory()->create([
            'unit_id' => Unit::factory(),
            'start_date' => '2026-01-01',
            'end_date' => '2027-12-31',
            'billing_period' => BillingPeriod::Monthly,
            'billing_day' => 1,
            'rent_amount' => 500000,
            'status' => LeaseStatus::Active,
        ]);

        $schedule = $lease->paymentSchedules()->orderBy('period_start')->get();

        $this->assertCount(12, $schedule);
        $this->assertSame('2026-01-01', $schedule->first()->period_start->toDateString());
        $this->assertSame('2026-01-31', $schedule->first()->period_end->toDateString());
        $this->assertSame('2026-12-01', $schedule->last()->period_start->toDateString());
        $this->assertSame('2026-12-31', $schedule->last()->period_end->toDateString());
        $this->assertSame('500000.00', $schedule->first()->amount_expected);
        $this->assertTrue($schedule->every(fn ($row) => $row->status === PaymentScheduleStatus::Pending));
    }

    public function test_prorates_a_stub_period_when_billing_day_differs_from_move_in_day(): void
    {
        Carbon::setTestNow('2026-09-15');

        $lease = Lease::factory()->create([
            'unit_id' => Unit::factory(),
            'start_date' => '2026-09-12',
            'end_date' => '2027-12-31',
            'billing_period' => BillingPeriod::Monthly,
            'billing_day' => 1,
            'rent_amount' => 300000,
            'status' => LeaseStatus::Active,
        ]);

        $schedule = $lease->paymentSchedules()->orderBy('period_start')->get();
        $stub = $schedule->first();

        $this->assertSame('2026-09-12', $stub->period_start->toDateString());
        $this->assertSame('2026-09-30', $stub->period_end->toDateString());
        // 19 days (12th through 30th) at a 30-day daily rate of 10,000.
        $this->assertSame('190000.00', $stub->amount_expected);

        $second = $schedule->get(1);
        $this->assertSame('2026-10-01', $second->period_start->toDateString());
        $this->assertSame('2026-10-31', $second->period_end->toDateString());
        $this->assertSame('300000.00', $second->amount_expected);
    }

    public function test_custom_interval_periods_span_the_configured_number_of_months(): void
    {
        Carbon::setTestNow('2026-06-01');

        $lease = Lease::factory()->create([
            'unit_id' => Unit::factory(),
            'start_date' => '2026-01-01',
            'end_date' => '2027-12-31',
            'billing_period' => BillingPeriod::Custom,
            'custom_interval_months' => 4,
            'billing_day' => 1,
            'rent_amount' => 900000,
            'status' => LeaseStatus::Active,
        ]);

        $schedule = $lease->paymentSchedules()->orderBy('period_start')->get();

        $this->assertCount(3, $schedule);
        $this->assertSame('2026-01-01', $schedule->get(0)->period_start->toDateString());
        $this->assertSame('2026-04-30', $schedule->get(0)->period_end->toDateString());
        $this->assertSame('2026-05-01', $schedule->get(1)->period_start->toDateString());
        $this->assertSame('2026-08-31', $schedule->get(1)->period_end->toDateString());
        $this->assertSame('2026-09-01', $schedule->get(2)->period_start->toDateString());
        $this->assertSame('2026-12-31', $schedule->get(2)->period_end->toDateString());
    }

    public function test_final_period_is_prorated_down_to_the_lease_end_date(): void
    {
        Carbon::setTestNow('2026-01-05');

        $lease = Lease::factory()->create([
            'unit_id' => Unit::factory(),
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-15',
            'billing_period' => BillingPeriod::Monthly,
            'billing_day' => 1,
            'rent_amount' => 300000,
            'status' => LeaseStatus::Active,
        ]);

        $schedule = $lease->paymentSchedules()->orderBy('period_start')->get();

        $this->assertCount(3, $schedule);
        $last = $schedule->last();
        $this->assertSame('2026-03-01', $last->period_start->toDateString());
        $this->assertSame('2026-03-15', $last->period_end->toDateString());
        // 15 days at a 30-day daily rate of 10,000.
        $this->assertSame('150000.00', $last->amount_expected);
    }

    public function test_draft_leases_get_no_schedule(): void
    {
        $lease = Lease::factory()->create([
            'unit_id' => Unit::factory(),
            'status' => LeaseStatus::Draft,
        ]);

        $this->assertSame(0, $lease->paymentSchedules()->count());
    }

    public function test_generation_is_idempotent_across_repeated_saves(): void
    {
        Carbon::setTestNow('2026-03-15');

        $lease = Lease::factory()->create([
            'unit_id' => Unit::factory(),
            'start_date' => '2026-01-01',
            'end_date' => '2027-12-31',
            'billing_period' => BillingPeriod::Monthly,
            'billing_day' => 1,
            'status' => LeaseStatus::Active,
        ]);

        $countAfterFirstSave = $lease->paymentSchedules()->count();

        $lease->touch();

        $this->assertSame($countAfterFirstSave, $lease->paymentSchedules()->count());
    }

    public function test_ending_a_lease_voids_future_periods_but_keeps_past_overdue_ones(): void
    {
        Carbon::setTestNow('2026-03-15');

        $lease = Lease::factory()->create([
            'unit_id' => Unit::factory(),
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'billing_period' => BillingPeriod::Monthly,
            'billing_day' => 1,
            'status' => LeaseStatus::Active,
        ]);

        $lease->update(['status' => LeaseStatus::Terminated, 'end_date' => '2026-02-10']);

        $schedule = $lease->paymentSchedules()->orderBy('period_start')->get();

        // January and February — periods that had already started by the
        // move-out date — are left as real, owed rent.
        $this->assertSame(PaymentScheduleStatus::Pending, $schedule->get(0)->status);
        $this->assertSame(PaymentScheduleStatus::Pending, $schedule->get(1)->status);
        // March onward — periods that start after the new end date — are voided.
        $this->assertTrue($schedule->skip(2)->every(fn ($row) => $row->status === PaymentScheduleStatus::Voided));
    }
}
