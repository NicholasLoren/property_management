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
        ];

        foreach ($categories as $category) {
            PermissionCategory::query()->firstOrCreate(
                ['name' => $category['name']],
                ['label' => $category['label']],
            );
        }
    }
}
