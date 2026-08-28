<?php

namespace Tests\Feature;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Models\Document;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TenantManagementTest extends TestCase
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

    public function test_user_without_permission_cannot_view_tenants(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('tenants.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_tenants(): void
    {
        Tenant::factory()->count(2)->create();

        $this->actingAs($this->admin())
            ->get(route('tenants.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('tenants/index')
                ->has('tenants.data', 2)
            );
    }

    public function test_admin_can_create_a_tenant(): void
    {
        $this->actingAs($this->admin())
            ->post(route('tenants.store'), [
                'name' => 'Aisha Bello',
                'email' => 'aisha@example.com',
                'phone' => '+256700000000',
                'id_number' => 'ID12345',
                'address' => 'Plot 4, Kisementi',
                'notes' => 'Prefers email contact.',
            ])
            ->assertRedirect(route('tenants.index'));

        $this->assertDatabaseHas('tenants', [
            'name' => 'Aisha Bello',
            'email' => 'aisha@example.com',
        ]);
    }

    public function test_admin_can_create_a_company_tenant_with_compliance_fields(): void
    {
        $this->actingAs($this->admin())
            ->post(route('tenants.store'), [
                'name' => 'Kessler Holdings Ltd',
                'type' => 'company',
                'id_number' => 'URSB-998877',
                'tin' => '1002003004',
                'id_document_type' => 'company_registration_certificate',
                'contact_person_name' => 'Jonah Kessler',
                'contact_person_phone' => '+256700000001',
                'contact_person_email' => 'jonah@kesslerholdings.com',
            ])
            ->assertRedirect(route('tenants.index'));

        $this->assertDatabaseHas('tenants', [
            'name' => 'Kessler Holdings Ltd',
            'type' => 'company',
            'tin' => '1002003004',
            'id_document_type' => 'company_registration_certificate',
            'contact_person_name' => 'Jonah Kessler',
        ]);
    }

    public function test_a_tenant_created_without_a_type_defaults_to_individual(): void
    {
        // Mirrors any caller that predates the company-tenant feature and
        // never sends `type` at all — it must not be forced to error out.
        $this->actingAs($this->admin())
            ->post(route('tenants.store'), ['name' => 'Legacy Caller'])
            ->assertRedirect(route('tenants.index'));

        $this->assertDatabaseHas('tenants', [
            'name' => 'Legacy Caller',
            'type' => 'individual',
        ]);
    }

    public function test_tenant_name_is_required(): void
    {
        $this->actingAs($this->admin())
            ->post(route('tenants.store'), ['name' => ''])
            ->assertSessionHasErrors('name');
    }

    public function test_admin_can_update_a_tenant(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Old Name']);

        $this->actingAs($this->admin())
            ->put(route('tenants.update', $tenant), [
                'name' => 'New Name',
                'email' => $tenant->email,
            ])
            ->assertRedirect(route('tenants.index'));

        $this->assertSame('New Name', $tenant->fresh()->name);
    }

    public function test_tenant_show_page_includes_leases_payments_schedule_and_documents(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $lease = Lease::factory()->create(['status' => LeaseStatus::Active, 'rent_amount' => 500000]);
        $lease->tenants()->attach($tenant->id);
        // The lease observer auto-generates its own payment schedules on
        // create — cleared here so the outstanding-balance assertion below
        // reflects only the schedule this test explicitly sets up.
        $lease->paymentSchedules()->delete();

        Payment::factory()->create([
            'lease_id' => $lease->id,
            'tenant_id' => $tenant->id,
            'status' => PaymentStatus::Completed,
            'amount' => 500000,
        ]);

        $schedule = PaymentSchedule::factory()->create([
            'lease_id' => $lease->id,
            'status' => PaymentScheduleStatus::Partial,
            'amount_expected' => 500000,
        ]);
        Payment::factory()->create([
            'lease_id' => $lease->id,
            'payment_schedule_id' => $schedule->id,
            'tenant_id' => $tenant->id,
            'status' => PaymentStatus::Completed,
            'amount' => 200000,
        ]);

        Document::factory()->for($tenant, 'documentable')->create(['title' => 'Trading License']);

        // The default tab ('payments') is deferred — a normal page load
        // must not evaluate any of the three paginated tables.
        $this->actingAs($admin)
            ->get(route('tenants.show', $tenant))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('tenants/show')
                ->where('tableFilters.tab', 'payments')
                ->where('tenant.stats.active_leases_count', 1)
                ->where('tenant.stats.total_paid', '700000.00')
                ->where('tenant.stats.outstanding', '300000.00')
                ->where('tenant.leases.0.id', $lease->id)
                ->where('tenant.leases.0.is_fully_signed', false)
                ->missing('paymentsTable')
                ->missing('upcomingTable')
                ->missing('documentsTable')
            );

        // Partial reloads deferred-fetch each tab's own paginated table.
        // (Partial reloads return raw JSON rather than a rendered view, so
        // they're asserted directly rather than through assertInertia().)
        $this->actingAs($admin)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => Inertia::getVersion(),
                'X-Inertia-Partial-Component' => 'tenants/show',
                'X-Inertia-Partial-Data' => 'paymentsTable,tableFilters',
            ])
            ->get(route('tenants.show', ['tenant' => $tenant, 'tab' => 'payments']))
            ->assertOk()
            ->assertJsonCount(2, 'props.paymentsTable.data')
            ->assertJsonPath('props.paymentsTable.meta.total', 2);

        $this->actingAs($admin)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => Inertia::getVersion(),
                'X-Inertia-Partial-Component' => 'tenants/show',
                'X-Inertia-Partial-Data' => 'upcomingTable,tableFilters',
            ])
            ->get(route('tenants.show', ['tenant' => $tenant, 'tab' => 'upcoming']))
            ->assertOk()
            ->assertJsonCount(1, 'props.upcomingTable.data')
            ->assertJsonPath('props.upcomingTable.data.0.amount_paid', '200000.00');

        $this->actingAs($admin)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => Inertia::getVersion(),
                'X-Inertia-Partial-Component' => 'tenants/show',
                'X-Inertia-Partial-Data' => 'documentsTable,tableFilters',
            ])
            ->get(route('tenants.show', ['tenant' => $tenant, 'tab' => 'documents']))
            ->assertOk()
            ->assertJsonCount(1, 'props.documentsTable.data')
            ->assertJsonPath('props.documentsTable.data.0.title', 'Trading License');
    }

    public function test_admin_can_trash_restore_and_permanently_delete_a_tenant(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)
            ->delete(route('tenants.destroy', $tenant))
            ->assertRedirect();

        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);

        $this->actingAs($admin)
            ->patch(route('tenants.restore', $tenant))
            ->assertRedirect();

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'deleted_at' => null]);

        $tenant->delete();

        $this->actingAs($admin)
            ->delete(route('tenants.force-delete', $tenant))
            ->assertRedirect();

        $this->assertDatabaseMissing('tenants', ['id' => $tenant->id]);
    }
}
