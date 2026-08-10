<?php

namespace Tests\Feature;

use App\Enums\LeaseStatus;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyType;
use App\Enums\UnitStatus;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_includes_portfolio_wide_trend_and_breakdown_charts(): void
    {
        Carbon::setTestNow('2026-08-15');

        $lease = Lease::factory()->create(['status' => LeaseStatus::Active]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'amount' => 250000,
            'status' => PaymentStatus::Completed,
            'payment_date' => '2026-08-05',
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->has('monthly_trend', 12)
                ->where('monthly_trend.11.income', '250000')
                ->has('expense_by_category')
                ->has('income_by_category')
                ->has('lease_status_distribution', 4)
                // The lease created above is Active, so it counts here too
                // — the same PortfolioMetrics service the Reports page uses.
                ->where('lease_status_distribution.1.status', 'active')
                ->where('lease_status_distribution.1.count', 1)
            );
    }

    public function test_dashboard_reports_real_occupancy_and_rent_collected(): void
    {
        Carbon::setTestNow('2026-08-15');

        // A multi-unit property, so PropertyObserver doesn't also silently
        // create its own implicit unit the way a standalone property would.
        $property = Property::factory()->create(['type' => PropertyType::MultiUnit]);
        Unit::factory()->create(['property_id' => $property->id, 'status' => UnitStatus::Occupied]);
        Unit::factory()->create(['property_id' => $property->id, 'status' => UnitStatus::Occupied]);
        Unit::factory()->create(['property_id' => $property->id, 'status' => UnitStatus::Vacant]);

        // A separate 4th unit backs the lease/payments below — attaching a
        // (Draft) lease to one of the 3 units above would flip it back to
        // Vacant via LeaseObserver's occupancy sync, which would silently
        // break the occupancy assertions.
        $paymentsUnit = Unit::factory()->create(['property_id' => $property->id, 'status' => UnitStatus::Vacant]);
        $lease = Lease::factory()->create(['unit_id' => $paymentsUnit->id]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'status' => PaymentStatus::Completed,
            'payment_date' => '2026-08-05',
            'amount' => 400000,
        ]);
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'status' => PaymentStatus::Completed,
            'payment_date' => '2026-08-10',
            'amount' => 100000,
        ]);
        // Failed payments and payments outside the month don't count.
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'status' => PaymentStatus::Failed,
            'payment_date' => '2026-08-05',
            'amount' => 999999,
        ]);
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'status' => PaymentStatus::Completed,
            'payment_date' => '2026-07-05',
            'amount' => 999999,
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('kpis.total_units', 4)
                ->where('kpis.occupied_units', 2)
                ->where('kpis.vacant_units', 2)
                ->where('kpis.occupancy_rate', 50)
                ->where('kpis.rent_collected_mtd', '500000')
            );
    }

    public function test_dashboard_lists_leases_renewing_in_the_next_30_days(): void
    {
        Carbon::setTestNow('2026-08-15');

        $unit = Unit::factory()->create();
        $tenant = Tenant::factory()->create(['name' => 'Renewal Tenant']);
        $renewingLease = Lease::factory()->create([
            'unit_id' => $unit->id,
            'status' => LeaseStatus::Active,
            'end_date' => '2026-08-25',
        ]);
        $renewingLease->tenants()->attach($tenant->id);

        // Out of range and non-active leases should not appear.
        Lease::factory()->create(['status' => LeaseStatus::Active, 'end_date' => '2026-12-01']);
        Lease::factory()->create(['status' => LeaseStatus::Draft, 'end_date' => '2026-08-20']);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->has('upcoming_renewals', 1)
                ->where('upcoming_renewals.0.id', $renewingLease->id)
                ->where('upcoming_renewals.0.tenant_names.0', 'Renewal Tenant')
            );
    }

    public function test_dashboard_reports_overdue_balance_from_payment_schedules(): void
    {
        Carbon::setTestNow('2026-08-15');

        // Draft, not Active — an Active lease would trigger the real
        // schedule generator and create its own (unrelated) rows on top of
        // the ones this test explicitly sets up. Reading overdue balances
        // only depends on the PaymentSchedule rows existing, not on the
        // lease's current status.
        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create();
        $lease->tenants()->attach($tenant->id);

        $overdueSchedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-07-01',
            'period_end' => '2026-07-31',
            'amount_expected' => 500000,
            'status' => PaymentScheduleStatus::Partial,
        ]);
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $overdueSchedule->id,
            'status' => PaymentStatus::Completed,
            'amount' => 150000,
        ]);

        // Not overdue: due in the future.
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-09-01',
            'period_end' => '2026-09-30',
            'amount_expected' => 500000,
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('kpis.overdue_balance', '350000')
                ->where('kpis.overdue_leases_count', 1)
                ->where('kpis.overdue_tenants_count', 1)
            );
    }

    public function test_dashboard_lists_open_maintenance_requests_by_priority(): void
    {
        $unit = Unit::factory()->create();

        $urgent = MaintenanceRequest::factory()->create([
            'unit_id' => $unit->id,
            'title' => 'Urgent leak',
            'priority' => MaintenancePriority::Urgent,
            'status' => MaintenanceStatus::Open,
        ]);
        MaintenanceRequest::factory()->create([
            'unit_id' => $unit->id,
            'title' => 'Low priority paint touch-up',
            'priority' => MaintenancePriority::Low,
            'status' => MaintenanceStatus::InProgress,
        ]);
        // Completed requests are not "open".
        MaintenanceRequest::factory()->create([
            'unit_id' => $unit->id,
            'status' => MaintenanceStatus::Completed,
        ]);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('kpis.maintenance_open_count', 2)
                ->where('kpis.maintenance_urgent_count', 1)
                ->where('kpis.maintenance_in_progress_count', 1)
                ->has('open_maintenance', 2)
                // Urgent sorts first regardless of creation order.
                ->where('open_maintenance.0.id', $urgent->id)
            );
    }
}
