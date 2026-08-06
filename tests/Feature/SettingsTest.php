<?php

namespace Tests\Feature;

use App\Models\CompanyProfile;
use App\Models\User;
use App\Settings\BrandingSettings;
use App\Settings\GeneralSettings;
use App\Settings\NotificationSettings;
use App\Settings\SmsSettings;
use App\Support\Branding;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Support\SessionKey;
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

        $this->actingAs($manager)->get(route('company-settings.edit', ['section' => 'general']))->assertForbidden();
        $this->actingAs($manager)
            ->patch(route('company-settings.update-general'), ['company_name' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_admin_can_view_settings(): void
    {
        $this->actingAs($this->superAdmin())
            ->get(route('company-settings.edit', ['section' => 'general']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('company-settings')
                ->where('section', 'general')
                ->has('general')
                ->has('branding')
                ->has('sms')
                ->has('notifications')
                ->where('sms.africastalking_api_key', '')
            );
    }

    public function test_each_settings_section_has_its_own_url(): void
    {
        $admin = $this->superAdmin();

        foreach (['general', 'branding', 'sms', 'notifications', 'trash'] as $section) {
            $this->actingAs($admin)
                ->get(route('company-settings.edit', ['section' => $section]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('company-settings')
                    ->where('section', $section)
                );
        }
    }

    public function test_visiting_bare_company_settings_redirects_to_general(): void
    {
        $this->actingAs($this->superAdmin())
            ->get('/company-settings')
            ->assertRedirect('/company-settings/general');
    }

    public function test_unknown_settings_section_is_not_found(): void
    {
        $this->actingAs($this->superAdmin())
            ->get('/company-settings/bogus')
            ->assertNotFound();
    }

    public function test_admin_can_update_general_settings(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-general'), [
                'company_name' => 'Kampala Estates Ltd',
                'support_email' => 'help@kampalaestates.co.ug',
                'address' => 'Plot 12, Kira Road, Kampala',
                'phone' => '+256700000000',
                'default_currency' => 'ugx',
                'timezone' => 'Africa/Kampala',
                'trash_retention_days' => 45,
            ])
            ->assertRedirect();

        $settings = app(GeneralSettings::class);
        $this->assertSame('Kampala Estates Ltd', $settings->company_name);
        $this->assertSame('Plot 12, Kira Road, Kampala', $settings->address);
        $this->assertSame('+256700000000', $settings->phone);
        $this->assertSame(45, $settings->trash_retention_days);
    }

    public function test_admin_can_update_branding_settings_with_a_logo(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-branding'), [
                'pdf_header_text' => 'Kampala Estates',
                'primary_color' => '#0A0A0A',
                'accent_color' => '#123ABC',
                'logo' => UploadedFile::fake()->image('logo.png'),
            ])
            ->assertRedirect();

        $settings = app(BrandingSettings::class);
        $this->assertSame('Kampala Estates', $settings->pdf_header_text);
        $this->assertSame('#0A0A0A', $settings->primary_color);
        $this->assertSame('#123ABC', $settings->accent_color);
        $this->assertNotNull(CompanyProfile::current()->getFirstMedia('logo'));
    }

    public function test_admin_can_update_branding_settings_with_an_app_icon(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-branding'), [
                'pdf_header_text' => 'Kampala Estates',
                'primary_color' => '#0A0A0A',
                'accent_color' => '#123ABC',
                'app_icon' => UploadedFile::fake()->image('icon.png', 512, 512),
            ])
            ->assertRedirect();

        $icon = CompanyProfile::current()->getFirstMedia('app_icon');
        $this->assertNotNull($icon);
        $this->assertNotNull($icon->getUrl('icon-192'));
        $this->assertNotNull($icon->getUrl('icon-512'));
        $this->assertNotNull($icon->getUrl('icon-maskable-192'));
        $this->assertNotNull($icon->getUrl('icon-maskable-512'));
    }

    public function test_manifest_reflects_company_name_and_uploaded_app_icon(): void
    {
        Storage::fake('public');
        $admin = $this->superAdmin();

        $this->actingAs($admin)->patch(route('company-settings.update-general'), [
            'company_name' => 'Kampala Estates Ltd',
            'support_email' => 'help@kampalaestates.co.ug',
            'address' => '',
            'phone' => '',
            'default_currency' => 'UGX',
            'timezone' => 'Africa/Kampala',
            'trash_retention_days' => 30,
        ])->assertRedirect();

        $this->actingAs($admin)->patch(route('company-settings.update-branding'), [
            'pdf_header_text' => 'Kampala Estates',
            'primary_color' => '#0A0A0A',
            'accent_color' => '#123ABC',
            'app_icon' => UploadedFile::fake()->image('icon.png', 512, 512),
        ])->assertRedirect();

        $response = $this->get('/manifest.webmanifest')->assertOk();
        $manifest = $response->json();

        $this->assertSame('Kampala Estates Ltd', $manifest['name']);
        $this->assertSame('#123ABC', $manifest['theme_color']);
        $this->assertStringContainsString('icon-192', $manifest['icons'][0]['src']);
    }

    public function test_manifest_falls_back_to_defaults_without_a_custom_icon(): void
    {
        $response = $this->get('/manifest.webmanifest')->assertOk();
        $manifest = $response->json();

        $this->assertSame('/pwa-icons/icon-192.png', $manifest['icons'][0]['src']);
    }

    public function test_theme_colors_are_injected_into_the_page(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)->patch(route('company-settings.update-branding'), [
            'pdf_header_text' => 'Kampala Estates',
            'primary_color' => '#0A2540',
            'accent_color' => '#123ABC',
        ])->assertRedirect();

        $html = $this->get('/dashboard')->assertOk()->getContent();

        $this->assertStringContainsString('--primary: #0A2540', $html);
        $this->assertStringContainsString('--accent-brand: #123ABC', $html);
    }

    public function test_a_primary_color_too_close_to_the_dark_background_is_lightened(): void
    {
        $admin = $this->superAdmin();

        // Near-black on a near-black dark background would be invisible —
        // the palette should lighten it for the .dark scope specifically.
        $this->actingAs($admin)->patch(route('company-settings.update-branding'), [
            'pdf_header_text' => 'Kampala Estates',
            'primary_color' => '#0a0a0a',
            'accent_color' => '#123ABC',
        ])->assertRedirect();

        $palette = Branding::palette();

        $this->assertSame('#0a0a0a', $palette['light']['primary']);
        $this->assertNotSame('#0a0a0a', $palette['dark']['primary']);
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

    public function test_sms_username_is_not_required_in_sandbox_mode(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-sms'), [
                'enabled' => true,
                'africastalking_username' => '',
                'africastalking_api_key' => 'sandbox-key',
                'sender_id' => '',
                'sandbox' => true,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('', app(SmsSettings::class)->africastalking_username);
    }

    public function test_sms_username_is_required_when_sandbox_is_off(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->patch(route('company-settings.update-sms'), [
                'enabled' => true,
                'africastalking_username' => '',
                'africastalking_api_key' => 'live-key',
                'sender_id' => '',
                'sandbox' => false,
            ])
            ->assertSessionHasErrors('africastalking_username');
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

    public function test_test_sms_always_uses_the_literal_sandbox_username_in_sandbox_mode(): void
    {
        // Africa's Talking requires the username "sandbox" for every sandbox
        // request — sending any other username (even a real one) is what
        // causes a 401. Regression test for that exact bug.
        Http::fake([
            '*/version1/messaging' => Http::response([
                'SMSMessageData' => ['Recipients' => [['status' => 'Success']]],
            ]),
        ]);

        $admin = $this->superAdmin();
        $settings = app(SmsSettings::class);
        $settings->enabled = true;
        $settings->sandbox = true;
        $settings->africastalking_username = 'my-real-account-username';
        $settings->africastalking_api_key = 'sandbox-key';
        $settings->save();

        $this->actingAs($admin)
            ->post(route('company-settings.test-sms'), ['phone' => '+256700000000'])
            ->assertRedirect();

        Http::assertSent(fn ($request) => $request['username'] === 'sandbox');
    }

    public function test_test_sms_surfaces_the_actual_africas_talking_error_on_failure(): void
    {
        Http::fake([
            '*/version1/messaging' => Http::response('Invalid credentials', 401),
        ]);

        $admin = $this->superAdmin();
        $settings = app(SmsSettings::class);
        $settings->enabled = true;
        $settings->sandbox = true;
        $settings->africastalking_api_key = 'wrong-key';
        $settings->save();

        $response = $this->actingAs($admin)
            ->post(route('company-settings.test-sms'), ['phone' => '+256700000000'])
            ->assertRedirect();

        $toast = $response->getSession()->get(SessionKey::FLASH_DATA)['toast'];

        $this->assertSame('error', $toast['type']);
        $this->assertStringContainsString('401', $toast['message']);
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
