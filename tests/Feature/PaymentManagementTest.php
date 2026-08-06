<?php

namespace Tests\Feature;

use App\Models\Lease;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PaymentManagementTest extends TestCase
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

    public function test_user_without_permission_cannot_view_payments(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('payments.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_payments(): void
    {
        Payment::factory()->count(2)->create();

        $this->actingAs($this->admin())
            ->get(route('payments.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('payments/index')
                ->has('payments.data', 2)
            );
    }

    public function test_admin_can_record_a_payment_for_a_tenant_on_the_lease(): void
    {
        $admin = $this->admin();
        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create();
        $lease->tenants()->attach($tenant->id);

        $this->actingAs($admin)
            ->post(route('payments.store'), [
                'lease_id' => (string) $lease->id,
                'tenant_id' => (string) $tenant->id,
                'amount' => 450000,
                'payment_date' => now()->toDateString(),
                'method' => 'mobile_money',
                'status' => 'completed',
            ])
            ->assertRedirect(route('payments.index'));

        $this->assertDatabaseHas('payments', [
            'lease_id' => $lease->id,
            'tenant_id' => $tenant->id,
            'amount' => 450000,
        ]);

        $payment = Payment::query()->where('lease_id', $lease->id)->firstOrFail();
        $this->assertSame($admin->id, $payment->created_by);
    }

    public function test_payment_rejects_a_tenant_not_on_the_lease(): void
    {
        $admin = $this->admin();
        $lease = Lease::factory()->create();
        $outsider = Tenant::factory()->create();

        $this->actingAs($admin)
            ->post(route('payments.store'), [
                'lease_id' => (string) $lease->id,
                'tenant_id' => (string) $outsider->id,
                'amount' => 450000,
                'payment_date' => now()->toDateString(),
                'method' => 'cash',
                'status' => 'completed',
            ])
            ->assertSessionHasErrors('tenant_id');

        $this->assertDatabaseMissing('payments', ['lease_id' => $lease->id]);
    }

    public function test_lease_id_cannot_be_changed_on_update(): void
    {
        $admin = $this->admin();
        $originalLease = Lease::factory()->create();
        $otherLease = Lease::factory()->create();
        $payment = Payment::factory()->create(['lease_id' => $originalLease->id]);

        $this->actingAs($admin)
            ->put(route('payments.update', $payment), [
                'lease_id' => (string) $otherLease->id,
                'amount' => $payment->amount,
                'payment_date' => $payment->payment_date->toDateString(),
                'method' => $payment->method->value,
                'status' => $payment->status->value,
            ])
            ->assertRedirect(route('payments.index'));

        $this->assertSame($originalLease->id, $payment->fresh()->lease_id);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_a_payment(): void
    {
        $admin = $this->admin();
        $payment = Payment::factory()->create();

        $this->actingAs($admin)
            ->delete(route('payments.destroy', $payment))
            ->assertRedirect();

        $this->assertSoftDeleted('payments', ['id' => $payment->id]);

        $this->actingAs($admin)
            ->patch(route('payments.restore', $payment))
            ->assertRedirect();

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'deleted_at' => null]);

        $payment->delete();

        $this->actingAs($admin)
            ->delete(route('payments.force-delete', $payment))
            ->assertRedirect();

        $this->assertDatabaseMissing('payments', ['id' => $payment->id]);
    }
}
