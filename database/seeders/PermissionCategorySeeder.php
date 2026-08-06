<?php

namespace Database\Seeders;

use App\Models\PermissionCategory;
use Illuminate\Database\Seeder;

class PermissionCategorySeeder extends Seeder
{
    /**
     * Seed the permission categories that group the permission catalog on
     * the Roles page. New modules (Buildings, Units, Tenants, ...) add
     * their own category here as they're built.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'users', 'label' => 'Users'],
            ['name' => 'roles', 'label' => 'Roles'],
            ['name' => 'settings', 'label' => 'Settings'],
            ['name' => 'logs', 'label' => 'Activity log'],
            ['name' => 'messages', 'label' => 'Messages'],
            ['name' => 'properties', 'label' => 'Properties'],
            ['name' => 'units', 'label' => 'Units'],
            ['name' => 'tenants', 'label' => 'Tenants'],
            ['name' => 'leases', 'label' => 'Leases'],
            ['name' => 'landlords', 'label' => 'Landlords'],
            ['name' => 'maintenance', 'label' => 'Maintenance'],
            ['name' => 'payments', 'label' => 'Payments'],
            ['name' => 'expenses', 'label' => 'Expenses'],
            ['name' => 'incomes', 'label' => 'Income'],
            ['name' => 'documents', 'label' => 'Documents'],
            ['name' => 'reports', 'label' => 'Reports'],
            ['name' => 'extras', 'label' => 'Extras'],
        ];

        foreach ($categories as $category) {
            PermissionCategory::query()->firstOrCreate(
                ['name' => $category['name']],
                ['label' => $category['label']],
            );
        }
    }
}
