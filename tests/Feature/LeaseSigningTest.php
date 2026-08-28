<?php

namespace Tests\Feature;

use App\Enums\SignerRole;
use App\Models\Lease;
use App\Models\LeaseSigningLink;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\LeaseSigningRequested;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LeaseSigningTest extends TestCase
{
    use RefreshDatabase;

    private const FAKE_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

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

    public function test_admin_can_record_an_in_person_landlord_signature(): void
    {
        $lease = Lease::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('leases.signatures.store', $lease), [
                'signer_role' => SignerRole::Landlord->value,
                'signer_name' => 'Priya Shah',
                'signature_image' => self::FAKE_SIGNATURE,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('lease_signatures', [
            'lease_id' => $lease->id,
            'signer_role' => 'landlord',
            'tenant_id' => null,
            'signer_name' => 'Priya Shah',
        ]);
    }

    public function test_admin_can_record_an_in_person_tenant_signature(): void
    {
        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create();
        $lease->tenants()->attach($tenant->id);

        $this->actingAs($this->admin())
            ->post(route('leases.signatures.store', $lease), [
                'signer_role' => SignerRole::Tenant->value,
                'tenant_id' => $tenant->id,
                'signer_name' => $tenant->name,
                'signature_image' => self::FAKE_SIGNATURE,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('lease_signatures', [
            'lease_id' => $lease->id,
            'signer_role' => 'tenant',
            'tenant_id' => $tenant->id,
        ]);

        $this->assertTrue($lease->fresh()->tenants()->exists());
    }

    public function test_signing_as_a_tenant_not_on_the_lease_is_rejected(): void
    {
        $lease = Lease::factory()->create();
        $outsider = Tenant::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('leases.signatures.store', $lease), [
                'signer_role' => SignerRole::Tenant->value,
                'tenant_id' => $outsider->id,
                'signer_name' => $outsider->name,
                'signature_image' => self::FAKE_SIGNATURE,
            ])
            ->assertSessionHasErrors('tenant_id');

        $this->assertDatabaseMissing('lease_signatures', ['lease_id' => $lease->id]);
    }

    public function test_user_without_permission_cannot_record_a_signature(): void
    {
        $manager = User::factory()->create();
        $lease = Lease::factory()->create();

        $this->actingAs($manager)
            ->post(route('leases.signatures.store', $lease), [
                'signer_role' => SignerRole::Landlord->value,
                'signer_name' => 'Someone',
                'signature_image' => self::FAKE_SIGNATURE,
            ])
            ->assertForbidden();
    }

    public function test_lease_is_fully_signed_only_once_landlord_and_every_tenant_have_signed(): void
    {
        $lease = Lease::factory()->create();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $lease->tenants()->attach([$tenantA->id, $tenantB->id]);

        $this->assertFalse($lease->fresh()->isFullySigned());

        $lease->signatures()->create([
            'signer_role' => SignerRole::Landlord,
            'signer_name' => 'Landlord',
            'signature_image' => self::FAKE_SIGNATURE,
            'signed_at' => now(),
        ]);
        $lease->signatures()->create([
            'signer_role' => SignerRole::Tenant,
            'tenant_id' => $tenantA->id,
            'signer_name' => $tenantA->name,
            'signature_image' => self::FAKE_SIGNATURE,
            'signed_at' => now(),
        ]);

        $this->assertFalse($lease->fresh()->load('signatures', 'tenants')->isFullySigned());

        $lease->signatures()->create([
            'signer_role' => SignerRole::Tenant,
            'tenant_id' => $tenantB->id,
            'signer_name' => $tenantB->name,
            'signature_image' => self::FAKE_SIGNATURE,
            'signed_at' => now(),
        ]);

        $this->assertTrue($lease->fresh()->load('signatures', 'tenants')->isFullySigned());
    }

    public function test_admin_can_send_a_remote_signing_link_and_it_notifies_the_tenant_by_mail(): void
    {
        Notification::fake();

        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create(['email' => 'tenant@example.com', 'phone' => null]);
        $lease->tenants()->attach($tenant->id);

        $this->actingAs($this->admin())
            ->post(route('leases.signing-links.store', $lease), ['tenant_id' => $tenant->id])
            ->assertRedirect();

        $this->assertDatabaseHas('lease_signing_links', [
            'lease_id' => $lease->id,
            'tenant_id' => $tenant->id,
            'used_at' => null,
        ]);

        Notification::assertSentOnDemand(LeaseSigningRequested::class);
    }

    public function test_a_tenant_can_sign_remotely_via_a_valid_link(): void
    {
        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create();
        $lease->tenants()->attach($tenant->id);

        $link = LeaseSigningLink::create([
            'lease_id' => $lease->id,
            'tenant_id' => $tenant->id,
            'token' => LeaseSigningLink::generateToken(),
            'expires_at' => now()->addDays(7),
        ]);

        $this->get(route('signing.show', $link->token))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('signing/show')
                ->where('status', 'ready')
                ->where('tenantName', $tenant->name)
            );

        $this->post(route('signing.store', $link->token), [
            'signature_image' => self::FAKE_SIGNATURE,
        ])->assertRedirect();

        $this->assertDatabaseHas('lease_signatures', [
            'lease_id' => $lease->id,
            'signer_role' => 'tenant',
            'tenant_id' => $tenant->id,
        ]);
        $this->assertNotNull($link->fresh()->used_at);
    }

    public function test_an_expired_signing_link_is_rejected(): void
    {
        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create();
        $lease->tenants()->attach($tenant->id);

        $link = LeaseSigningLink::create([
            'lease_id' => $lease->id,
            'tenant_id' => $tenant->id,
            'token' => LeaseSigningLink::generateToken(),
            'expires_at' => now()->subDay(),
        ]);

        $this->get(route('signing.show', $link->token))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('signing/show')
                ->where('status', 'expired')
            );

        $this->post(route('signing.store', $link->token), [
            'signature_image' => self::FAKE_SIGNATURE,
        ])->assertSessionHasErrors('signature_image');

        $this->assertDatabaseMissing('lease_signatures', ['lease_id' => $lease->id]);
    }

    public function test_a_used_signing_link_cannot_be_reused(): void
    {
        $lease = Lease::factory()->create();
        $tenant = Tenant::factory()->create();
        $lease->tenants()->attach($tenant->id);

        $link = LeaseSigningLink::create([
            'lease_id' => $lease->id,
            'tenant_id' => $tenant->id,
            'token' => LeaseSigningLink::generateToken(),
            'expires_at' => now()->addDays(7),
        ]);
        $link->forceFill(['used_at' => now()->subHour()])->save();

        $this->get(route('signing.show', $link->token))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('signing/show')
                ->where('status', 'used')
            );

        $this->post(route('signing.store', $link->token), [
            'signature_image' => self::FAKE_SIGNATURE,
        ])->assertSessionHasErrors('signature_image');

        $this->assertDatabaseMissing('lease_signatures', ['lease_id' => $lease->id]);
    }

    public function test_an_unknown_signing_token_returns_not_found_status(): void
    {
        $this->get(route('signing.show', 'not-a-real-token'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('signing/show')
                ->where('status', 'not_found')
            );
    }
}
