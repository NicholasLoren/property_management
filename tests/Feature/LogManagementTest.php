<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

class LogManagementTest extends TestCase
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

    public function test_non_admin_cannot_view_logs(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('logs.index'))
            ->assertForbidden();
    }

    public function test_creating_a_user_produces_an_activity_log_entry_with_ip(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Jamie Rivera',
                'email' => 'jamie@example.com',
                'role' => 'Manager',
            ])
            ->assertRedirect();

        $activity = Activity::query()->where('log_name', 'user')->orderByDesc('id')->first();

        $this->assertNotNull($activity);
        $this->assertStringContainsString('Jamie Rivera', $activity->description);
        $this->assertSame($admin->id, $activity->causer_id);
        $this->assertNotNull($activity->getProperty('ip'));
    }

    public function test_logging_in_produces_an_auth_activity_entry(): void
    {
        $admin = User::factory()->create(['email' => 'login-test@example.com']);
        $admin->assignRole('Super Admin');

        $this->post(route('login'), [
            'email' => 'login-test@example.com',
            'password' => 'password',
        ])->assertRedirect();

        $activity = Activity::query()->where('log_name', 'auth')->orderByDesc('id')->first();

        $this->assertNotNull($activity);
        $this->assertSame('Logged in.', $activity->description);
        $this->assertSame($admin->id, $activity->causer_id);
    }

    public function test_admin_can_view_and_search_logs(): void
    {
        $admin = $this->superAdmin();
        $admin->update(['name' => 'Searchable Admin Name']);

        $this->actingAs($admin)
            ->get(route('logs.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('logs/index')
                ->has('logs.data')
            );

        $this->actingAs($admin)
            ->get(route('logs.index', ['search' => 'Searchable Admin Name']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('logs/index')
                ->has('logs.data', 1)
            );
    }

    public function test_logs_have_no_delete_route(): void
    {
        $this->assertFalse(Route::has('logs.destroy'));
    }

    public function test_a_sent_messages_log_entry_includes_the_full_body(): void
    {
        // The description alone ("Sent a personal message: ...") doesn't
        // say what was actually sent — the quick-view panel needs the full
        // body available in the log entry's properties.
        $admin = $this->superAdmin();
        $recipient = User::factory()->create();

        $this->actingAs($admin)
            ->post(route('messages.store'), [
                'type' => 'personal',
                'subject' => 'Quarterly report reminder',
                'body' => 'Please submit your report by Friday.',
                'recipient_user_id' => $recipient->id,
            ])
            ->assertRedirect();

        $this->actingAs($admin)
            ->get(route('logs.index', ['search' => 'Quarterly report reminder']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('logs/index')
                ->has('logs.data', 1)
                ->where('logs.data.0.properties.attributes.body', 'Please submit your report by Friday.')
                ->where('logs.data.0.properties.attributes.subject', 'Quarterly report reminder')
            );
    }
}
