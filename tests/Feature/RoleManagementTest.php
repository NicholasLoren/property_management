<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RoleManagementTest extends TestCase
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

    private function superAdmin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_user_without_permission_cannot_view_roles(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('roles.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_roles(): void
    {
        $this->actingAs($this->superAdmin())
            ->get(route('roles.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('roles/index')
                ->has('roles.data', 3)
            );
    }

    public function test_create_and_edit_pages_are_permission_gated(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');
        $role = Role::query()->where('name', 'Manager')->firstOrFail();

        $this->actingAs($manager)->get(route('roles.create'))->assertForbidden();
        $this->actingAs($manager)->get(route('roles.edit', $role))->assertForbidden();

        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->get(route('roles.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('roles/form')
                ->has('permissionCategories')
                ->missing('role')
            );

        $this->actingAs($admin)
            ->get(route('roles.edit', $role))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('roles/form')
                ->where('role.name', 'Manager')
            );
    }

    public function test_admin_can_create_a_role_with_permissions(): void
    {
        $admin = $this->superAdmin();
        $permissionIds = Permission::query()->whereIn('name', ['users.view', 'users.add'])->pluck('id')->all();

        $this->actingAs($admin)
            ->post(route('roles.store'), [
                'name' => 'Property Manager',
                'description' => 'Handles day-to-day property operations.',
                'permissions' => $permissionIds,
            ])
            ->assertRedirect();

        $role = Role::query()->where('name', 'Property Manager')->firstOrFail();
        $this->assertSame('Handles day-to-day property operations.', $role->description);
        $this->assertTrue($role->hasPermissionTo('users.view'));
        $this->assertTrue($role->hasPermissionTo('users.add'));
        $this->assertFalse($role->hasPermissionTo('users.delete'));
    }

    public function test_admin_can_update_a_role(): void
    {
        $admin = $this->superAdmin();
        $role = Role::query()->create(['name' => 'Property Manager', 'guard_name' => 'web']);
        $viewPermission = Permission::query()->where('name', 'users.view')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('roles.update', $role), [
                'name' => 'Portfolio Manager',
                'description' => 'Updated description.',
                'permissions' => [$viewPermission->id],
            ])
            ->assertRedirect();

        $role->refresh();
        $this->assertSame('Portfolio Manager', $role->name);
        $this->assertSame('Updated description.', $role->description);
        $this->assertTrue($role->hasPermissionTo('users.view'));
    }

    public function test_super_admin_role_cannot_be_edited_or_deleted(): void
    {
        $admin = $this->superAdmin();
        $superAdminRole = Role::query()->where('name', 'Super Admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('roles.update', $superAdminRole), [
                'name' => 'Renamed',
                'permissions' => [],
            ])
            ->assertForbidden();

        $this->actingAs($admin)
            ->delete(route('roles.destroy', $superAdminRole))
            ->assertForbidden();
    }

    public function test_role_with_assigned_users_cannot_be_trashed(): void
    {
        $admin = $this->superAdmin();
        $role = Role::query()->where('name', 'Manager')->firstOrFail();
        User::factory()->create()->assignRole('Manager');

        $this->actingAs($admin)
            ->delete(route('roles.destroy', $role))
            ->assertSessionHasErrors('role');

        $this->assertDatabaseHas('roles', ['id' => $role->id, 'deleted_at' => null]);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_an_unused_role(): void
    {
        $admin = $this->superAdmin();
        $role = Role::query()->create(['name' => 'Unused Role', 'guard_name' => 'web']);

        $this->actingAs($admin)
            ->delete(route('roles.destroy', $role))
            ->assertRedirect();

        $this->assertSoftDeleted('roles', ['id' => $role->id]);

        $this->actingAs($admin)
            ->patch(route('roles.restore', $role))
            ->assertRedirect();

        $this->assertDatabaseHas('roles', ['id' => $role->id, 'deleted_at' => null]);

        $role->delete();

        $this->actingAs($admin)
            ->delete(route('roles.force-delete', $role))
            ->assertRedirect();

        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    public function test_admin_can_export_roles_as_pdf_and_excel(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->get(route('roles.export', 'pdf'))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($admin)
            ->get(route('roles.export', 'excel'))
            ->assertOk()
            ->assertHeader(
                'content-type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
    }

    public function test_non_admin_cannot_export_roles(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('roles.export', 'pdf'))
            ->assertForbidden();
    }
}
