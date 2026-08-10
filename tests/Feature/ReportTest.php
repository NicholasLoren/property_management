<?php

namespace Tests\Feature;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyType;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Models\Category;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use App\Support\Branding;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReportTest extends TestCase
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
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_user_without_permission_cannot_view_reports(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('reports.index'))
            ->assertForbidden();
    }

    public function test_reports_catalog_lists_every_report_grouped_by_category(): void
    {
        $this->actingAs($this->admin())
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/index')
                ->has('categories', 4)
                ->where('categories.0.category', 'Financial')
                ->has('categories.0.items', 4)
                ->where('categories.1.category', 'Balances')
                ->has('categories.1.items', 2)
                ->where('categories.2.category', 'Tenants')
                ->has('categories.2.items', 3)
                ->where('categories.3.category', 'Property')
                ->has('categories.3.items', 2)
                ->where('categories.0.items.0.slug', 'income')
            );
    }

    public function test_unknown_report_type_is_a_404(): void
    {
        $this->actingAs($this->admin())
            ->get(route('reports.show', 'not-a-real-report'))
            ->assertNotFound();
    }

    public function test_income_report_lists_rent_payments_and_other_income(): void
    {
        Carbon::setTestNow('2026-08-15');

        $property = Property::factory()->create();
        $unit = Unit::factory()->for($property)->create();
        $lease = Lease::factory()->create(['unit_id' => $unit->id]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'amount' => 500000,
            'status' => PaymentStatus::Completed,
            'payment_date' => '2026-08-05',
        ]);
        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Income,
            'category_id' => Category::factory()->income()->create()->id,
            'amount' => 20000,
            'transaction_date' => '2026-08-10',
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', [
                'type' => 'income', 'from' => '2026-08-01', 'to' => '2026-08-31',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->where('type', 'income')
                ->has('rows', 2)
                ->where('summary.0.value', '520000')
            );
    }

    public function test_expense_report_lists_expense_transactions(): void
    {
        $property = Property::factory()->create();

        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Expense,
            'category_id' => Category::factory()->expense()->create()->id,
            'amount' => 80000,
            'transaction_date' => now()->startOfMonth()->addDays(3)->toDateString(),
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'expense']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('summary.0.value', '80000')
            );
    }

    public function test_profit_and_loss_report_computes_net_profit(): void
    {
        $property = Property::factory()->create();
        $unit = Unit::factory()->for($property)->create();
        $lease = Lease::factory()->create(['unit_id' => $unit->id]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'amount' => 500000,
            'status' => PaymentStatus::Completed,
            'payment_date' => now()->toDateString(),
        ]);
        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Expense,
            'category_id' => Category::factory()->expense()->create()->id,
            'amount' => 150000,
            'transaction_date' => now()->toDateString(),
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', [
                'type' => 'profit-loss', 'from' => now()->startOfMonth()->toDateString(), 'to' => now()->addDay()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->where('summary.0.value', '500000')
                ->where('summary.1.value', '150000')
                ->where('summary.2.value', '350000')
            );
    }

    public function test_rent_collection_report_compares_billed_to_collected(): void
    {
        Carbon::setTestNow('2026-08-15');

        $property = Property::factory()->create();
        $unit = Unit::factory()->for($property)->create();
        $lease = Lease::factory()->create(['unit_id' => $unit->id]);

        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-08-01',
            'period_end' => '2026-08-31',
            'amount_expected' => 500000,
            'status' => PaymentScheduleStatus::Partial,
        ]);
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'amount' => 300000,
            'status' => PaymentStatus::Completed,
            'payment_date' => '2026-08-05',
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', [
                'type' => 'rent-collection', 'from' => '2026-08-01', 'to' => '2026-08-31',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->where('rows.0.property', $property->name)
                ->where('rows.0.billed', '500000')
                ->where('rows.0.collected', '300000')
                ->where('rows.0.rate', '60%')
            );
    }

    public function test_rent_arrears_report_shows_only_overdue_balances(): void
    {
        Carbon::setTestNow('2026-08-15');

        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create(['name' => 'Overdue Tenant']);
        $lease->tenants()->attach($tenant->id);

        $overdue = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-07-01',
            'period_end' => '2026-07-31',
            'amount_expected' => 500000,
            'status' => PaymentScheduleStatus::Partial,
        ]);
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $overdue->id,
            'amount' => 200000,
            'status' => PaymentStatus::Completed,
        ]);
        // Not overdue — due in the future.
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-09-01',
            'period_end' => '2026-09-30',
            'amount_expected' => 500000,
            'status' => PaymentScheduleStatus::Pending,
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'rent-arrears']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.tenant', 'Overdue Tenant')
                ->where('rows.0.amount_due', '300000')
            );
    }

    public function test_advance_payments_report_shows_periods_paid_ahead_of_schedule(): void
    {
        Carbon::setTestNow('2026-08-15');

        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create(['name' => 'Prepaid Tenant']);
        $lease->tenants()->attach($tenant->id);

        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-09-01',
            'period_end' => '2026-09-30',
            'amount_expected' => 500000,
            'status' => PaymentScheduleStatus::Paid,
        ]);
        // Paid but not in the future — not an advance payment.
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => '2026-07-01',
            'period_end' => '2026-07-31',
            'amount_expected' => 500000,
            'status' => PaymentScheduleStatus::Paid,
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'advance-payments']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.tenant', 'Prepaid Tenant')
                ->where('rows.0.amount_paid', '500000.00')
            );
    }

    public function test_tenant_roster_report_lists_only_tenants_on_active_leases(): void
    {
        $activeLease = Lease::factory()->create(['status' => LeaseStatus::Active]);
        $activeTenant = Tenant::factory()->create(['name' => 'Active Tenant']);
        $activeLease->tenants()->attach($activeTenant->id);

        $draftLease = Lease::factory()->create(['status' => LeaseStatus::Draft]);
        $draftTenant = Tenant::factory()->create(['name' => 'Draft Tenant']);
        $draftLease->tenants()->attach($draftTenant->id);

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'tenant-roster']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.tenant', 'Active Tenant')
            );
    }

    public function test_new_residents_report_filters_by_lease_start_date(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'New Tenant']);
        $lease = Lease::factory()->create([
            'start_date' => now()->subDays(3)->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
        ]);
        $lease->tenants()->attach($tenant->id);

        // Moved in outside the window.
        Lease::factory()->create([
            'start_date' => now()->subYear()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', [
                'type' => 'new-residents', 'from' => now()->subWeek()->toDateString(), 'to' => now()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.tenant', 'New Tenant')
            );
    }

    public function test_expiring_leases_report_shows_active_leases_ending_within_90_days(): void
    {
        Carbon::setTestNow('2026-08-15');

        Lease::factory()->create([
            'status' => LeaseStatus::Active,
            'end_date' => '2026-09-01',
        ]);
        // Too far out.
        Lease::factory()->create([
            'status' => LeaseStatus::Active,
            'end_date' => '2027-06-01',
        ]);
        // Ends soon but not active.
        Lease::factory()->create([
            'status' => LeaseStatus::Draft,
            'end_date' => '2026-09-01',
        ]);

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'expiring-leases']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.end_date', '2026-09-01')
            );
    }

    public function test_vacancies_report_lists_vacant_units_with_their_current_price(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create(['type' => PropertyType::MultiUnit]);
        $unitType = UnitType::create(['name' => 'bedsitter', 'label' => 'Bedsitter']);
        $vacant = Unit::factory()->for($property)->create([
            'status' => UnitStatus::Vacant,
            'unit_type_id' => $unitType->id,
        ]);
        $vacant->prices()->create([
            'amount' => 350000,
            'billing_period' => 'monthly',
            'effective_from' => now()->toDateString(),
            'created_by' => $admin->id,
        ]);

        Unit::factory()->for($property)->create(['status' => UnitStatus::Occupied]);

        $this->actingAs($admin)
            ->get(route('reports.show', ['type' => 'vacancies']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.unit', $vacant->name)
                ->where('rows.0.unit_type', 'Bedsitter')
                ->where('rows.0.potential_rent', '350000.00')
            );
    }

    public function test_deposits_report_totals_security_deposits_on_active_leases(): void
    {
        $lease = Lease::factory()->create(['status' => LeaseStatus::Active, 'security_deposit' => 400000]);
        $tenant = Tenant::factory()->create();
        $lease->tenants()->attach($tenant->id);

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'deposits']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.deposit', '400000.00')
                ->where('rows.0.status', 'Held')
                ->where('summary.0.value', '400000')
            );
    }

    public function test_a_report_can_be_exported_as_pdf_and_excel(): void
    {
        Property::factory()->create();

        $this->actingAs($this->admin())
            ->get(route('reports.export', ['type' => 'vacancies', 'format' => 'pdf']))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($this->admin())
            ->get(route('reports.export', ['type' => 'vacancies', 'format' => 'excel']))
            ->assertOk()
            ->assertHeader(
                'content-type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
    }

    public function test_report_page_offers_property_and_unit_selection_defaulting_to_all(): void
    {
        $property = Property::factory()->create(['type' => PropertyType::MultiUnit]);
        $unit = Unit::factory()->for($property)->create();

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'deposits']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->where('filters.property_id', null)
                ->where('filters.unit_id', null)
                ->where('properties.0.value', (string) $property->id)
                ->where('properties.0.label', $property->name)
                ->where('units.0.value', (string) $unit->id)
                ->where('units.0.property_id', (string) $property->id)
            );
    }

    public function test_report_can_be_scoped_to_a_single_property_or_unit(): void
    {
        $propertyA = Property::factory()->create(['type' => PropertyType::MultiUnit]);
        $unitA = Unit::factory()->for($propertyA)->create();
        $leaseA = Lease::factory()->create(['unit_id' => $unitA->id, 'status' => LeaseStatus::Active, 'security_deposit' => 100000]);
        $tenantA = Tenant::factory()->create(['name' => 'Tenant A']);
        $leaseA->tenants()->attach($tenantA->id);

        $propertyB = Property::factory()->create(['type' => PropertyType::MultiUnit]);
        $unitB = Unit::factory()->for($propertyB)->create();
        $leaseB = Lease::factory()->create(['unit_id' => $unitB->id, 'status' => LeaseStatus::Active, 'security_deposit' => 200000]);
        $tenantB = Tenant::factory()->create(['name' => 'Tenant B']);
        $leaseB->tenants()->attach($tenantB->id);

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'deposits', 'property_id' => $propertyA->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.tenant', 'Tenant A')
                ->where('filters.property_id', (string) $propertyA->id)
            );

        $this->actingAs($this->admin())
            ->get(route('reports.show', ['type' => 'deposits', 'unit_id' => $unitB->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/show')
                ->has('rows', 1)
                ->where('rows.0.tenant', 'Tenant B')
                ->where('filters.unit_id', (string) $unitB->id)
            );
    }

    public function test_pdf_export_includes_uploaded_logo(): void
    {
        Storage::fake('public');
        Property::factory()->create();
        $admin = $this->admin();

        $this->assertNull(Branding::logoDataUri());

        $this->actingAs($admin)
            ->patch(route('company-settings.update-branding'), [
                'pdf_header_text' => 'Kampala Estates',
                'primary_color' => '#0A0A0A',
                'accent_color' => '#123ABC',
                'logo' => UploadedFile::fake()->image('logo.png'),
            ])
            ->assertRedirect();

        $this->assertNotNull(Branding::logoDataUri());

        $this->actingAs($admin)
            ->get(route('reports.export', ['type' => 'vacancies', 'format' => 'pdf']))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
