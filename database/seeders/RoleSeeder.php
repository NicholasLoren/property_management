<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Seed the two default roles. Super Admin and Landlord are both
     * protected (is_system) and cannot be edited or deleted from the Roles
     * page — Super Admin bypasses permission checks entirely via
     * Gate::before, so attaching every permission to it here is cosmetic
     * (keeps the Roles page from showing it as "0 permissions"), not what
     * actually grants it access. Landlord is protected because its name is
     * hardcoded elsewhere (e.g. the user form's landlord-details section).
     * Manager starts with no permissions — matches the app's previous
     * behavior where only Admin could manage users/settings — and an admin
     * can grant it permissions from the Roles page.
     */
    public function run(): void
    {
        $superAdmin = Role::query()->firstOrCreate(
            ['name' => 'Super Admin', 'guard_name' => 'web'],
            ['is_system' => true],
        );
        $superAdmin->syncPermissions(Permission::query()->where('guard_name', 'web')->get());

        Role::query()->firstOrCreate(['name' => 'Manager', 'guard_name' => 'web']);
        Role::query()->updateOrCreate(
            ['name' => 'Landlord', 'guard_name' => 'web'],
            ['is_system' => true],
        );
    }
}
