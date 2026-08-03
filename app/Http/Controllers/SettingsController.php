<?php

namespace App\Http\Controllers;

use App\Http\Requests\Settings\TestSmsRequest;
use App\Http\Requests\Settings\UpdateBrandingSettingsRequest;
use App\Http\Requests\Settings\UpdateGeneralSettingsRequest;
use App\Http\Requests\Settings\UpdateNotificationSettingsRequest;
use App\Http\Requests\Settings\UpdateSmsSettingsRequest;
use App\Models\CompanyProfile;
use App\Services\AfricasTalkingSmsService;
use App\Settings\BrandingSettings;
use App\Settings\GeneralSettings;
use App\Settings\NotificationSettings;
use App\Settings\SmsSettings;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(
        GeneralSettings $general,
        BrandingSettings $branding,
        SmsSettings $sms,
        NotificationSettings $notifications,
    ): Response {
        $logo = CompanyProfile::current()->getFirstMedia('logo');

        return Inertia::render('company-settings', [
            'general' => $general->toArray(),
            'branding' => [
                ...$branding->toArray(),
                'logo' => $logo ? ['name' => $logo->file_name, 'url' => $logo->getUrl()] : null,
            ],
            'sms' => [
                ...$sms->toArray(),
                // Never send the decrypted key to the client — a blank
                // field on save means "keep the existing key".
                'africastalking_api_key' => '',
                'has_api_key' => $sms->africastalking_api_key !== '',
            ],
            'notifications' => $notifications->toArray(),
        ]);
    }

    public function updateGeneral(UpdateGeneralSettingsRequest $request, GeneralSettings $settings): RedirectResponse
    {
        $settings->fill($request->validated());
        $settings->save();

        activity()->useLog('settings')->causedBy($request->user())->log('Updated general settings.');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'General settings saved.']);

        return back();
    }

    public function updateBranding(UpdateBrandingSettingsRequest $request, BrandingSettings $settings): RedirectResponse
    {
        $settings->pdf_header_text = $request->validated('pdf_header_text');
        $settings->accent_color = $request->validated('accent_color');
        $settings->save();

        $profile = CompanyProfile::current();

        if ($request->hasFile('logo')) {
            $profile->addMediaFromRequest('logo')->toMediaCollection('logo');
        } elseif ($request->boolean('logo_remove')) {
            $profile->clearMediaCollection('logo');
        }

        activity()->useLog('settings')->causedBy($request->user())->log('Updated branding settings.');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Branding settings saved.']);

        return back();
    }

    public function updateSms(UpdateSmsSettingsRequest $request, SmsSettings $settings): RedirectResponse
    {
        $settings->enabled = $request->boolean('enabled');
        $settings->africastalking_username = $request->validated('africastalking_username') ?? '';
        $settings->sender_id = $request->validated('sender_id') ?? '';
        $settings->sandbox = $request->boolean('sandbox');

        if (filled($request->validated('africastalking_api_key'))) {
            $settings->africastalking_api_key = $request->validated('africastalking_api_key');
        }

        $settings->save();

        activity()->useLog('settings')->causedBy($request->user())->log('Updated SMS settings.');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'SMS settings saved.']);

        return back();
    }

    public function updateNotifications(UpdateNotificationSettingsRequest $request, NotificationSettings $settings): RedirectResponse
    {
        $settings->fill($request->validated());
        $settings->save();

        activity()->useLog('settings')->causedBy($request->user())->log('Updated notification settings.');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Notification settings saved.']);

        return back();
    }

    public function testSms(TestSmsRequest $request, AfricasTalkingSmsService $sms): RedirectResponse
    {
        $result = $sms->send(
            $request->validated('phone'),
            'This is a test message from Steward.',
        );

        activity()
            ->useLog('sms')
            ->causedBy($request->user())
            ->withProperties(['phone' => $request->validated('phone'), 'success' => $result['success']])
            ->log('Sent a test SMS.');

        Inertia::flash('toast', [
            'type' => $result['success'] ? 'success' : 'error',
            'message' => $result['message'],
        ]);

        return back();
    }
}
