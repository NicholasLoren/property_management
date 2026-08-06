<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                ->has('landlord.properties', 1)
            );
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
