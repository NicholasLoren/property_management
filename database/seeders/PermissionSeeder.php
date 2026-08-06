<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\PermissionCategory;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Seed the permission catalog, scoped to the modules that exist today
     * (Users, Roles, Settings). New permissions are added here, as data,
     * when a new module is built — no code changes elsewhere are needed
     * to grant a role access to them.
     */
    public function run(): void
    {
        $catalog = [
            'users' => [
                ['name' => 'users.view', 'label' => 'View users'],
                ['name' => 'users.add', 'label' => 'Add users'],
                ['name' => 'users.edit', 'label' => 'Edit users'],
                ['name' => 'users.delete', 'label' => 'Delete users'],
            ],
            'roles' => [
                ['name' => 'roles.view', 'label' => 'View roles'],
                ['name' => 'roles.add', 'label' => 'Add roles'],
                ['name' => 'roles.edit', 'label' => 'Edit roles'],
                ['name' => 'roles.delete', 'label' => 'Delete roles'],
            ],
            'settings' => [
                ['name' => 'settings.edit', 'label' => 'Edit company settings'],
            ],
            'logs' => [
                ['name' => 'logs.view', 'label' => 'View activity log'],
            ],
            'messages' => [
                ['name' => 'messages.view', 'label' => 'View messages'],
                ['name' => 'messages.send', 'label' => 'Send personal messages'],
                ['name' => 'messages.broadcast', 'label' => 'Send broadcasts'],
            ],
            'properties' => [
                ['name' => 'properties.view', 'label' => 'View properties'],
                ['name' => 'properties.add', 'label' => 'Add properties'],
                ['name' => 'properties.edit', 'label' => 'Edit properties'],
                ['name' => 'properties.delete', 'label' => 'Delete properties'],
            ],
            'units' => [
                ['name' => 'units.view', 'label' => 'View units'],
                ['name' => 'units.add', 'label' => 'Add units'],
                ['name' => 'units.edit', 'label' => 'Edit units'],
                ['name' => 'units.delete', 'label' => 'Delete units'],
            ],
            'tenants' => [
                ['name' => 'tenants.view', 'label' => 'View tenants'],
                ['name' => 'tenants.add', 'label' => 'Add tenants'],
                ['name' => 'tenants.edit', 'label' => 'Edit tenants'],
                ['name' => 'tenants.delete', 'label' => 'Delete tenants'],
            ],
            'leases' => [
                ['name' => 'leases.view', 'label' => 'View leases'],
                ['name' => 'leases.add', 'label' => 'Add leases'],
                ['name' => 'leases.edit', 'label' => 'Edit leases'],
                ['name' => 'leases.delete', 'label' => 'Delete leases'],
            ],
            'landlords' => [
                ['name' => 'landlords.view', 'label' => 'View landlords'],
            ],
        ];

        foreach ($catalog as $categoryName => $permissions) {
            $category = PermissionCategory::query()->where('name', $categoryName)->firstOrFail();

            foreach ($permissions as $permission) {
                Permission::query()->firstOrCreate(
                    ['name' => $permission['name'], 'guard_name' => 'web'],
                    ['label' => $permission['label'], 'permission_category_id' => $category->id],
                );
            }
        }
    }
}
