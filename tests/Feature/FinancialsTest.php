<?php

namespace Tests\Feature;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Models\Category;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FinancialsTest extends TestCase
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

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_user_without_permission_cannot_view_financials(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('financials.index'))
            ->assertForbidden();
    }

    public function test_report_aggregates_income_expense_and_occupancy_correctly(): void
    {
        $property = Property::factory()->create();
        $occupiedUnit = Unit::factory()->for($property)->create(['status' => UnitStatus::Occupied]);
        Unit::factory()->for($property)->create(['status' => UnitStatus::Vacant]);

        $lease = Lease::factory()->create([
            'unit_id' => $occupiedUnit->id,
            'status' => LeaseStatus::Active,
            'billing_period' => BillingPeriod::Monthly,
            'rent_amount' => 500000,
        ]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'amount' => 500000,
            'status' => PaymentStatus::Completed,
            'payment_date' => now()->toDateString(),
        ]);

        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Income,
            'category_id' => Category::factory()->income()->create()->id,
            'amount' => 20000,
            'transaction_date' => now()->toDateString(),
        ]);

        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Expense,
            'category_id' => Category::factory()->expense()->create()->id,
            'amount' => 80000,
            'transaction_date' => now()->toDateString(),
        ]);

        $this->actingAs($this->admin())
            ->get(route('financials.index', [
                'from' => now()->subYear()->toDateString(),
                'to' => now()->addYear()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('financials/index')
                ->where('summary.rent_collected', '500000.00')
                ->where('summary.other_income', '20000.00')
                ->where('summary.total_expense', '80000.00')
                ->where('summary.net_income', '440000.00')
                ->where('summary.total_units', 2)
                ->where('summary.occupied_units', 1)
                ->where('summary.occupancy_rate', 50.0)
                ->where('summary.expected_monthly_rent', '500000.00')
                ->where('properties_breakdown.0.net_income', '440000.00')
            );
    }

    public function test_report_shows_monthly_revenue_trend_for_the_current_month(): void
    {
        $property = Property::factory()->create();
        $unit = Unit::factory()->for($property)->create();
        $lease = Lease::factory()->create(['unit_id' => $unit->id]);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'amount' => 300000,
            'status' => PaymentStatus::Completed,
            'payment_date' => now()->startOfMonth()->toDateString(),
        ]);
        // Not counted: not completed.
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'amount' => 999999,
            'status' => PaymentStatus::Failed,
            'payment_date' => now()->toDateString(),
        ]);

        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Expense,
            'category_id' => Category::factory()->expense()->create()->id,
            'amount' => 45000,
            'transaction_date' => now()->toDateString(),
        ]);

        $this->actingAs($this->admin())
            ->get(route('financials.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('financials/index')
                ->has('monthly_trend', 12)
                ->where('monthly_trend.11.income', '300000')
                ->where('monthly_trend.11.expense', '45000')
            );
    }

    public function test_report_breaks_down_expenses_by_category(): void
    {
        $property = Property::factory()->create();
        // Migrations seed a default set of category names (Maintenance,
        // Utilities, Tax, ...) — these two are deliberately outside that
        // list to avoid a unique-constraint collision.
        $landscaping = Category::factory()->expense()->create(['name' => 'Landscaping']);
        $pestControl = Category::factory()->expense()->create(['name' => 'Pest control']);

        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Expense,
            'category_id' => $landscaping->id,
            'amount' => 60000,
            'transaction_date' => now()->toDateString(),
        ]);
        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Expense,
            'category_id' => $pestControl->id,
            'amount' => 25000,
            'transaction_date' => now()->toDateString(),
        ]);

        $this->actingAs($this->admin())
            ->get(route('financials.index', [
                'from' => now()->subYear()->toDateString(),
                'to' => now()->addYear()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('financials/index')
                ->has('expense_by_category', 2)
                // Sorted by amount, highest first.
                ->where('expense_by_category.0.category', 'Landscaping')
                ->where('expense_by_category.0.amount', '60000')
                ->where('expense_by_category.1.category', 'Pest control')
                ->where('expense_by_category.1.amount', '25000')
            );
    }

    public function test_report_shows_lease_status_distribution(): void
    {
        Lease::factory()->create(['status' => LeaseStatus::Active]);
        Lease::factory()->create(['status' => LeaseStatus::Active]);
        Lease::factory()->create(['status' => LeaseStatus::Draft]);

        $this->actingAs($this->admin())
            ->get(route('financials.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('financials/index')
                ->has('lease_status_distribution', 4)
                ->where('lease_status_distribution.0.status', 'draft')
                ->where('lease_status_distribution.0.count', 1)
                ->where('lease_status_distribution.1.status', 'active')
                ->where('lease_status_distribution.1.count', 2)
            );
    }

    public function test_report_can_be_exported_as_pdf_and_excel(): void
    {
        Property::factory()->create();

        $this->actingAs($this->admin())
            ->get(route('financials.export', 'pdf'))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($this->admin())
            ->get(route('financials.export', 'excel'))
            ->assertOk()
            ->assertHeader(
                'content-type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
    }
}
