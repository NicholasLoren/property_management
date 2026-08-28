<?php

namespace Tests\Feature;

use App\Enums\LeaseStatus;
use App\Enums\MaintenanceStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyType;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Models\Document;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LandlordManagementTest extends TestCase
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

    private function landlord(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Landlord');

        return $user;
    }

    public function test_user_without_permission_cannot_view_landlords(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('landlords.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_landlords_with_property_counts(): void
    {
        $landlord = $this->landlord();
        Property::factory()->count(2)->create(['landlord_id' => $landlord->id]);
        $this->landlord();

        $this->actingAs($this->admin())
            ->get(route('landlords.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('landlords/index')
                ->has('landlords.data', 2)
            );
    }

    public function test_landlords_index_excludes_non_landlord_users(): void
    {
        $this->landlord();
        User::factory()->create()->assignRole('Manager');

        $this->actingAs($this->admin())
            ->get(route('landlords.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('landlords/index')
                ->has('landlords.data', 1)
            );
    }

    public function test_admin_can_view_a_landlord_profile(): void
    {
        $landlord = $this->landlord();
        Property::factory()->create(['landlord_id' => $landlord->id]);

        $this->actingAs($this->admin())
            ->get(route('landlords.show', $landlord))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('landlords/show')
                ->where('landlord.id', $landlord->id)
                ->where('landlord.stats.properties_count', 1)
            );

        $this->actingAs($this->admin())
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => Inertia::getVersion(),
                'X-Inertia-Partial-Component' => 'landlords/show',
                'X-Inertia-Partial-Data' => 'propertiesTable,tableFilters',
            ])
            ->get(route('landlords.show', ['landlord' => $landlord, 'tab' => 'properties']))
            ->assertOk()
            ->assertJsonCount(1, 'props.propertiesTable.data');
    }

    public function test_landlord_show_page_includes_portfolio_stats_and_tabs(): void
    {
        $landlord = $this->landlord();
        $property = Property::factory()->create([
            'landlord_id' => $landlord->id,
            'type' => PropertyType::MultiUnit,
        ]);

        $occupiedUnit = Unit::factory()->create(['property_id' => $property->id, 'status' => UnitStatus::Occupied]);
        Unit::factory()->create(['property_id' => $property->id, 'status' => UnitStatus::Vacant]);

        $tenant = Tenant::factory()->create();
        $lease = Lease::factory()->create([
            'unit_id' => $occupiedUnit->id,
            'status' => LeaseStatus::Active,
            'rent_amount' => 600000,
        ]);
        $lease->tenants()->attach($tenant->id);

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'tenant_id' => $tenant->id,
            'status' => PaymentStatus::Completed,
            'amount' => 600000,
        ]);

        MaintenanceRequest::factory()->create([
            'unit_id' => $occupiedUnit->id,
            'status' => MaintenanceStatus::Open,
        ]);

        Transaction::factory()->create([
            'property_id' => $property->id,
            'type' => TransactionType::Income,
            'amount' => 600000,
        ]);

        Document::factory()->for($property, 'documentable')->create(['title' => 'Insurance Policy']);

        // The default tab ('properties') is deferred — a normal page load
        // must not evaluate any of the six paginated tables.
        $this->actingAs($this->admin())
            ->get(route('landlords.show', $landlord))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('landlords/show')
                ->where('tableFilters.tab', 'properties')
                ->where('landlord.stats.properties_count', 1)
                ->where('landlord.stats.units_count', 2)
                ->where('landlord.stats.occupancy_rate', 50)
                ->where('landlord.performance.total_income', '600000')
                ->missing('propertiesTable')
                ->missing('unitsTable')
                ->missing('tenantsTable')
                ->missing('paymentsTable')
                ->missing('maintenanceTable')
                ->missing('documentsTable')
            );

        // Partial reloads deferred-fetch each tab's own paginated table.
        // (Partial reloads return raw JSON rather than a rendered view, so
        // they're asserted directly rather than through assertInertia().)
        $partial = fn (string $tab, string $prop) => $this->actingAs($this->admin())
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => Inertia::getVersion(),
                'X-Inertia-Partial-Component' => 'landlords/show',
                'X-Inertia-Partial-Data' => "{$prop},tableFilters",
            ])
            ->get(route('landlords.show', ['landlord' => $landlord, 'tab' => $tab]));

        $partial('properties', 'propertiesTable')
            ->assertOk()
            ->assertJsonCount(1, 'props.propertiesTable.data')
            ->assertJsonPath('props.propertiesTable.data.0.units_count', 2);

        $partial('units', 'unitsTable')
            ->assertOk()
            ->assertJsonCount(2, 'props.unitsTable.data');

        $partial('tenants', 'tenantsTable')
            ->assertOk()
            ->assertJsonCount(1, 'props.tenantsTable.data')
            ->assertJsonPath('props.tenantsTable.data.0.name', $tenant->name);

        $partial('payments', 'paymentsTable')
            ->assertOk()
            ->assertJsonCount(1, 'props.paymentsTable.data');

        $partial('maintenance', 'maintenanceTable')
            ->assertOk()
            ->assertJsonCount(1, 'props.maintenanceTable.data');

        $partial('documents', 'documentsTable')
            ->assertOk()
            ->assertJsonCount(1, 'props.documentsTable.data')
            ->assertJsonPath('props.documentsTable.data.0.title', 'Insurance Policy');
    }

    public function test_viewing_a_non_landlord_user_as_a_landlord_404s(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($this->admin())
            ->get(route('landlords.show', $manager))
            ->assertNotFound();
    }
}
