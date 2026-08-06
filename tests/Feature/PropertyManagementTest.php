<?php

namespace Tests\Feature;

use App\Enums\PropertyType;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitFeature;
use App\Models\User;
use Database\Seeders\AmenitySeeder;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UnitFeatureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PropertyManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            PermissionCategorySeeder::class,
            PermissionSeeder::class,
            RoleSeeder::class,
            AmenitySeeder::class,
            UnitFeatureSeeder::class,
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

    public function test_user_without_permission_cannot_view_properties(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('properties.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_properties(): void
    {
        Property::factory()->count(2)->create(['landlord_id' => $this->landlord()->id]);

        $this->actingAs($this->admin())
            ->get(route('properties.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('properties/index')
                ->has('properties.data', 2)
            );
    }

    public function test_create_and_edit_pages_are_permission_gated(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');
        $property = Property::factory()->create(['landlord_id' => $this->landlord()->id]);

        $this->actingAs($manager)->get(route('properties.create'))->assertForbidden();
        $this->actingAs($manager)->get(route('properties.edit', $property))->assertForbidden();

        $admin = $this->admin();

        $this->actingAs($admin)
            ->get(route('properties.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('properties/form')
                ->has('landlords')
                ->has('amenities')
                ->has('types')
                ->missing('property')
            );

        $this->actingAs($admin)
            ->get(route('properties.edit', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('properties/form')
                ->where('property.name', $property->name)
            );
    }

    public function test_admin_can_create_a_standalone_property_with_an_implicit_unit(): void
    {
        $admin = $this->admin();
        $landlord = $this->landlord();
        $amenityIds = Amenity::query()->limit(2)->pluck('id')->all();

        $this->actingAs($admin)
            ->post(route('properties.store'), [
                'landlord_id' => (string) $landlord->id,
                'name' => 'Ntinda House',
                'type' => PropertyType::Standalone->value,
                'address' => 'Plot 12, Ntinda',
                'latitude' => 0.3476,
                'longitude' => 32.5825,
                'description' => 'A quiet family house.',
                'amenity_ids' => $amenityIds,
            ])
            ->assertRedirect(route('properties.index'));

        $property = Property::query()->where('name', 'Ntinda House')->firstOrFail();
        $this->assertSame($landlord->id, $property->landlord_id);
        $this->assertSame('0.3476000', (string) $property->latitude);
        $this->assertSame('32.5825000', (string) $property->longitude);
        $this->assertCount(2, $property->amenities);
        $this->assertCount(1, $property->units);
        $this->assertSame('Ntinda House', $property->units->first()->name);
        $this->assertNotNull($property->code);
        $this->assertStringStartsWith('PROP-', $property->code);
        $this->assertNotNull($property->units->first()->code);
        $this->assertStringStartsWith('UNIT-', $property->units->first()->code);
    }

    public function test_property_coordinates_are_optional_and_bounded(): void
    {
        $admin = $this->admin();
        $landlord = $this->landlord();

        $this->actingAs($admin)
            ->post(route('properties.store'), [
                'landlord_id' => (string) $landlord->id,
                'name' => 'No Coordinates House',
                'type' => PropertyType::Standalone->value,
                'address' => 'Somewhere',
            ])
            ->assertRedirect(route('properties.index'));

        $this->assertDatabaseHas('properties', [
            'name' => 'No Coordinates House',
            'latitude' => null,
            'longitude' => null,
        ]);

        $this->actingAs($admin)
            ->post(route('properties.store'), [
                'landlord_id' => (string) $landlord->id,
                'name' => 'Invalid Coordinates House',
                'type' => PropertyType::Standalone->value,
                'address' => 'Somewhere',
                'latitude' => 200,
                'longitude' => 32.5825,
            ])
            ->assertSessionHasErrors('latitude');
    }

    public function test_admin_can_create_a_multi_unit_property_without_an_implicit_unit(): void
    {
        $admin = $this->admin();
        $landlord = $this->landlord();

        $this->actingAs($admin)
            ->post(route('properties.store'), [
                'landlord_id' => (string) $landlord->id,
                'name' => 'Kisementi Apartments',
                'type' => PropertyType::MultiUnit->value,
                'address' => 'Kisementi Road',
            ])
            ->assertRedirect(route('properties.index'));

        $property = Property::query()->where('name', 'Kisementi Apartments')->firstOrFail();
        $this->assertCount(0, $property->units);
    }

    public function test_property_show_page_includes_aggregated_unit_stats(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create([
            'landlord_id' => $this->landlord()->id,
            'type' => PropertyType::MultiUnit,
        ]);
        $bedroom = UnitFeature::query()->where('name', 'Bedroom')->firstOrFail();

        $unitA = Unit::factory()->for($property)->create(['status' => 'vacant']);
        $unitA->features()->attach($bedroom->id, ['quantity' => 2]);
        $unitA->prices()->create([
            'amount' => 300000,
            'billing_period' => 'monthly',
            'effective_from' => now()->toDateString(),
            'created_by' => $admin->id,
        ]);

        $unitB = Unit::factory()->for($property)->create(['status' => 'occupied']);
        $unitB->features()->attach($bedroom->id, ['quantity' => 1]);
        $unitB->prices()->create([
            'amount' => 500000,
            'billing_period' => 'monthly',
            'effective_from' => now()->toDateString(),
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get(route('properties.show', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('properties/show')
                ->where('property.quick_facts.total', 2)
                ->where('property.quick_facts.vacant', 1)
                ->where('property.quick_facts.occupied', 1)
                ->where('property.quick_facts.bedrooms', 3)
                ->where('property.price_summary.low', '300000')
                ->where('property.price_summary.high', '500000')
                ->where('property.price_summary.median', '400000')
                ->where('property.price_summary.billing_period_label', 'Monthly')
            );
    }

    public function test_property_index_shows_units_summary_and_price_range(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create([
            'landlord_id' => $this->landlord()->id,
            'type' => PropertyType::MultiUnit,
        ]);
        $unit = Unit::factory()->for($property)->create(['status' => 'vacant']);
        $unit->prices()->create([
            'amount' => 250000,
            'billing_period' => 'monthly',
            'effective_from' => now()->toDateString(),
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get(route('properties.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('properties/index')
                ->where('properties.data.0.units_summary.total', 1)
                ->where('properties.data.0.units_summary.vacant', 1)
                ->where('properties.data.0.price_range.low', '250000')
            );
    }

    public function test_property_requires_a_landlord_role_user(): void
    {
        $admin = $this->admin();
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($admin)
            ->post(route('properties.store'), [
                'landlord_id' => (string) $manager->id,
                'name' => 'Invalid Property',
                'type' => PropertyType::Standalone->value,
                'address' => 'Somewhere',
            ])
            ->assertSessionHasErrors('landlord_id');

        $this->assertDatabaseMissing('properties', ['name' => 'Invalid Property']);
    }

    public function test_admin_can_update_a_property(): void
    {
        $admin = $this->admin();
        $landlord = $this->landlord();
        $property = Property::factory()->create(['landlord_id' => $landlord->id, 'name' => 'Old Name']);

        $this->actingAs($admin)
            ->put(route('properties.update', $property), [
                'landlord_id' => (string) $landlord->id,
                'name' => 'New Name',
                'type' => $property->type->value,
                'address' => $property->address,
            ])
            ->assertRedirect(route('properties.index'));

        $this->assertSame('New Name', $property->fresh()->name);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_a_property(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create(['landlord_id' => $this->landlord()->id]);

        $this->actingAs($admin)
            ->delete(route('properties.destroy', $property))
            ->assertRedirect();

        $this->assertSoftDeleted('properties', ['id' => $property->id]);

        $this->actingAs($admin)
            ->patch(route('properties.restore', $property))
            ->assertRedirect();

        $this->assertDatabaseHas('properties', ['id' => $property->id, 'deleted_at' => null]);

        $property->delete();

        $this->actingAs($admin)
            ->delete(route('properties.force-delete', $property))
            ->assertRedirect();

        $this->assertDatabaseMissing('properties', ['id' => $property->id]);
    }

    public function test_trashing_a_standalone_property_also_trashes_its_implicit_unit(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create([
            'landlord_id' => $this->landlord()->id,
            'type' => PropertyType::Standalone,
        ]);
        $unit = $property->units->first();

        $this->actingAs($admin)
            ->delete(route('properties.destroy', $property))
            ->assertRedirect();

        $this->assertSoftDeleted('units', ['id' => $unit->id]);

        $this->actingAs($admin)
            ->patch(route('properties.restore', $property))
            ->assertRedirect();

        $this->assertDatabaseHas('units', ['id' => $unit->id, 'deleted_at' => null]);
    }

    public function test_admin_can_export_properties_as_pdf_and_excel(): void
    {
        $admin = $this->admin();
        Property::factory()->create(['landlord_id' => $this->landlord()->id]);

        $this->actingAs($admin)
            ->get(route('properties.export', 'pdf'))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($admin)
            ->get(route('properties.export', 'excel'))
            ->assertOk()
            ->assertHeader(
                'content-type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
    }

    public function test_non_admin_cannot_export_properties(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('properties.export', 'pdf'))
            ->assertForbidden();
    }
}
