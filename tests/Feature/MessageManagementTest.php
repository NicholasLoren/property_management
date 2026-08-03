<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MessageManagementTest extends TestCase
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

    private function userWithPermissions(array $permissions, string $role = 'Manager'): User
    {
        $roleModel = Role::query()->where('name', $role)->firstOrFail();
        $roleModel->givePermissionTo($permissions);

        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_sending_a_personal_message_creates_one_recipient_row(): void
    {
        $sender = $this->userWithPermissions(['messages.view', 'messages.send']);
        $recipient = User::factory()->create();

        $this->actingAs($sender)
            ->post(route('messages.store'), [
                'type' => 'personal',
                'subject' => 'Hey there',
                'body' => 'Quick question about the lease renewal.',
                'recipient_user_id' => $recipient->id,
            ])
            ->assertRedirect(route('messages.index'));

        $message = Message::query()->where('subject', 'Hey there')->firstOrFail();

        $this->assertSame('personal', $message->type->value);
        $this->assertSame(1, $message->recipients()->count());
        $this->assertTrue($message->recipients->contains($recipient));
    }

    public function test_broadcasting_to_all_users_creates_a_recipient_row_per_user(): void
    {
        $sender = $this->userWithPermissions(['messages.view', 'messages.send', 'messages.broadcast']);
        User::factory()->count(3)->create();
        $expectedRecipientCount = User::query()->where('id', '!=', $sender->id)->count();

        $this->actingAs($sender)
            ->post(route('messages.store'), [
                'type' => 'broadcast',
                'subject' => 'System maintenance',
                'body' => 'The system will be down for maintenance tonight.',
                'recipient_scope' => 'all',
            ])
            ->assertRedirect(route('messages.index'));

        $message = Message::query()->where('subject', 'System maintenance')->firstOrFail();

        $this->assertSame('broadcast', $message->type->value);
        $this->assertSame($expectedRecipientCount, $message->recipients()->count());
        $this->assertFalse($message->recipients->contains($sender));
    }

    public function test_broadcasting_to_a_role_only_reaches_that_roles_users(): void
    {
        $sender = $this->userWithPermissions(['messages.view', 'messages.send', 'messages.broadcast']);
        $landlord = User::factory()->create();
        $landlord->assignRole('Landlord');
        $otherManager = User::factory()->create();
        $otherManager->assignRole('Manager');

        $this->actingAs($sender)
            ->post(route('messages.store'), [
                'type' => 'broadcast',
                'subject' => 'Landlord update',
                'body' => 'New landlord portal features are live.',
                'recipient_scope' => 'role',
                'recipient_role' => 'Landlord',
            ])
            ->assertRedirect(route('messages.index'));

        $message = Message::query()->where('subject', 'Landlord update')->firstOrFail();

        $this->assertSame(1, $message->recipients()->count());
        $this->assertTrue($message->recipients->contains($landlord));
        $this->assertFalse($message->recipients->contains($otherManager));
    }

    public function test_user_without_send_permission_cannot_send_a_personal_message(): void
    {
        $sender = $this->userWithPermissions(['messages.view']);
        $recipient = User::factory()->create();

        $this->actingAs($sender)
            ->post(route('messages.store'), [
                'type' => 'personal',
                'subject' => 'Hey there',
                'body' => 'This should not be allowed.',
                'recipient_user_id' => $recipient->id,
            ])
            ->assertForbidden();
    }

    public function test_user_with_send_but_not_broadcast_permission_cannot_broadcast(): void
    {
        $sender = $this->userWithPermissions(['messages.view', 'messages.send']);

        $this->actingAs($sender)
            ->post(route('messages.store'), [
                'type' => 'broadcast',
                'subject' => 'Unauthorized broadcast',
                'body' => 'This should not be allowed.',
                'recipient_scope' => 'all',
            ])
            ->assertForbidden();
    }

    public function test_viewing_a_received_message_marks_it_read(): void
    {
        $sender = $this->userWithPermissions(['messages.view', 'messages.send']);
        $recipient = $this->userWithPermissions(['messages.view'], 'Landlord');

        $message = Message::create([
            'sender_id' => $sender->id,
            'type' => 'personal',
            'subject' => 'Read receipt test',
            'body' => 'Checking read status.',
        ]);
        $message->recipients()->attach($recipient->id);

        $this->actingAs($recipient)
            ->get(route('messages.show', $message))
            ->assertOk();

        $pivot = $message->recipients()->where('user_id', $recipient->id)->first()->pivot;

        $this->assertNotNull($pivot->read_at);
    }

    public function test_a_user_who_is_neither_sender_nor_recipient_cannot_view_the_message(): void
    {
        $sender = $this->userWithPermissions(['messages.view', 'messages.send']);
        $recipient = $this->userWithPermissions(['messages.view'], 'Landlord');
        $bystander = User::factory()->create();
        $bystander->assignRole('Manager');

        $message = Message::create([
            'sender_id' => $sender->id,
            'type' => 'personal',
            'subject' => 'Private message',
            'body' => 'Not for you.',
        ]);
        $message->recipients()->attach($recipient->id);

        $this->actingAs($bystander)
            ->get(route('messages.show', $message))
            ->assertForbidden();
    }

    public function test_messages_have_no_update_or_destroy_routes(): void
    {
        $this->assertFalse(Route::has('messages.update'));
        $this->assertFalse(Route::has('messages.destroy'));
    }
}
