<?php

namespace Tests\Feature;

use App\Enums\PropertyType;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitFeature;
use App\Models\UnitType;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UnitFeatureSeeder;
use Database\Seeders\UnitTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UnitManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            PermissionCategorySeeder::class,
            PermissionSeeder::class,
            RoleSeeder::class,
            UnitTypeSeeder::class,
            UnitFeatureSeeder::class,
        ]);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        return $user;
    }

    private function multiUnitProperty(): Property
    {
        $landlord = User::factory()->create();
        $landlord->assignRole('Landlord');

        return Property::factory()->create([
            'landlord_id' => $landlord->id,
            'type' => PropertyType::MultiUnit,
        ]);
    }

    public function test_user_without_permission_cannot_view_units(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');
        $property = $this->multiUnitProperty();

        $this->actingAs($manager)
            ->get(route('units.index', $property))
            ->assertForbidden();
    }

    public function test_admin_can_view_units_for_a_property(): void
    {
        $property = $this->multiUnitProperty();
        Unit::factory()->for($property)->count(2)->create();

        $this->actingAs($this->admin())
            ->get(route('units.index', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('units/index')
                ->where('property.id', $property->id)
                ->has('units.data', 2)
            );
    }

    public function test_unit_show_page_is_permission_gated_and_includes_price_history_and_features(): void
    {
        $admin = $this->admin();
        $property = $this->multiUnitProperty();
        $bedroom = UnitFeature::query()->where('name', 'Bedroom')->firstOrFail();
        $unit = Unit::factory()->for($property)->create();
        $unit->features()->attach($bedroom->id, ['quantity' => 2]);
        $unit->prices()->create([
            'amount' => 300000,
            'billing_period' => 'monthly',
            'effective_from' => now()->subMonth()->toDateString(),
            'effective_to' => now()->toDateString(),
            'created_by' => $admin->id,
        ]);
        $unit->prices()->create([
            'amount' => 350000,
            'billing_period' => 'monthly',
            'effective_from' => now()->toDateString(),
            'created_by' => $admin->id,
        ]);

        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('units.show', [$property, $unit]))
            ->assertForbidden();

        $this->actingAs($admin)
            ->get(route('units.show', [$property, $unit]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('units/show')
                ->where('unit.name', $unit->name)
                ->has('unit.features', 1)
                ->where('unit.features.0.name', 'Bedroom')
                ->where('unit.features.0.quantity', 2)
                ->has('unit.price_history', 2)
                ->where('unit.price_history.0.is_current', true)
                ->where('unit.price_history.0.amount', '350000.00')
            );
    }

    public function test_create_and_edit_pages_are_permission_gated(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');
        $property = $this->multiUnitProperty();
        $unit = Unit::factory()->for($property)->create();

        $this->actingAs($manager)->get(route('units.create', $property))->assertForbidden();
        $this->actingAs($manager)->get(route('units.edit', [$property, $unit]))->assertForbidden();

        $admin = $this->admin();

        $this->actingAs($admin)
            ->get(route('units.create', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('units/form')
                ->has('unitTypes')
                ->has('features')
                ->missing('unit')
            );

        $this->actingAs($admin)
            ->get(route('units.edit', [$property, $unit]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('units/form')
                ->where('unit.name', $unit->name)
            );
    }

    public function test_admin_can_create_a_unit_with_features_and_a_price(): void
    {
        $admin = $this->admin();
        $property = $this->multiUnitProperty();
        $unitType = UnitType::query()->first();
        $bedroom = UnitFeature::query()->where('name', 'Bedroom')->firstOrFail();
        $bathroom = UnitFeature::query()->where('name', 'Bathroom')->firstOrFail();

        $this->actingAs($admin)
            ->post(route('units.store', $property), [
                'unit_type_id' => (string) $unitType->id,
                'name' => 'Unit 2B',
                'size' => '45 sqm',
                'status' => 'vacant',
                'price_amount' => '500000',
                'price_billing_period' => 'monthly',
                'features' => [
                    ['unit_feature_id' => $bedroom->id, 'quantity' => 2],
                    ['unit_feature_id' => $bathroom->id, 'quantity' => 1],
                ],
            ])
            ->assertRedirect(route('units.index', $property));

        $unit = Unit::query()->where('name', 'Unit 2B')->firstOrFail();
        $this->assertSame($property->id, $unit->property_id);
        $this->assertSame($unitType->id, $unit->unit_type_id);
        $this->assertCount(2, $unit->features);
        $this->assertSame(2, $unit->features->firstWhere('id', $bedroom->id)->pivot->quantity);

        $price = $unit->currentPrice;
        $this->assertNotNull($price);
        $this->assertSame('500000.00', (string) $price->amount);
        $this->assertNull($price->effective_to);
    }

    public function test_updating_the_price_closes_the_old_one_and_opens_a_new_one(): void
    {
        $admin = $this->admin();
        $property = $this->multiUnitProperty();
        $unit = Unit::factory()->for($property)->create();
        $unit->prices()->create([
            'amount' => 400000,
            'billing_period' => 'monthly',
            'effective_from' => now()->subMonth()->toDateString(),
            'created_by' => $admin->id,
        ]);
        $originalPriceId = $unit->currentPrice->id;

        $this->actingAs($admin)
            ->put(route('units.update', [$property, $unit]), [
                'unit_type_id' => null,
                'name' => $unit->name,
                'status' => 'vacant',
                'price_amount' => '450000',
                'price_billing_period' => 'monthly',
            ])
            ->assertRedirect(route('units.index', $property));

        $unit->refresh();
        $this->assertCount(2, $unit->prices);
        $this->assertNotNull($unit->prices()->find($originalPriceId)->effective_to);
        $this->assertSame('450000.00', (string) $unit->currentPrice->amount);
    }

    public function test_updating_without_changing_the_price_does_not_duplicate_it(): void
    {
        $admin = $this->admin();
        $property = $this->multiUnitProperty();
        $unit = Unit::factory()->for($property)->create();
        $unit->prices()->create([
            'amount' => 400000,
            'billing_period' => 'monthly',
            'effective_from' => now()->toDateString(),
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->put(route('units.update', [$property, $unit]), [
                'unit_type_id' => null,
                'name' => $unit->name,
                'status' => 'vacant',
                'price_amount' => '400000',
                'price_billing_period' => 'monthly',
            ])
            ->assertRedirect(route('units.index', $property));

        $this->assertCount(1, $unit->fresh()->prices);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_a_unit(): void
    {
        $admin = $this->admin();
        $property = $this->multiUnitProperty();
        $unit = Unit::factory()->for($property)->create();

        $this->actingAs($admin)
            ->delete(route('units.destroy', [$property, $unit]))
            ->assertRedirect();

        $this->assertSoftDeleted('units', ['id' => $unit->id]);

        $this->actingAs($admin)
            ->patch(route('units.restore', [$property, $unit]))
            ->assertRedirect();

        $this->assertDatabaseHas('units', ['id' => $unit->id, 'deleted_at' => null]);

        $unit->delete();

        $this->actingAs($admin)
            ->delete(route('units.force-delete', [$property, $unit]))
            ->assertRedirect();

        $this->assertDatabaseMissing('units', ['id' => $unit->id]);
    }

    public function test_unit_route_is_scoped_to_its_property(): void
    {
        $admin = $this->admin();
        $propertyA = $this->multiUnitProperty();
        $propertyB = $this->multiUnitProperty();
        $unit = Unit::factory()->for($propertyA)->create();

        $this->actingAs($admin)
            ->get(route('units.edit', [$propertyB, $unit]))
            ->assertNotFound();
    }

    public function test_admin_can_view_the_cross_property_units_list(): void
    {
        $propertyA = $this->multiUnitProperty();
        $propertyB = $this->multiUnitProperty();
        Unit::factory()->for($propertyA)->count(2)->create();
        Unit::factory()->for($propertyB)->create();

        $this->actingAs($this->admin())
            ->get(route('units.all'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('units/all')
                ->has('units.data', 3)
                ->has('properties', 2)
            );
    }

    public function test_cross_property_units_list_can_filter_by_property(): void
    {
        $propertyA = $this->multiUnitProperty();
        $propertyB = $this->multiUnitProperty();
        Unit::factory()->for($propertyA)->count(2)->create();
        Unit::factory()->for($propertyB)->create();

        $this->actingAs($this->admin())
            ->get(route('units.all', ['property_id' => [$propertyA->id]]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('units/all')
                ->has('units.data', 2)
            );
    }

    public function test_user_without_permission_cannot_view_the_cross_property_units_list(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('units.all'))
            ->assertForbidden();
    }
}
