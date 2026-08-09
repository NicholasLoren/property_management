<?php

namespace Tests\Feature;

use App\Enums\LeaseStatus;
use App\Enums\UnitStatus;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LeaseManagementTest extends TestCase
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

    /**
     * @return array<string, mixed>
     */
    private function leasePayload(Unit $unit, array $tenantIds, array $overrides = []): array
    {
        return array_merge([
            'unit_id' => (string) $unit->id,
            'tenant_ids' => $tenantIds,
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'rent_amount' => 500000,
            'billing_period' => 'monthly',
            'billing_day' => 1,
            'security_deposit' => 500000,
            'status' => LeaseStatus::Draft->value,
            'notes' => null,
        ], $overrides);
    }

    public function test_user_without_permission_cannot_view_leases(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('leases.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_leases(): void
    {
        $unit = Unit::factory()->create();
        Lease::factory()->count(2)->create(['unit_id' => $unit->id]);

        $this->actingAs($this->admin())
            ->get(route('leases.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('leases/index')
                ->has('leases.data', 2)
            );
    }

    public function test_lease_show_payment_schedule_tab_is_deferred_and_paginated(): void
    {
        $admin = $this->admin();
        $lease = Lease::factory()->create();

        $paid = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => now()->subMonth()->startOfMonth(),
            'period_end' => now()->subMonth()->endOfMonth(),
            'amount_expected' => 500000,
            'status' => 'paid',
        ]);
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $paid->id,
            'amount' => 500000,
            'status' => 'completed',
        ]);
        PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'amount_expected' => 500000,
            'status' => 'pending',
        ]);

        // The default tab ('payments') does not evaluate the schedule table.
        $this->actingAs($admin)
            ->get(route('leases.show', $lease))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('leases/show')
                ->where('scheduleFilters.tab', 'payments')
                ->missing('scheduleTable')
            );

        // Switching to the schedule tab deferred-fetches it, sorted and paginated,
        // with the amount paid aggregated from linked completed payments.
        // (Partial reloads return raw JSON rather than a rendered view, so they're
        // asserted directly rather than through assertInertia().)
        $this->actingAs($admin)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => Inertia::getVersion(),
                'X-Inertia-Partial-Component' => 'leases/show',
                'X-Inertia-Partial-Data' => 'scheduleTable,scheduleFilters',
            ])
            ->get(route('leases.show', ['lease' => $lease, 'tab' => 'schedule']))
            ->assertOk()
            ->assertJsonPath('component', 'leases/show')
            ->assertJsonCount(2, 'props.scheduleTable.data')
            ->assertJsonPath('props.scheduleTable.data.0.amount_paid', '500000.00')
            ->assertJsonPath('props.scheduleTable.data.0.status', 'paid')
            ->assertJsonPath('props.scheduleTable.data.1.status', 'pending')
            ->assertJsonPath('props.scheduleTable.meta.total', 2);
    }

    public function test_admin_can_create_a_lease_with_co_tenants(): void
    {
        $unit = Unit::factory()->create(['status' => UnitStatus::Vacant]);
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('leases.store'), $this->leasePayload($unit, [$tenantA->id, $tenantB->id]))
            ->assertRedirect(route('leases.index'));

        $lease = Lease::query()->where('unit_id', $unit->id)->firstOrFail();
        $this->assertCount(2, $lease->tenants);
        $this->assertTrue($lease->tenants->pluck('id')->contains($tenantA->id));
        $this->assertTrue($lease->tenants->pluck('id')->contains($tenantB->id));
    }

    public function test_creating_an_active_lease_sets_unit_status_to_occupied(): void
    {
        $unit = Unit::factory()->create(['status' => UnitStatus::Vacant]);
        $tenant = Tenant::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('leases.store'), $this->leasePayload($unit, [$tenant->id], [
                'status' => LeaseStatus::Active->value,
            ]))
            ->assertRedirect(route('leases.index'));

        $this->assertSame(UnitStatus::Occupied, $unit->fresh()->status);
    }

    public function test_ending_a_lease_sets_unit_status_back_to_vacant(): void
    {
        $admin = $this->admin();
        $unit = Unit::factory()->create(['status' => UnitStatus::Vacant]);
        $tenant = Tenant::factory()->create();
        $lease = Lease::factory()->create(['unit_id' => $unit->id, 'status' => LeaseStatus::Active]);
        $lease->tenants()->attach($tenant->id);
        $unit->update(['status' => UnitStatus::Occupied]);

        $this->actingAs($admin)
            ->put(route('leases.update', $lease), $this->leasePayload($unit, [$tenant->id], [
                'status' => LeaseStatus::Ended->value,
            ]))
            ->assertRedirect(route('leases.index'));

        $this->assertSame(UnitStatus::Vacant, $unit->fresh()->status);
    }

    public function test_two_active_leases_cannot_coexist_on_the_same_unit(): void
    {
        $unit = Unit::factory()->create(['status' => UnitStatus::Occupied]);
        $tenant = Tenant::factory()->create();
        Lease::factory()->create(['unit_id' => $unit->id, 'status' => LeaseStatus::Active]);

        $this->actingAs($this->admin())
            ->post(route('leases.store'), $this->leasePayload($unit, [$tenant->id], [
                'status' => LeaseStatus::Active->value,
            ]))
            ->assertSessionHasErrors('status');
    }

    public function test_unit_id_cannot_be_changed_on_update(): void
    {
        $admin = $this->admin();
        $originalUnit = Unit::factory()->create();
        $otherUnit = Unit::factory()->create();
        $tenant = Tenant::factory()->create();
        $lease = Lease::factory()->create(['unit_id' => $originalUnit->id]);
        $lease->tenants()->attach($tenant->id);

        $this->actingAs($admin)
            ->put(route('leases.update', $lease), $this->leasePayload($otherUnit, [$tenant->id]))
            ->assertRedirect(route('leases.index'));

        $this->assertSame($originalUnit->id, $lease->fresh()->unit_id);
    }

    public function test_admin_can_trash_restore_and_permanently_delete_a_lease(): void
    {
        $admin = $this->admin();
        $lease = Lease::factory()->create();

        $this->actingAs($admin)
            ->delete(route('leases.destroy', $lease))
            ->assertRedirect();

        $this->assertSoftDeleted('leases', ['id' => $lease->id]);

        $this->actingAs($admin)
            ->patch(route('leases.restore', $lease))
            ->assertRedirect();

        $this->assertDatabaseHas('leases', ['id' => $lease->id, 'deleted_at' => null]);

        $lease->delete();

        $this->actingAs($admin)
            ->delete(route('leases.force-delete', $lease))
            ->assertRedirect();

        $this->assertDatabaseMissing('leases', ['id' => $lease->id]);
    }
}
