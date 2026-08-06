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
            ->get(route('reports.index', [
                'from' => now()->subYear()->toDateString(),
                'to' => now()->addYear()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/index')
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

    public function test_report_can_be_exported_as_pdf_and_excel(): void
    {
        Property::factory()->create();

        $this->actingAs($this->admin())
            ->get(route('reports.export', 'pdf'))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($this->admin())
            ->get(route('reports.export', 'excel'))
            ->assertOk()
            ->assertHeader(
                'content-type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
    }
}
