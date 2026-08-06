<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TenantManagementTest extends TestCase
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

    public function test_user_without_permission_cannot_view_tenants(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('tenants.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_tenants(): void
    {
        Tenant::factory()->count(2)->create();

        $this->actingAs($this->admin())
            ->get(route('tenants.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('tenants/index')
                ->has('tenants.data', 2)
            );
    }

    public function test_admin_can_create_a_tenant(): void
    {
        $this->actingAs($this->admin())
            ->post(route('tenants.store'), [
                'name' => 'Aisha Bello',
                'email' => 'aisha@example.com',
                'phone' => '+256700000000',
                'id_number' => 'ID12345',
                'address' => 'Plot 4, Kisementi',
                'notes' => 'Prefers email contact.',
            ])
            ->assertRedirect(route('tenants.index'));

        $this->assertDatabaseHas('tenants', [
            'name' => 'Aisha Bello',
            'email' => 'aisha@example.com',
        ]);
    }

    public function test_tenant_name_is_required(): void
    {
        $this->actingAs($this->admin())
            ->post(route('tenants.store'), ['name' => ''])
            ->assertSessionHasErrors('name');
    }

    public function test_admin_can_update_a_tenant(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Old Name']);

        $this->actingAs($this->admin())
            ->put(route('tenants.update', $tenant), [
                'name' => 'New Name',
                'email' => $tenant->email,
            ])
            ->assertRedirect(route('tenants.index'));

        $this->assertSame('New Name', $tenant->fresh()->name);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_a_tenant(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)
            ->delete(route('tenants.destroy', $tenant))
            ->assertRedirect();

        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);

        $this->actingAs($admin)
            ->patch(route('tenants.restore', $tenant))
            ->assertRedirect();

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'deleted_at' => null]);

        $tenant->delete();

        $this->actingAs($admin)
            ->delete(route('tenants.force-delete', $tenant))
            ->assertRedirect();

        $this->assertDatabaseMissing('tenants', ['id' => $tenant->id]);
    }
}
