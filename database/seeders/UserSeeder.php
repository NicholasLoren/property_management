<?php

namespace Database\Seeders;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed the demo Steward team and landlord accounts.
     */
    public function run(): void
    {
        $people = [
            ['name' => 'Priya Shah', 'email' => 'priya.shah@steward.app', 'role' => 'Super Admin', 'status' => UserStatus::Active, 'active_minutes_ago' => 0],
            ['name' => 'Marcus Lee', 'email' => 'marcus.lee@steward.app', 'role' => 'Manager', 'status' => UserStatus::Active, 'active_minutes_ago' => 120],
            ['name' => 'Elena Novak', 'email' => 'elena.novak@steward.app', 'role' => 'Manager', 'status' => UserStatus::Invited, 'active_minutes_ago' => null],
            ['name' => 'Rowan Ortiz', 'email' => 'rowan@brightgate-holdings.com', 'role' => 'Landlord', 'status' => UserStatus::Active, 'active_minutes_ago' => 4320],
            ['name' => 'Sofia Marchetti', 'email' => 'sofia.marchetti@steward.app', 'role' => 'Manager', 'status' => UserStatus::Active, 'active_minutes_ago' => 18],
            ['name' => 'David Okafor', 'email' => 'd.okafor@meridianholdings.co', 'role' => 'Landlord', 'status' => UserStatus::Suspended, 'active_minutes_ago' => 60480],
            ['name' => 'Tariq Haddad', 'email' => 'tariq.haddad@steward.app', 'role' => 'Manager', 'status' => UserStatus::Active, 'active_minutes_ago' => 45],
            ['name' => 'Wren Callahan', 'email' => 'wren@callahan-props.com', 'role' => 'Landlord', 'status' => UserStatus::Active, 'active_minutes_ago' => 7200],
            ['name' => 'Grace Whitfield', 'email' => 'grace.whitfield@steward.app', 'role' => 'Manager', 'status' => UserStatus::Active, 'active_minutes_ago' => 60],
            ['name' => 'Felix Ndiaye', 'email' => 'felix@ndiaye-estates.com', 'role' => 'Landlord', 'status' => UserStatus::Invited, 'active_minutes_ago' => null],
            ['name' => 'Anya Petrova', 'email' => 'anya.petrova@steward.app', 'role' => 'Super Admin', 'status' => UserStatus::Active, 'active_minutes_ago' => 240],
            ['name' => 'Oscar Bramwell', 'email' => 'oscar.bramwell@steward.app', 'role' => 'Manager', 'status' => UserStatus::Suspended, 'active_minutes_ago' => 90720],
        ];

        foreach ($people as $person) {
            $user = User::factory()->create([
                'name' => $person['name'],
                'email' => $person['email'],
                'status' => $person['status'],
                'last_active_at' => $person['active_minutes_ago'] === null ? null : now()->subMinutes($person['active_minutes_ago']),
            ]);

            $user->assignRole($person['role']);
        }
    }
}
