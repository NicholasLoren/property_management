<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\User;
use App\Notifications\UserInvited;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserManagementTest extends TestCase
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

    public function test_non_admin_cannot_view_users(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('users.index'))
            ->assertForbidden();
    }

    public function test_admin_can_view_users(): void
    {
        $admin = $this->superAdmin();

        User::factory()->count(3)->create()->each(fn (User $user) => $user->assignRole('Manager'));

        $this->actingAs($admin)
            ->get(route('users.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('users/index')
                ->has('users.data', 4)
            );
    }

    public function test_create_edit_and_show_pages_are_permission_gated(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');
        $target = User::factory()->create();
        $target->assignRole('Manager');

        $this->actingAs($manager)->get(route('users.create'))->assertForbidden();
        $this->actingAs($manager)->get(route('users.edit', $target))->assertForbidden();
        $this->actingAs($manager)->get(route('users.show', $target))->assertForbidden();

        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->get(route('users.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('users/form')
                ->missing('user')
            );

        $this->actingAs($admin)
            ->get(route('users.edit', $target))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('users/form')
                ->where('user.id', $target->id)
            );

        $this->actingAs($admin)
            ->get(route('users.show', $target))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('users/show')
                ->where('user.id', $target->id)
                ->where('user.landlord', null)
            );
    }

    public function test_admin_can_invite_a_user(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Jamie Rivera',
                'email' => 'jamie@example.com',
                'role' => 'Manager',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'email' => 'jamie@example.com',
            'status' => UserStatus::Invited->value,
        ]);
        $this->assertTrue(User::whereEmail('jamie@example.com')->firstOrFail()->hasRole('Manager'));
    }

    public function test_inviting_a_user_emails_them_a_working_password_reset_link(): void
    {
        Notification::fake();

        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Jamie Rivera',
                'email' => 'jamie@example.com',
                'role' => 'Manager',
            ])
            ->assertRedirect();

        $user = User::whereEmail('jamie@example.com')->firstOrFail();

        Notification::assertSentTo(
            $user,
            function (UserInvited $notification) use ($user) {
                $mail = $notification->toMail($user);
                $actionUrl = $mail->actionUrl;

                $this->assertStringContainsString('/reset-password/', $actionUrl);
                $this->assertStringContainsString('email='.urlencode($user->email), $actionUrl);

                // The token embedded in the link is a real, usable
                // password-reset token — not a decoy.
                return Password::tokenExists($user, $this->tokenFromUrl($actionUrl));
            },
        );
    }

    private function tokenFromUrl(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);

        return basename((string) $path);
    }

    public function test_admin_can_set_a_password_directly_when_inviting_a_user(): void
    {
        Notification::fake();

        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Jamie Rivera',
                'email' => 'jamie@example.com',
                'role' => 'Manager',
                'password' => 'a-strong-password-123',
                'password_confirmation' => 'a-strong-password-123',
            ])
            ->assertRedirect();

        $user = User::whereEmail('jamie@example.com')->firstOrFail();

        // A password was chosen for them directly, so no "set your
        // password" email is needed.
        Notification::assertNotSentTo($user, UserInvited::class);

        $this->assertTrue(
            auth()->validate(['email' => $user->email, 'password' => 'a-strong-password-123']),
        );
    }

    public function test_invite_password_and_confirmation_must_match(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Jamie Rivera',
                'email' => 'jamie@example.com',
                'role' => 'Manager',
                'password' => 'a-strong-password-123',
                'password_confirmation' => 'does-not-match',
            ])
            ->assertSessionHasErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'jamie@example.com']);
    }

    public function test_admin_can_reset_an_existing_users_password(): void
    {
        $admin = $this->superAdmin();
        $target = User::factory()->create();
        $target->assignRole('Manager');

        $this->actingAs($admin)
            ->patch(route('users.update', $target), [
                'name' => $target->name,
                'email' => $target->email,
                'role' => 'Manager',
                'status' => UserStatus::Active->value,
                'password' => 'a-brand-new-password-456',
                'password_confirmation' => 'a-brand-new-password-456',
            ])
            ->assertRedirect();

        $this->assertTrue(
            auth()->validate(['email' => $target->email, 'password' => 'a-brand-new-password-456']),
        );
    }

    public function test_updating_a_user_without_a_password_leaves_it_unchanged(): void
    {
        $admin = $this->superAdmin();
        $target = User::factory()->create(['password' => 'original-password-789']);
        $target->assignRole('Manager');

        $this->actingAs($admin)
            ->patch(route('users.update', $target), [
                'name' => 'Renamed',
                'email' => $target->email,
                'role' => 'Manager',
                'status' => UserStatus::Active->value,
            ])
            ->assertRedirect();

        $this->assertTrue(
            auth()->validate(['email' => $target->email, 'password' => 'original-password-789']),
        );
    }

    public function test_admin_can_update_a_user(): void
    {
        $admin = $this->superAdmin();

        $target = User::factory()->create();
        $target->assignRole('Manager');

        $this->actingAs($admin)
            ->patch(route('users.update', $target), [
                'name' => 'Updated Name',
                'email' => $target->email,
                'role' => 'Landlord',
                'status' => UserStatus::Suspended->value,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'name' => 'Updated Name',
            'status' => UserStatus::Suspended->value,
        ]);
        $target->refresh();
        $this->assertTrue($target->hasRole('Landlord'));
        $this->assertFalse($target->hasRole('Manager'));
    }

    public function test_admin_can_invite_a_landlord_with_additional_details_and_a_document(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Wren Callahan',
                'email' => 'wren@callahan-props.com',
                'role' => 'Landlord',
                'landlord_id_number' => 'REG-12345',
                'landlord_address' => '12 Riverside Rd, Kampala',
                'landlord_notes' => 'Owns three buildings downtown.',
                'landlord_id_document' => UploadedFile::fake()->image('id.jpg'),
            ])
            ->assertRedirect();

        $user = User::whereEmail('wren@callahan-props.com')->firstOrFail();
        $this->assertTrue($user->hasRole('Landlord'));

        $this->assertDatabaseHas('landlord_details', [
            'user_id' => $user->id,
            'id_number' => 'REG-12345',
            'address' => '12 Riverside Rd, Kampala',
            'notes' => 'Owns three buildings downtown.',
        ]);

        $user->load('landlordDetail.media');
        $this->assertNotNull($user->landlordDetail->getFirstMedia('id_document'));
    }

    public function test_landlord_details_are_optional_for_a_non_landlord_role(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Marcus Lee',
                'email' => 'marcus@example.com',
                'role' => 'Manager',
            ])
            ->assertRedirect();

        $user = User::whereEmail('marcus@example.com')->firstOrFail();
        $this->assertNull($user->landlordDetail);
    }

    public function test_admin_can_update_and_remove_landlord_document(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();

        $target = User::factory()->create();
        $target->assignRole('Landlord');

        $this->actingAs($admin)
            ->patch(route('users.update', $target), [
                'name' => $target->name,
                'email' => $target->email,
                'role' => 'Landlord',
                'status' => UserStatus::Active->value,
                'landlord_id_number' => 'REG-999',
                'landlord_id_document' => UploadedFile::fake()->image('id.jpg'),
            ])
            ->assertRedirect();

        $target->load('landlordDetail.media');
        $this->assertSame('REG-999', $target->landlordDetail->id_number);
        $this->assertNotNull($target->landlordDetail->getFirstMedia('id_document'));

        $this->actingAs($admin)
            ->patch(route('users.update', $target), [
                'name' => $target->name,
                'email' => $target->email,
                'role' => 'Landlord',
                'status' => UserStatus::Active->value,
                'landlord_id_number' => 'REG-999',
                'landlord_id_document_remove' => true,
            ])
            ->assertRedirect();

        $target->load('landlordDetail.media');
        $this->assertNull($target->landlordDetail->getFirstMedia('id_document'));
    }

    public function test_admin_can_move_a_user_to_trash_and_restore(): void
    {
        $admin = $this->superAdmin();

        $target = User::factory()->create();
        $target->assignRole('Manager');

        $this->actingAs($admin)
            ->delete(route('users.destroy', $target))
            ->assertRedirect();

        $this->assertSoftDeleted('users', ['id' => $target->id]);
        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'deleted_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch(route('users.restore', $target))
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'deleted_at' => null,
            'deleted_by' => null,
        ]);
    }

    public function test_admin_can_permanently_delete_a_trashed_user(): void
    {
        $admin = $this->superAdmin();

        $target = User::factory()->create();
        $target->assignRole('Manager');
        $target->delete();

        $this->actingAs($admin)
            ->delete(route('users.force-delete', $target))
            ->assertRedirect();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_admin_can_export_users_as_pdf_and_excel(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->get(route('users.export', 'pdf'))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($admin)
            ->get(route('users.export', 'excel'))
            ->assertOk()
            ->assertHeader(
                'content-type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
    }

    public function test_export_rejects_an_unknown_format(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->get('/users/export/csv')
            ->assertNotFound();
    }

    public function test_non_admin_cannot_export_users(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('users.export', 'pdf'))
            ->assertForbidden();
    }
}
