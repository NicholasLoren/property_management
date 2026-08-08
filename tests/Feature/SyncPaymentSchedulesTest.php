<?php

namespace Tests\Feature;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Models\Lease;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use App\Notifications\RentDueSoon;
use App\Notifications\RentOverdue;
use App\Settings\BillingSettings;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SyncPaymentSchedulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            PermissionCategorySeeder::class,
            PermissionSeeder::class,
            RoleSeeder::class,
        ]);

        app(BillingSettings::class)->fill([
            'days_in_month' => 30,
            'rent_reminder_days_before' => 3,
            'rent_overdue_reminder_days_after' => 2,
            'rent_overdue_reminder_repeat_days' => 5,
        ])->save();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function leaseWithLandlord(): Lease
    {
        $landlord = User::factory()->create();
        $landlord->assignRole('Landlord');

        $property = Property::factory()->create(['landlord_id' => $landlord->id]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);

        $lease = Lease::factory()->create(['unit_id' => $unit->id, 'status' => LeaseStatus::Active]);

        // Activating the lease auto-generates its own schedule (LeaseObserver)
        // — clear it so each test controls exactly which periods exist.
        $lease->paymentSchedules()->delete();

        return $lease;
    }

    public function test_it_notifies_the_landlord_and_staff_of_a_period_due_soon(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-01-10');

        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $lease = $this->leaseWithLandlord();
        $schedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-01-12',
            'period_end' => '2026-02-11',
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $this->artisan('app:sync-payment-schedules')->assertSuccessful();

        $landlord = $lease->unit->property->landlord;
        Notification::assertSentTo($landlord, RentDueSoon::class);
        Notification::assertSentTo($manager, RentDueSoon::class);
        $this->assertNotNull($schedule->fresh()->last_due_reminder_sent_at);
    }

    public function test_it_does_not_send_a_second_due_soon_reminder_for_the_same_period(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-01-10');

        $lease = $this->leaseWithLandlord();
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-01-12',
            'period_end' => '2026-02-11',
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $this->artisan('app:sync-payment-schedules');
        $this->artisan('app:sync-payment-schedules');

        $landlord = $lease->unit->property->landlord;
        Notification::assertSentToTimes($landlord, RentDueSoon::class, 1);
    }

    public function test_it_notifies_of_an_overdue_period_once_past_the_threshold(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-01-10');

        $lease = $this->leaseWithLandlord();
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-01-07',
            'period_end' => '2026-02-06',
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $this->artisan('app:sync-payment-schedules');

        $landlord = $lease->unit->property->landlord;
        Notification::assertSentTo($landlord, RentOverdue::class);
    }

    public function test_it_does_not_repeat_an_overdue_reminder_before_the_repeat_window(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-01-10');

        $lease = $this->leaseWithLandlord();
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-01-07',
            'period_end' => '2026-02-06',
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $this->artisan('app:sync-payment-schedules');

        Carbon::setTestNow('2026-01-12');
        $this->artisan('app:sync-payment-schedules');

        $landlord = $lease->unit->property->landlord;
        Notification::assertSentToTimes($landlord, RentOverdue::class, 1);
    }

    public function test_it_repeats_an_overdue_reminder_after_the_repeat_window(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-01-10');

        $lease = $this->leaseWithLandlord();
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-01-07',
            'period_end' => '2026-02-06',
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $this->artisan('app:sync-payment-schedules');

        Carbon::setTestNow('2026-01-16');
        $this->artisan('app:sync-payment-schedules');

        $landlord = $lease->unit->property->landlord;
        Notification::assertSentToTimes($landlord, RentOverdue::class, 2);
    }

    public function test_it_does_not_notify_about_a_paid_period(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-01-10');

        $lease = $this->leaseWithLandlord();
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-01-07',
            'period_end' => '2026-02-06',
            'status' => PaymentScheduleStatus::Paid,
        ]);

        $this->artisan('app:sync-payment-schedules');

        $landlord = $lease->unit->property->landlord;
        Notification::assertNotSentTo($landlord, RentOverdue::class);
        Notification::assertNotSentTo($landlord, RentDueSoon::class);
    }
}
