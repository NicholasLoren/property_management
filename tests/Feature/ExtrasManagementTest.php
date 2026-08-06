<?php

namespace Tests\Feature;

use App\Enums\CategoryType;
use App\Models\Amenity;
use App\Models\Category;
use App\Models\Property;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExtrasManagementTest extends TestCase
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

    public function test_user_without_permission_cannot_view_extras(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('extras.index', 'expense-categories'))
            ->assertForbidden();
    }

    public function test_extras_index_rejects_an_unknown_section(): void
    {
        $this->actingAs($this->admin())
            ->get('/extras/not-a-real-section')
            ->assertNotFound();
    }

    public function test_extras_index_lists_categories_scoped_to_the_section_type(): void
    {
        Category::factory()->expense()->create(['name' => 'Widget expense']);
        Category::factory()->income()->create(['name' => 'Widget income']);

        $this->actingAs($this->admin())
            ->get(route('extras.index', ['section' => 'expense-categories', 'search' => 'Widget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('extras/index')
                ->where('section', 'expense-categories')
                ->has('items.data', 1)
                ->where('items.data.0.name', 'Widget expense')
            );
    }

    public function test_extras_index_search_filters_by_name(): void
    {
        Category::factory()->expense()->create(['name' => 'Pool cleaning']);
        Category::factory()->expense()->create(['name' => 'Security patrol']);

        $this->actingAs($this->admin())
            ->get(route('extras.index', ['section' => 'expense-categories', 'search' => 'pool cl']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('items.data', 1)
                ->where('items.data.0.name', 'Pool cleaning')
            );
    }

    public function test_extras_index_trash_tab_lists_only_soft_deleted_entries(): void
    {
        $baselineActive = Category::query()->ofType(CategoryType::Expense)->count();

        Category::factory()->expense()->create(['name' => 'Snow removal']);
        $trashed = Category::factory()->expense()->create(['name' => 'Old category']);
        $trashed->delete();

        $this->actingAs($this->admin())
            ->get(route('extras.index', ['section' => 'expense-categories', 'tab' => 'trash']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('items.data', 1)
                ->where('items.data.0.name', 'Old category')
                ->where('counts.active', $baselineActive + 1)
                ->where('counts.trash', 1)
            );
    }

    public function test_extras_index_reports_usage_counts(): void
    {
        $category = Category::factory()->expense()->create(['name' => 'Landscaping']);
        Transaction::factory()->create(['type' => 'expense', 'category_id' => $category->id]);
        Transaction::factory()->create(['type' => 'expense', 'category_id' => $category->id]);

        $this->actingAs($this->admin())
            ->get(route('extras.index', ['section' => 'expense-categories', 'search' => 'Landscaping']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('items.data', 1)
                ->where('items.data.0.usage_count', 2)
            );
    }

    public function test_admin_can_create_a_category_for_each_type(): void
    {
        $admin = $this->admin();

        foreach (['expense', 'income', 'document'] as $type) {
            $this->actingAs($admin)
                ->post(route("extras.{$type}-categories.store"), ['name' => 'Brand new'])
                ->assertRedirect(route('extras.index', "{$type}-categories"));

            $this->assertDatabaseHas('categories', ['type' => $type, 'name' => 'Brand new']);
        }
    }

    public function test_category_name_must_be_unique_within_its_type(): void
    {
        // "Utilities" is already seeded as a canonical expense category by
        // the 2026_08_07_090001 migration.
        $this->actingAs($this->admin())
            ->post(route('extras.expense-categories.store'), ['name' => 'Utilities'])
            ->assertSessionHasErrors('name');
    }

    public function test_the_same_category_name_is_allowed_across_different_types(): void
    {
        Category::factory()->expense()->create(['name' => 'Photocopies']);

        $this->actingAs($this->admin())
            ->post(route('extras.income-categories.store'), ['name' => 'Photocopies'])
            ->assertRedirect(route('extras.index', 'income-categories'));

        $this->assertDatabaseHas('categories', ['type' => CategoryType::Income->value, 'name' => 'Photocopies']);
    }

    public function test_editing_a_category_under_the_wrong_type_section_is_not_found(): void
    {
        $category = Category::factory()->expense()->create();

        $this->actingAs($this->admin())
            ->get(route('extras.income-categories.edit', $category))
            ->assertNotFound();
    }

    public function test_admin_can_update_a_category(): void
    {
        $admin = $this->admin();
        $category = Category::factory()->expense()->create(['name' => 'Old name']);

        $this->actingAs($admin)
            ->put(route('extras.expense-categories.update', $category), ['name' => 'New name'])
            ->assertRedirect(route('extras.index', 'expense-categories'));

        $this->assertSame('New name', $category->fresh()->name);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_an_unused_category(): void
    {
        $admin = $this->admin();
        $category = Category::factory()->expense()->create();

        $this->actingAs($admin)
            ->delete(route('extras.expense-categories.destroy', $category))
            ->assertRedirect();

        $this->assertSoftDeleted('categories', ['id' => $category->id]);

        $this->actingAs($admin)
            ->patch(route('extras.expense-categories.restore', $category))
            ->assertRedirect();

        $this->assertDatabaseHas('categories', ['id' => $category->id, 'deleted_at' => null]);

        $category->delete();

        $this->actingAs($admin)
            ->delete(route('extras.expense-categories.force-delete', $category))
            ->assertRedirect();

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_force_deleting_a_category_still_in_use_fails_gracefully(): void
    {
        $admin = $this->admin();
        $category = Category::factory()->expense()->create();
        Transaction::factory()->create(['type' => 'expense', 'category_id' => $category->id]);
        $category->delete();

        $this->actingAs($admin)
            ->delete(route('extras.expense-categories.force-delete', $category))
            ->assertRedirect();

        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_admin_can_create_a_property_feature(): void
    {
        $this->actingAs($this->admin())
            ->post(route('extras.property-features.store'), ['name' => 'Generator'])
            ->assertRedirect(route('extras.index', 'property-features'));

        $this->assertDatabaseHas('amenities', ['name' => 'Generator']);
    }

    public function test_property_feature_name_must_be_unique(): void
    {
        Amenity::create(['name' => 'Generator']);

        $this->actingAs($this->admin())
            ->post(route('extras.property-features.store'), ['name' => 'Generator'])
            ->assertSessionHasErrors('name');
    }

    public function test_admin_can_trash_restore_and_permanently_delete_an_unused_property_feature(): void
    {
        $admin = $this->admin();
        $amenity = Amenity::create(['name' => 'Generator']);

        $this->actingAs($admin)
            ->delete(route('extras.property-features.destroy', $amenity))
            ->assertRedirect();

        $this->assertSoftDeleted('amenities', ['id' => $amenity->id]);

        $this->actingAs($admin)
            ->patch(route('extras.property-features.restore', $amenity))
            ->assertRedirect();

        $this->assertDatabaseHas('amenities', ['id' => $amenity->id, 'deleted_at' => null]);

        $amenity->delete();

        $this->actingAs($admin)
            ->delete(route('extras.property-features.force-delete', $amenity))
            ->assertRedirect();

        $this->assertDatabaseMissing('amenities', ['id' => $amenity->id]);
    }

    public function test_force_deleting_a_property_feature_still_in_use_fails_gracefully(): void
    {
        $admin = $this->admin();
        $amenity = Amenity::create(['name' => 'Generator']);
        $property = Property::factory()->create();
        $property->amenities()->attach($amenity);
        $amenity->delete();

        $this->actingAs($admin)
            ->delete(route('extras.property-features.force-delete', $amenity))
            ->assertRedirect();

        $this->assertDatabaseHas('amenities', ['id' => $amenity->id]);
    }

    public function test_admin_can_create_a_unit_type(): void
    {
        $this->actingAs($this->admin())
            ->post(route('extras.unit-types.store'), ['name' => 'bedsitter', 'label' => 'Bedsitter'])
            ->assertRedirect(route('extras.index', 'unit-types'));

        $this->assertDatabaseHas('unit_types', ['name' => 'bedsitter', 'label' => 'Bedsitter']);
    }

    public function test_unit_type_name_must_be_unique_and_slug_like(): void
    {
        $this->actingAs($this->admin())
            ->post(route('extras.unit-types.store'), ['name' => 'not a slug', 'label' => 'Bad'])
            ->assertSessionHasErrors('name');

        UnitType::create(['name' => 'bedsitter', 'label' => 'Bedsitter']);

        $this->actingAs($this->admin())
            ->post(route('extras.unit-types.store'), ['name' => 'bedsitter', 'label' => 'Duplicate'])
            ->assertSessionHasErrors('name');
    }

    public function test_admin_can_trash_restore_and_permanently_delete_an_unused_unit_type(): void
    {
        $admin = $this->admin();
        $unitType = UnitType::create(['name' => 'bedsitter', 'label' => 'Bedsitter']);

        $this->actingAs($admin)
            ->delete(route('extras.unit-types.destroy', $unitType))
            ->assertRedirect();

        $this->assertSoftDeleted('unit_types', ['id' => $unitType->id]);

        $this->actingAs($admin)
            ->patch(route('extras.unit-types.restore', $unitType))
            ->assertRedirect();

        $this->assertDatabaseHas('unit_types', ['id' => $unitType->id, 'deleted_at' => null]);

        $unitType->delete();

        $this->actingAs($admin)
            ->delete(route('extras.unit-types.force-delete', $unitType))
            ->assertRedirect();

        $this->assertDatabaseMissing('unit_types', ['id' => $unitType->id]);
    }

    public function test_force_deleting_a_unit_type_still_in_use_fails_gracefully(): void
    {
        $admin = $this->admin();
        $unitType = UnitType::create(['name' => 'bedsitter', 'label' => 'Bedsitter']);
        Unit::factory()->create(['unit_type_id' => $unitType->id]);
        $unitType->delete();

        $this->actingAs($admin)
            ->delete(route('extras.unit-types.force-delete', $unitType))
            ->assertRedirect();

        $this->assertDatabaseHas('unit_types', ['id' => $unitType->id]);
    }
}
