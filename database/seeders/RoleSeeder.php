<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Seed the two default roles. Super Admin is protected (is_system) and
     * bypasses permission checks entirely via Gate::before, so attaching
     * every permission to it here is cosmetic (keeps the Roles page from
     * showing it as "0 permissions"), not what actually grants it access.
     * Manager and Landlord start with no permissions — matches the app's
     * previous behavior where only Admin could manage users/settings — and
     * an admin can grant either role permissions from the Roles page.
     */
    public function run(): void
    {
        $superAdmin = Role::query()->firstOrCreate(
            ['name' => 'Super Admin', 'guard_name' => 'web'],
            ['is_system' => true],
        );
        $superAdmin->syncPermissions(Permission::query()->where('guard_name', 'web')->get());

        Role::query()->firstOrCreate(['name' => 'Manager', 'guard_name' => 'web']);
        Role::query()->firstOrCreate(['name' => 'Landlord', 'guard_name' => 'web']);
    }
}
