<?php

namespace Tests\Feature;

use App\Models\CompanyProfile;
use App\Models\User;
use App\Settings\BrandingSettings;
use App\Settings\GeneralSettings;
use App\Settings\NotificationSettings;
use App\Settings\SmsSettings;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SettingsTest extends TestCase
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

    public function test_non_admin_cannot_view_or_update_settings(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)->get(route('company-settings.edit'))->assertForbidden();
        $this->actingAs($manager)
            ->patch(route('company-settings.update-general'), ['company_name' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_admin_can_view_settings(): void
    {
        $this->actingAs($this->superAdmin())
            ->get(route('company-settings.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('company-settings')
                ->has('general')
                ->has('branding')
                ->has('sms')
                ->has('notifications')
                ->where('sms.africastalking_api_key', '')
            );
    }

    public function test_admin_can_update_general_settings(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-general'), [
                'company_name' => 'Kampala Estates Ltd',
                'support_email' => 'help@kampalaestates.co.ug',
                'default_currency' => 'ugx',
                'timezone' => 'Africa/Kampala',
                'trash_retention_days' => 45,
            ])
            ->assertRedirect();

        $settings = app(GeneralSettings::class);
        $this->assertSame('Kampala Estates Ltd', $settings->company_name);
        $this->assertSame(45, $settings->trash_retention_days);
    }

    public function test_admin_can_update_branding_settings_with_a_logo(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-branding'), [
                'pdf_header_text' => 'Kampala Estates',
                'accent_color' => '#123ABC',
                'logo' => UploadedFile::fake()->image('logo.png'),
            ])
            ->assertRedirect();

        $settings = app(BrandingSettings::class);
        $this->assertSame('Kampala Estates', $settings->pdf_header_text);
        $this->assertSame('#123ABC', $settings->accent_color);
        $this->assertNotNull(CompanyProfile::current()->getFirstMedia('logo'));
    }

    public function test_admin_can_update_sms_settings_and_blank_key_keeps_existing(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-sms'), [
                'enabled' => true,
                'africastalking_username' => 'steward',
                'africastalking_api_key' => 'secret-key-1',
                'sender_id' => 'STEWARD',
                'sandbox' => true,
            ])
            ->assertRedirect();

        $this->assertSame('secret-key-1', app(SmsSettings::class)->africastalking_api_key);

        // Saving again with a blank key should keep the existing one.
        $this->actingAs($admin)
            ->patch(route('company-settings.update-sms'), [
                'enabled' => true,
                'africastalking_username' => 'steward',
                'africastalking_api_key' => '',
                'sender_id' => 'STEWARD',
                'sandbox' => false,
            ])
            ->assertRedirect();

        $settings = app(SmsSettings::class);
        $this->assertSame('secret-key-1', $settings->africastalking_api_key);
        $this->assertFalse($settings->sandbox);
    }

    public function test_admin_can_update_notification_settings(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-notifications'), [
                'email_enabled' => false,
                'sms_enabled' => true,
            ])
            ->assertRedirect();

        $settings = app(NotificationSettings::class);
        $this->assertFalse($settings->email_enabled);
        $this->assertTrue($settings->sms_enabled);
    }

    public function test_admin_can_send_a_test_sms(): void
    {
        Http::fake([
            '*/version1/messaging' => Http::response([
                'SMSMessageData' => [
                    'Recipients' => [
                        ['status' => 'Success'],
                    ],
                ],
            ]),
        ]);

        $admin = $this->superAdmin();
        $settings = app(SmsSettings::class);
        $settings->enabled = true;
        $settings->africastalking_username = 'steward';
        $settings->africastalking_api_key = 'secret-key';
        $settings->save();

        $this->actingAs($admin)
            ->post(route('company-settings.test-sms'), ['phone' => '+256700000000'])
            ->assertRedirect();

        Http::assertSent(fn ($request) => $request->url() === 'https://api.sandbox.africastalking.com/version1/messaging'
            || $request->url() === 'https://api.africastalking.com/version1/messaging');
    }

    public function test_test_sms_fails_gracefully_when_sms_is_disabled(): void
    {
        Http::fake();
        $admin = $this->superAdmin();

        // SmsSettings defaults to disabled — no request should go out, and
        // the controller should redirect back with a failure flash rather
        // than throwing.
        $this->actingAs($admin)
            ->post(route('company-settings.test-sms'), ['phone' => '+256700000000'])
            ->assertRedirect();

        Http::assertNothingSent();
    }
}
