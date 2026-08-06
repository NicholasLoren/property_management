<?php

namespace Tests\Feature;

use App\Enums\MaintenanceStatus;
use App\Enums\TransactionType;
use App\Models\MaintenanceRequest;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MaintenanceManagementTest extends TestCase
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

    public function test_user_without_permission_cannot_view_maintenance(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('maintenance.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_maintenance_requests(): void
    {
        MaintenanceRequest::factory()->count(2)->create();

        $this->actingAs($this->admin())
            ->get(route('maintenance.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('maintenance/index')
                ->has('requests.data', 2)
            );
    }

    public function test_admin_can_create_a_maintenance_request(): void
    {
        $admin = $this->admin();
        $unit = Unit::factory()->create();

        $this->actingAs($admin)
            ->post(route('maintenance.store'), [
                'unit_id' => (string) $unit->id,
                'title' => 'Leaking kitchen tap',
                'priority' => 'high',
                'status' => 'open',
            ])
            ->assertRedirect(route('maintenance.index'));

        $this->assertDatabaseHas('maintenance_requests', [
            'unit_id' => $unit->id,
            'title' => 'Leaking kitchen tap',
            'priority' => 'high',
            'status' => 'open',
        ]);
    }

    public function test_completing_a_request_with_a_cost_creates_a_linked_expense(): void
    {
        $admin = $this->admin();
        $unit = Unit::factory()->create();

        $this->actingAs($admin)
            ->post(route('maintenance.store'), [
                'unit_id' => (string) $unit->id,
                'title' => 'Replace water heater',
                'priority' => 'high',
                'status' => 'completed',
                'cost' => 250000,
                'completed_at' => now()->toDateString(),
            ])
            ->assertRedirect(route('maintenance.index'));

        $maintenanceRequest = MaintenanceRequest::query()->where('title', 'Replace water heater')->firstOrFail();
        $expense = Transaction::query()->where('maintenance_request_id', $maintenanceRequest->id)->first();

        $this->assertNotNull($expense);
        $this->assertSame(TransactionType::Expense, $expense->type);
        $this->assertSame('250000.00', (string) $expense->amount);
        $this->assertSame($unit->property_id, $expense->property_id);
    }

    public function test_opening_a_request_without_completing_it_does_not_create_an_expense(): void
    {
        $admin = $this->admin();
        $unit = Unit::factory()->create();

        $this->actingAs($admin)
            ->post(route('maintenance.store'), [
                'unit_id' => (string) $unit->id,
                'title' => 'Fix door hinge',
                'priority' => 'low',
                'status' => 'open',
                'cost' => 15000,
            ])
            ->assertRedirect(route('maintenance.index'));

        $this->assertSame(0, Transaction::query()->count());
    }

    public function test_updating_the_cost_on_an_already_completed_request_updates_the_linked_expense(): void
    {
        $admin = $this->admin();
        $maintenanceRequest = MaintenanceRequest::factory()->create([
            'status' => MaintenanceStatus::Completed,
            'cost' => 100000,
            'completed_at' => now(),
        ]);
        $maintenanceRequest->update(['status' => MaintenanceStatus::Completed]);

        // Trigger the initial sync via an update (factories don't run through the controller).
        $this->actingAs($admin)
            ->put(route('maintenance.update', $maintenanceRequest), [
                'title' => $maintenanceRequest->title,
                'priority' => $maintenanceRequest->priority->value,
                'status' => 'completed',
                'cost' => 100000,
                'completed_at' => $maintenanceRequest->completed_at->toDateString(),
            ])
            ->assertRedirect(route('maintenance.index'));

        $this->assertSame(1, Transaction::query()->where('maintenance_request_id', $maintenanceRequest->id)->count());

        $this->actingAs($admin)
            ->put(route('maintenance.update', $maintenanceRequest), [
                'title' => $maintenanceRequest->title,
                'priority' => $maintenanceRequest->priority->value,
                'status' => 'completed',
                'cost' => 175000,
                'completed_at' => $maintenanceRequest->completed_at->toDateString(),
            ])
            ->assertRedirect(route('maintenance.index'));

        $this->assertSame(1, Transaction::query()->where('maintenance_request_id', $maintenanceRequest->id)->count());
        $this->assertSame('175000.00', (string) Transaction::query()->where('maintenance_request_id', $maintenanceRequest->id)->first()->amount);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_a_maintenance_request(): void
    {
        $admin = $this->admin();
        $maintenanceRequest = MaintenanceRequest::factory()->create();

        $this->actingAs($admin)
            ->delete(route('maintenance.destroy', $maintenanceRequest))
            ->assertRedirect();

        $this->assertSoftDeleted('maintenance_requests', ['id' => $maintenanceRequest->id]);

        $this->actingAs($admin)
            ->patch(route('maintenance.restore', $maintenanceRequest))
            ->assertRedirect();

        $this->assertDatabaseHas('maintenance_requests', ['id' => $maintenanceRequest->id, 'deleted_at' => null]);

        $maintenanceRequest->delete();

        $this->actingAs($admin)
            ->delete(route('maintenance.force-delete', $maintenanceRequest))
            ->assertRedirect();

        $this->assertDatabaseMissing('maintenance_requests', ['id' => $maintenanceRequest->id]);
    }
}
